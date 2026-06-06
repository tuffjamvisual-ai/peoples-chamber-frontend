import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Incremental sync (2026-06-01 refactor): the previous version was a
// DELETE-ALL + re-INSERT-ALL rebuild that timed out on the 300s function
// cap, leaving hospitality data stuck at 15 May. This version processes
// publications one-at-a-time, tagged with source_publication_slug, and
// skips any already in synced_publications. Each cron run progressively
// catches up until everything is sync'd, after which subsequent runs are
// near-instant (just the seen-map check). A 240s wall-clock budget bails
// early and leaves the rest for the next invocation.
//
// Mirrors scripts/sync-ministers-hospitality.js (now retired). Same
// structure as sync-ministers-meetings but targets hospitality CSVs.

const DELAY_MS = 100;
const TIME_BUDGET_MS = 240_000; // bail with ~60s headroom under the 300s cap
// Expanded 2026-06-06 from the cabinet-office-only pilot. Same canonical
// slug list as sync-ministers-meetings (DWP = '...work-pensions', MHCLG
// = '...housing-communities-local-government', no 'and's).
const DEPT_SLUGS = [
  'cabinet-office',
  'prime-ministers-office-10-downing-street',
  'deputy-prime-ministers-office',
  'attorney-generals-office',
  'department-for-business-and-trade',
  'department-for-culture-media-and-sport',
  'department-for-education',
  'department-for-energy-security-and-net-zero',
  'department-for-environment-food-rural-affairs',
  'department-for-science-innovation-and-technology',
  'department-for-transport',
  'department-for-work-pensions',
  'department-of-health-and-social-care',
  'foreign-commonwealth-development-office',
  'hm-treasury',
  'home-office',
  'ministry-of-defence',
  'ministry-of-housing-communities-local-government',
  'ministry-of-justice',
];
const CUTOFF_ISO = '2024-07-04';
const SEARCH = 'https://www.gov.uk/api/search.json';
const CONTENT = 'https://www.gov.uk/api/content';
const CRON_NAME = 'ministers-hospitality';

