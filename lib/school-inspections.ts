// Shared logic for Ofsted "State-funded schools inspections and outcomes as
// at <date>": used by scripts/import-school-inspections.ts and
// app/api/sync-school-inspections/route.ts (weekly: loads each new
// twice-yearly snapshot). Table: scripts/migrations/2026-10-11k-school-inspections.sql.

import type { SupabaseClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';

const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const CONTENT_API = 'https://www.gov.uk/api/content/government/statistics/';

// Ofsted's local authority names that don't match the councils table by name.
const LA_OVERRIDES: Record<string, string> = {
  'City of London': 'E09000001',
  'Kingston upon Hull': 'E06000010',
  'Newcastle upon Tyne': 'E08000021',
};

export type Snapshot = { date: string; label: string; pageUrl: string; csvUrl: string };

const MONTHS: Record<string, string> = { march: '03', august: '08' };

// Newest published snapshot. Release pages follow a fixed address pattern:
// .../state-funded-schools-inspections-and-outcomes-as-at-31-{march|august}-{year}
export async function findLatestSnapshot(now = new Date()): Promise<Snapshot | null> {
  const y = now.getUTCFullYear();
  const candidates: { date: string; slug: string; label: string }[] = [];
  for (const year of [y, y - 1]) {
    for (const month of ['august', 'march']) {
      candidates.push({
        date: `${year}-${MONTHS[month]}-31`,
        slug: `state-funded-schools-inspections-and-outcomes-as-at-31-${month}-${year}`,
        label: `31 ${month[0].toUpperCase()}${month.slice(1)} ${year}`,
      });
    }
  }
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  for (const c of candidates) {
    if (c.date > now.toISOString().slice(0, 10)) continue;
    const res = await politeFetch(CONTENT_API + c.slug, { headers: UA });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`GOV.UK Content API HTTP ${res.status} for ${c.slug}`);
    const json = await res.json();
    const atts = (json?.details?.attachments ?? []) as { title?: string; url?: string }[];
    const csv = atts.find((a) => /^State-funded schools inspections and outcomes as at /i.test(String(a.title ?? '').trim()) && /\.csv$/i.test(String(a.url ?? '')));
    if (!csv?.url) throw new Error(`${c.slug}: snapshot CSV attachment not found`);
    return { date: c.date, label: c.label, pageUrl: `https://www.gov.uk/government/statistics/${c.slug}`, csvUrl: csv.url };
  }
  return null;
}

