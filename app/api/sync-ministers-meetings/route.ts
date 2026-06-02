import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Incremental sync (2026-06-02 refactor): expanded from cabinet-office-only
// to all UK government departments, and switched from a DELETE-ALL +
// re-INSERT-ALL rebuild to a per-publication idempotent ingest tagged with
// source_publication_slug. Same pattern as sync-ministers-hospitality.
// Each cron run skips publications already in synced_publications unless
// gov.uk republished, and bails at 240s leaving the rest for the next
// invocation. Cutoff stays at 4 July 2024 (Labour election) — only current
// government meetings are wanted; older data is excluded by query.

const DELAY_MS = 100;
const TIME_BUDGET_MS = 240_000;
const CRON_NAME = 'ministers-meetings';
const CUTOFF_ISO = '2024-07-04';
const SEARCH = 'https://www.gov.uk/api/search.json';
const CONTENT = 'https://www.gov.uk/api/content';

// All UK central government departments that publish ministers' meetings
// disclosures quarterly under the gov.uk transparency format. Slugs are
// the gov.uk org slugs (different from our internal /departments/<slug>).
const DEPT_SLUGS = [
  'cabinet-office',
  'prime-ministers-office-10-downing-street',
  'hm-treasury',
  'home-office',
  'foreign-commonwealth-development-office',
  'ministry-of-defence',
  'ministry-of-justice',
  'department-of-health-and-social-care',
  'department-for-education',
  'department-for-work-and-pensions',
  'department-for-transport',
  'department-for-environment-food-rural-affairs',
  'department-for-business-and-trade',
  'department-for-energy-security-and-net-zero',
  'department-for-science-innovation-and-technology',
  'department-for-culture-media-and-sport',
  'ministry-of-housing-communities-and-local-government',
  'attorney-generals-office',
  'office-of-the-advocate-general-for-scotland',
  'scotland-office',
  'wales-office',
  'northern-ireland-office',
  'office-of-the-leader-of-the-house-of-commons',
  'office-of-the-leader-of-the-house-of-lords',
  'uk-export-finance',
  'hm-revenue-customs',
];

const HEADER_MAP: Record<string, string[]> = {
  minister_name: ['minister', 'minister name', 'name of minister'],
  meeting_date: ['date', 'date of meeting', 'meeting date', 'month'],
  organisation: [
    'name of individual or organisation',
    'name of organisation or individual',
    'organisation',
    'name of organisation',
    'organisation met',
    'individual or organisation',
    'name of external organisation',
  ],
};
const PURPOSE_HEADERS = new Set(['purpose', 'purpose of meeting', 'reason']);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const normaliseHeader = (h: string) =>
  String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');

function buildHeaderIndex(headers: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  const norm = headers.map(normaliseHeader);
  for (const [target, candidates] of Object.entries(HEADER_MAP)) {
    for (const cand of candidates) {
      const i = norm.indexOf(cand);
      if (i !== -1) {
        idx[target] = i;
        break;
      }
    }
  }
  return idx;
}

