import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Mirrors scripts/sync-ministers-meetings.js (now retired). Cabinet Office
// was the original pilot; the slug list was expanded 2026-06-06 to cover
// every UK ministerial department whose transparency publications carry
// ministerial-meetings data.
//
// Slug correctness (verified against gov.uk/api/organisations on the same
// date): DWP is 'department-for-work-pensions' (no 'and'); MHCLG is
// 'ministry-of-housing-communities-local-government' (no 'and'). The
// route uses these literal strings as filter_organisations parameter.

const DELAY_MS = 250;
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

  try {
    const allRows: Row[] = [];
    const perDept: Record<string, number> = {};
    for (const dept of DEPT_SLUGS) {
      const pubs = await findPublications(dept);
      let deptCount = 0;
      for (const pub of pubs) {
        const slug = pub.link.replace(/^.*\/publications\//, '');
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
        for (const att of csvs) {
          const rows = await parseCsv(att, slug);
          allRows.push(...rows);
          deptCount += rows.length;
          await sleep(DELAY_MS);
        }
      }
      perDept[dept] = deptCount;
    }

    if (allRows.length === 0) {
      return NextResponse.json({ ok: true, parsed: 0, inserted: 0, note: 'no rows collected, table untouched', perDept });
    }

    // Re-runs need a wipe — there's no natural unique key on the table.
    await supabase.from('ministers_meetings').delete().not('minister_name', 'is', null);

    let inserted = 0;
    for (let i = 0; i < allRows.length; i += 100) {
      const batch = allRows.slice(i, i + 100);
      const { error } = await supabase.from('ministers_meetings').insert(batch);
      if (error) break;
      inserted += batch.length;
      await sleep(DELAY_MS);
    }

    return NextResponse.json({
      ok: true,
      parsed: allRows.length,
      inserted,
      perDept,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