// The file is Windows-1252; decode as UTF-8 only if it is valid UTF-8.
export async function downloadCsvText(url: string): Promise<string> {
  const res = await politeFetch(url, { headers: UA }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`Ofsted CSV HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buf).replace(/^﻿/, '');
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

export type SchoolRow = Record<string, string | number | boolean | null> & { urn: string; la_gss_code: string };

// Table column -> CSV heading (headings compared with whitespace collapsed).
const COLS: [string, string, 'text' | 'int' | 'date' | 'bool'][] = [
  ['urn', 'URN', 'text'],
  ['la_name', 'Local authority', 'text'],
  ['school_name', 'School name', 'text'],
  ['phase', 'Ofsted phase', 'text'],
  ['school_type', 'Type of education', 'text'],
  ['admissions_policy', 'Admissions policy', 'text'],
  ['sixth_form', 'Sixth form', 'text'],
  ['religious_character', 'Designated religious character', 'text'],
  ['mat_name', 'Multi-academy trust name', 'text'],
  ['constituency', 'Parliamentary constituency', 'text'],
  ['postcode', 'Postcode', 'text'],
  ['pupils', 'Total number of pupils', 'int'],
  ['idaci_quintile', 'The income deprivation affecting children index (IDACI) quintile', 'int'],
  ['lowest_age', 'Statutory lowest age', 'int'],
  ['highest_age', 'Statutory highest age', 'int'],
  ['web_link', 'Web Link', 'text'],
  ['rc_inspection_date', 'Inspection start date', 'date'],
  ['rc_publication_date', 'Publication date', 'date'],
  ['rc_inspection_type', 'Inspection type grouping', 'text'],
  ['rc_relates_to_current', 'Does the latest full inspection relate to the URN of the current school?', 'bool'],
  ['rc_category', 'Category of concern', 'text'],
  ['rc_safeguarding', 'Safeguarding standards', 'text'],
  ['rc_inclusion', 'Inclusion', 'text'],
  ['rc_curriculum_teaching', 'Curriculum and teaching', 'text'],
  ['rc_achievement', 'Achievement', 'text'],
  ['rc_attendance_behaviour', 'Attendance and behaviour', 'text'],
  ['rc_personal_development', 'Personal development and wellbeing', 'text'],
  ['rc_early_years', 'Early years (where applicable)', 'text'],
  ['rc_post16', 'Post-16 provision (where applicable)', 'text'],
  ['rc_leadership', 'Leadership and governance', 'text'],
  ['oeif_inspection_date', 'Inspection start date of latest OEIF graded inspection', 'date'],
  ['oeif_publication_date', 'Publication date of latest OEIF graded inspection', 'date'],
  ['oeif_relates_to_current', 'Does the latest OEIF graded inspection relate to the URN of the current school?', 'bool'],
  ['oeif_category', 'Latest OEIF category of concern', 'text'],
  ['oeif_overall', 'Latest OEIF overall effectiveness', 'text'],
  ['oeif_quality', 'Latest OEIF quality of education', 'text'],
  ['oeif_behaviour', 'Latest OEIF behaviour and attitudes', 'text'],
  ['oeif_personal_development', 'Latest OEIF personal development', 'text'],
  ['oeif_leadership', 'Latest OEIF effectiveness of leadership and management', 'text'],
  ['oeif_safeguarding', 'Latest OEIF safeguarding is effective?', 'text'],
  ['oeif_early_years', 'Latest OEIF early years provision (where applicable)', 'text'],
  ['oeif_sixth_form', 'Latest OEIF sixth form provision (where applicable)', 'text'],
  ['ungraded_date', 'Date of latest ungraded inspection', 'date'],
  ['ungraded_publication_date', 'Ungraded inspection publication date', 'date'],
  ['ungraded_relates_to_current', 'Does the ungraded inspection relate to the URN of the current school?', 'bool'],
  ['ungraded_outcome', 'Ungraded inspection overall outcome', 'text'],
  ['most_recent_category', 'Most recent category of concern', 'text'],
];

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const nullish = (s: string) => { const t = collapse(s); return t === '' || t.toUpperCase() === 'NULL' ? null : t; };

function convert(v: string, kind: 'text' | 'int' | 'date' | 'bool'): string | number | boolean | null {
  const t = nullish(v ?? '');
  if (t == null) return null;
  if (kind === 'text') return t;
  if (kind === 'int') return /^-?\d+$/.test(t) ? Number(t) : null;
  if (kind === 'bool') return t === 'Yes' ? true : t === 'No' ? false : null;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const normName = (s: string) => s.toLowerCase()
  .replace(/&/g, 'and').replace(/,? city of$|,? county of$/g, '')
  .replace(/\b(city|borough|district|county|metropolitan|royal|london|council|of|the)\b/g, '')
  .replace(/[^a-z]/g, '');

export type Council = { gss_code: string; name: string; short_name: string | null; type: string };

export type ParseResult = { rows: SchoolRow[]; unmatchedLAs: string[]; ambiguousLAs: string[]; laCount: number };

export function parseSnapshot(text: string, snapshot: Snapshot, councils: Council[]): ParseResult {
  const all = parseCsv(text).filter((r) => r.length > 1);
  const header = all[0].map(collapse);
  const idx = new Map(header.map((h, i) => [h, i]));
  const missing = COLS.filter(([, h]) => !idx.has(h)).map(([, h]) => h);
  if (missing.length) throw new Error(`Ofsted CSV is missing columns: ${missing.join(' | ')}`);
  const bad = all.slice(1).filter((r) => r.length !== header.length).length;
  if (bad) throw new Error(`${bad} rows have a different number of columns from the heading row`);

  // Education authorities: English councils that aren't districts.
  const eduCouncils = councils.filter((c) => c.gss_code.startsWith('E') && c.type !== 'district');
  const byNorm = new Map<string, Council[]>();
  for (const c of eduCouncils) {
    for (const n of [c.name, c.short_name].filter(Boolean) as string[]) {
      const k = normName(n);
      const list = byNorm.get(k) ?? [];
      if (!list.includes(c)) list.push(c);
      byNorm.set(k, list);
    }
  }
  const laCache = new Map<string, string | null>();
  const unmatched = new Set<string>();
  const ambiguous = new Set<string>();
  const resolveLA = (la: string): string | null => {
    if (laCache.has(la)) return laCache.get(la)!;
    let code: string | null = LA_OVERRIDES[la] ?? null;
    if (!code) {
      const hits = byNorm.get(normName(la)) ?? [];
      if (hits.length === 1) code = hits[0].gss_code;
      else if (hits.length > 1) ambiguous.add(la);
      else unmatched.add(la);
    }
    laCache.set(la, code);
    return code;
  };

  const rows: SchoolRow[] = [];
  for (const r of all.slice(1)) {
    const row: Record<string, string | number | boolean | null> = {};
    for (const [col, h, kind] of COLS) row[col] = convert(r[idx.get(h)!], kind);
    if (!row.urn || !row.school_name || !row.la_name) continue;
    const la = resolveLA(String(row.la_name));
    if (!la) continue;
    rows.push({ ...row, urn: String(row.urn), la_gss_code: la, snapshot_date: snapshot.date, source_url: snapshot.csvUrl });
  }
  return { rows, unmatchedLAs: [...unmatched].sort(), ambiguousLAs: [...ambiguous].sort(), laCount: laCache.size };
}

// Upsert the snapshot, then remove schools not in it (closed since the last snapshot).
export async function writeSnapshot(db: SupabaseClient, rows: SchoolRow[], snapshotDate: string): Promise<{ written: number; removed: number }> {
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from('school_inspections').upsert(rows.slice(i, i + 1000).map((r) => ({ ...r, synced_at: now })), { onConflict: 'urn' });
    if (error) throw new Error(`school_inspections upsert at ${i}: ${error.message}`);
  }
  const { count, error } = await db.from('school_inspections').delete({ count: 'exact' }).neq('snapshot_date', snapshotDate);
  if (error) throw new Error(`school_inspections prune: ${error.message}`);
  return { written: rows.length, removed: count ?? 0 };
}

export async function storedSnapshotDate(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.from('school_inspections').select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1);
  if (error) throw new Error(`school_inspections read: ${error.message}`);
  return (data?.[0]?.snapshot_date as string | undefined) ?? null;
}

export async function loadCouncils(db: SupabaseClient): Promise<Council[]> {
  const { data, error } = await db.from('councils').select('gss_code, name, short_name, type');
  if (error) throw new Error(`councils read: ${error.message}`);
  return ((data ?? []) as Council[]).filter((c) => c.gss_code);
}