function isoDate(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

function quarterFromSlug(slug: string): string | null {
  const Q: Record<string, string> = {
    'january-to-march': 'Q1',
    'april-to-june': 'Q2',
    'july-to-september': 'Q3',
    'october-to-december': 'Q4',
  };
  for (const [phrase, q] of Object.entries(Q)) {
    const re = new RegExp(`${phrase}-(\\d{4})`);
    const m = slug.match(re);
    if (m) return `${q} ${m[1]}`;
  }
  return null;
}

function deptFromCsvTitle(title: string): string | null {
  let s = String(title || '').split(/ meetings,/i)[0].trim();
  s = s.replace(/\s+(ministers'|ministers|ministerial)$/i, '').trim();
  s = s.replace(/[''’]$/u, '').trim();
  return s || null;
}

type Row = {
  minister_name: string;
  minister_dept: string | null;
  meeting_date: string;
  organisation: string | null;
  purpose: string | null;
  quarter: string | null;
};

type Publication = { title: string; link: string; public_timestamp?: string };
type Attachment = { url: string; title?: string; content_type?: string };

async function findPublications(deptSlug: string): Promise<Publication[]> {
  const all: Publication[] = [];
  let start = 0;
  const PAGE = 100;
  while (start < 1000) {
    const url =
      `${SEARCH}?filter_format=transparency&filter_organisations=${deptSlug}` +
      `&q=${encodeURIComponent('ministers meetings hospitality')}` +
      `&filter_public_timestamp=${encodeURIComponent('from:' + CUTOFF_ISO)}` +
      `&order=-public_timestamp&count=${PAGE}&start=${start}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = (await res.json()) as { results?: Publication[]; total?: number };
    const results = data.results || [];
    if (results.length === 0) break;
    all.push(...results);
    start += results.length;
    if (start >= (data.total || 0)) break;
    await sleep(DELAY_MS);
  }
  return all.filter((r) => {
    const t = String(r.title || '').toLowerCase();
    return t.includes('ministerial') && t.includes('meetings');
  });
}

async function fetchAttachments(link: string): Promise<Attachment[]> {
  const res = await fetch(`${CONTENT}${link}`);
  if (!res.ok) throw new Error(`Content API ${res.status} for ${link}`);
  const data = (await res.json()) as { details?: { attachments?: Attachment[] } };
  return data?.details?.attachments || [];
}

async function parseCsv(att: Attachment, publicationSlug: string): Promise<Row[]> {
  const res = await fetch(att.url);
  if (!res.ok) return [];
  const text = await res.text();
  let records: Record<string, string>[];
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch {
    return [];
  }
  if (records.length === 0) return [];

  const headers = Object.keys(records[0]);
  const idx = buildHeaderIndex(headers);
  if (idx.minister_name === undefined || idx.meeting_date === undefined) return [];

  const minister_dept = deptFromCsvTitle(att.title || '');
  const quarter = quarterFromSlug(publicationSlug);
  const usedIndices = new Set<number>();
  for (const k of ['minister_name', 'meeting_date', 'organisation']) {
    if (idx[k] !== undefined) usedIndices.add(idx[k]);
  }

  const rows: Row[] = [];
  for (const rec of records) {
    const vals = Object.values(rec);
    const minister_name = vals[idx.minister_name];
    const date = isoDate(vals[idx.meeting_date]);
    const organisation = idx.organisation !== undefined ? vals[idx.organisation] : null;
    if (!minister_name || !date) continue;
    if (date < CUTOFF_ISO) continue;

    const purposeParts: string[] = [];
    for (let i = 0; i < headers.length; i++) {
      if (usedIndices.has(i)) continue;
      const headerNorm = normaliseHeader(headers[i]);
      const value = String(vals[i] || '').trim();
      if (!value) continue;
      if (PURPOSE_HEADERS.has(headerNorm)) purposeParts.push(value);
      else purposeParts.push(`${String(headers[i]).trim()}: ${value}`);
    }
    rows.push({
      minister_name: String(minister_name).trim(),
      minister_dept,
      meeting_date: date,
      organisation: organisation ? String(organisation).trim() : null,
      purpose: purposeParts.length > 0 ? purposeParts.join(' | ') : null,
      quarter,
    });
  }
  return rows;
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  const startedAt = Date.now();
  const budgetExhausted = () => Date.now() - startedAt > TIME_BUDGET_MS;

  try {
    // Seen-map for this cron — publications already ingested, keyed by
    // (cron_name, publication_slug). Compare via Date.parse → epoch ms
    // because Postgres TIMESTAMPTZ via supabase-js is " 2026-05-28 15:00:03+00 "
    // and gov.uk returns ISO 8601 "2026-05-28T15:00:03+00:00" — naive
    // string === fails and re-processes everything every run.
    const { data: syncedRows } = await supabase
      .from('synced_publications')
      .select('publication_slug, public_timestamp')
      .eq('cron_name', CRON_NAME);
    const toEpoch = (s: string | null | undefined): number | null => {
      if (!s) return null;
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    };
    const seen = new Map<string, number | null>(
      (syncedRows || []).map((r) => [r.publication_slug as string, toEpoch(r.public_timestamp as string | null)]),
    );

    const perDept: Record<string, { processed: number; skipped: number; rows_added: number }> = {};
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalRowsAdded = 0;
    let moreToProcess = false;

    for (const dept of DEPT_SLUGS) {
      if (budgetExhausted()) {
        moreToProcess = true;
        break;
      }
      const pubs = await findPublications(dept);
      pubs.sort((a, b) => String(b.public_timestamp || '').localeCompare(String(a.public_timestamp || '')));
      const counters = { processed: 0, skipped: 0, rows_added: 0 };

      for (const pub of pubs) {
        if (budgetExhausted()) {
          moreToProcess = true;
          break;
        }
        const slug = pub.link.replace(/^.*\/publications\//, '');
        const prevEpoch = seen.get(slug);
        const curEpoch = toEpoch(pub.public_timestamp || null);
        if (seen.has(slug) && prevEpoch !== null && prevEpoch === curEpoch) {
          counters.skipped++;
          continue;
        }

        let atts: Attachment[];
        try {
          atts = await fetchAttachments(pub.link);
        } catch {
          continue;
        }
        const csvs = atts.filter(
          (a) =>
            a.content_type === 'text/csv' &&
            /meetings/i.test(a.title || '') &&
            !/hospitality|gifts|travel|expenses/i.test(a.title || ''),
        );

        const rowsForPub: Row[] = [];
        for (const att of csvs) {
          const rows = await parseCsv(att, slug);
          rowsForPub.push(...rows);
          await sleep(DELAY_MS);
        }

        // Idempotent: wipe any prior rows tagged with this slug, insert fresh.
        await supabase.from('ministers_meetings').delete().eq('source_publication_slug', slug);

        if (rowsForPub.length > 0) {
          const tagged = rowsForPub.map((r) => ({ ...r, source_publication_slug: slug }));
          for (let i = 0; i < tagged.length; i += 100) {
            const batch = tagged.slice(i, i + 100);
            const { error } = await supabase.from('ministers_meetings').insert(batch);
            if (error) break;
          }
        }

        await supabase.from('synced_publications').upsert(
          {
            publication_slug: slug,
            cron_name: CRON_NAME,
            dept_slug: dept,
            public_timestamp: pub.public_timestamp || null,
            row_count: rowsForPub.length,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'cron_name,publication_slug' },
        );

        counters.processed++;
        counters.rows_added += rowsForPub.length;
        totalProcessed++;
        totalRowsAdded += rowsForPub.length;
      }

      perDept[dept] = counters;
      totalSkipped += counters.skipped;
    }

    return NextResponse.json({
      ok: true,
      processed_publications: totalProcessed,
      skipped_publications: totalSkipped,
      rows_added: totalRowsAdded,
      more_to_process: moreToProcess,
      elapsed_ms: Date.now() - startedAt,
      perDept,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, elapsed_ms: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