const HEADER_MAP: Record<string, string[]> = {
  minister_name: ['minister', 'minister name', 'name of minister'],
  hospitality_date: ['date', 'date of hospitality', 'date received', 'month'],
  donor: [
    'individual or organisation that offered hospitality',
    'name of individual or organisation',
    'name of organisation',
    'donor',
    'provider',
    'name of provider',
    'organisation providing hospitality',
    'who paid',
    'host',
  ],
  description: [
    'type of hospitality received',
    'type of hospitality',
    'hospitality received',
    'hospitality',
    'description',
    'reason',
    'type',
  ],
  value: [
    'value',
    'estimated value',
    'value of hospitality',
    'estimated value of hospitality',
    'amount',
    'cost',
  ],
};
const DESCRIPTION_HEADERS = new Set([
  'type of hospitality received',
  'type of hospitality',
  'hospitality received',
  'hospitality',
  'description',
  'type',
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const normaliseHeader = (h: string) =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[£$€¥()\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

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
  if (/^nil return$/i.test(s)) return null;
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

function parseValue(raw: unknown): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || /^nil return$/i.test(s) || /^n\/?a$/i.test(s)) return null;
  const matches = s.match(/[\d.,]+/g);
  if (!matches) return null;
  const last = matches[matches.length - 1].replace(/,/g, '');
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
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
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  for (let i = 0; i < months.length; i++) {
    const re = new RegExp(`(?:^|-)${months[i]}-(\\d{4})`);
    const m = slug.match(re);
    if (m) return `Q${Math.floor(i / 3) + 1} ${m[1]}`;
  }
  return null;
}

function deptFromCsvTitle(title: string): string | null {
  let s = String(title || '').trim().replace(/[''’]/g, "'");
  const m = s.match(/^(.*?)[\s:]+(?:ministerial|ministers'?)\s+hospitality\b/i);
  if (m) s = m[1];
  s = s.replace(/[:\-,]+$/, '').trim();
  s = s.replace(/[''’]$/u, '').trim();
  return s || null;
}

type Row = {
  minister_name: string;
  minister_dept: string | null;
  hospitality_date: string;
  donor: string;
  description: string | null;
  value: number | null;
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
      `&q=${encodeURIComponent('ministers gifts hospitality')}` +
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
  return all.filter((r) => String(r.title || '').toLowerCase().includes('hospitality'));
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
  if (idx.minister_name === undefined || idx.hospitality_date === undefined) return [];

  const minister_dept = deptFromCsvTitle(att.title || '');
  const quarter = quarterFromSlug(publicationSlug);
  const usedIndices = new Set<number>();
  for (const k of ['minister_name', 'hospitality_date', 'donor', 'value']) {
    if (idx[k] !== undefined) usedIndices.add(idx[k]);
  }

  const rows: Row[] = [];
  for (const rec of records) {
    const vals = Object.values(rec);
    const minister_name = vals[idx.minister_name];
    const date = isoDate(vals[idx.hospitality_date]);
    if (!minister_name || !date) continue;
    if (date < CUTOFF_ISO) continue;

    const donorRaw = idx.donor !== undefined ? vals[idx.donor] : null;
    const donor =
      donorRaw && !/^nil return$/i.test(String(donorRaw).trim())
        ? String(donorRaw).trim()
        : null;
    if (!donor) continue;

    const value = idx.value !== undefined ? parseValue(vals[idx.value]) : null;

    const descParts: string[] = [];
    for (let i = 0; i < headers.length; i++) {
      if (usedIndices.has(i)) continue;
      const headerNorm = normaliseHeader(headers[i]);
      const v = String(vals[i] || '').trim();
      if (!v) continue;
      if (/^nil return$/i.test(v)) continue;
      if (DESCRIPTION_HEADERS.has(headerNorm)) descParts.push(v);
      else descParts.push(`${String(headers[i]).trim()}: ${v}`);
    }

    rows.push({
      minister_name: String(minister_name).trim(),
      minister_dept,
      hospitality_date: date,
      donor,
      description: descParts.length > 0 ? descParts.join(' | ') : null,
      value,
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
    // Load the seen-map for this cron so we can skip publications we've
    // already processed (unless their public_timestamp has changed since,
    // which means gov.uk edited the publication and we should re-ingest).
    //
    // IMPORTANT: stored TIMESTAMPTZ comes back from supabase-js as
    // "2026-05-28 15:00:03+00" (Postgres format) but gov.uk's API returns
    // ISO 8601 "2026-05-28T15:00:03+00:00". Naive string === always fails
    // and the whole table re-processes every run. Convert both to epoch
    // ms and compare numerically.
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
      // Sort newest-first so each run delivers the most recent data first
      // even if it bails before completing the historical tail.
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
        // Skip if we've seen this slug at this public_timestamp (gov.uk
        // hasn't republished). Re-ingest if it's new or the timestamp
        // moved (republication). Both sides normalised to epoch ms above
        // so the format difference between supabase-js and the gov.uk
        // API can't cause spurious re-processing.
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
            /hospitality/i.test(a.title || '') &&
            !/meetings|gifts|travel|expenses/i.test(a.title || ''),
        );

        const rowsForPub: Row[] = [];
        for (const att of csvs) {
          const rows = await parseCsv(att, slug);
          rowsForPub.push(...rows);
          await sleep(DELAY_MS);
        }

        // Idempotent re-ingest: clear any prior rows tagged with this slug
        // before inserting fresh ones. Old pre-incremental-era rows with
        // NULL source_publication_slug are left in place (historical data).
        await supabase.from('ministers_hospitality').delete().eq('source_publication_slug', slug);

        if (rowsForPub.length > 0) {
          const tagged = rowsForPub.map((r) => ({ ...r, source_publication_slug: slug }));
          for (let i = 0; i < tagged.length; i += 100) {
            const batch = tagged.slice(i, i + 100);
            const { error } = await supabase.from('ministers_hospitality').insert(batch);
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
