// Shared logic for DfT table RAS0403 (reported road casualties by local
// authority): used by scripts/import-council-road-casualties.ts and
// app/api/sync-road-casualties/route.ts (weekly: loads each new annual
// edition). Tables: scripts/migrations/2026-10-11m-council-road-casualties.sql.

import * as XLSX from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';

const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const PAGE_API = 'https://www.gov.uk/api/content/government/statistical-data-sets/road-safety-statistics-data-tables';
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };

const MEASURES: Record<string, string> = {
  'killed': 'killed',
  'ksi (unadjusted)': 'ksi_unadjusted',
  'ksi (adjusted)': 'ksi_adjusted',
  'all casualties': 'all',
};
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = clean(v).replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};

export type Edition = { url: string; firstPublished: string; label: string; wb: XLSX.WorkBook };

// "30 July 2026" -> "2026-07-30"
function parseDate(s: string): string | null {
  const m = clean(s).toLowerCase().match(/^(\d{1,2}) ([a-z]+) (\d{4})$/);
  if (!m || !MONTHS.includes(m[2])) return null;
  return `${m[3]}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// Every RAS0403 attachment on the road safety tables page, newest edition first
// (by the "Date this data was first published" on its Table_of_contents sheet).
export async function findLatestEdition(): Promise<Edition> {
  const res = await politeFetch(PAGE_API, { headers: UA });
  if (!res.ok) throw new Error(`GOV.UK Content API HTTP ${res.status}`);
  const json = await res.json();
  const urls = ((json?.details?.attachments ?? []) as { url?: string }[]).map((a) => String(a.url ?? '')).filter((u) => /\/ras0403[^/]*\.(ods|xlsx)$/i.test(u));
  if (urls.length === 0) throw new Error('No RAS0403 attachment on the road safety tables page');
  const editions: Edition[] = [];
  for (const url of urls) {
    const r = await politeFetch(url, { headers: UA }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
    if (!r.ok) throw new Error(`RAS0403 download HTTP ${r.status}: ${url}`);
    const wb = XLSX.read(Buffer.from(await r.arrayBuffer()), { type: 'buffer' });
    const toc = wb.Sheets['Table_of_contents'];
    if (!toc) continue;
    const rows = XLSX.utils.sheet_to_json(toc, { header: 1, defval: '', raw: false }) as unknown[][];
    const hi = rows.findIndex((row) => row.some((v) => /date this data was first published/i.test(clean(v))));
    if (hi < 0) continue;
    const col = rows[hi].findIndex((v) => /date this data was first published/i.test(clean(v)));
    const dates = rows.slice(hi + 1).map((row) => parseDate(clean(row[col]))).filter(Boolean) as string[];
    if (dates.length === 0) continue;
    const first = dates.sort().reverse()[0];
    const d = new Date(`${first}T00:00:00Z`);
    editions.push({ url, firstPublished: first, label: `RAS0403, first published ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()][0].toUpperCase()}${MONTHS[d.getUTCMonth()].slice(1)} ${d.getUTCFullYear()}`, wb });
  }
  if (editions.length === 0) throw new Error('No RAS0403 edition with a readable publication date');
  editions.sort((a, b) => b.firstPublished.localeCompare(a.firstPublished));
  return editions[0];
}

export type CasualtyRow = { council_gss_code: string; year: number; measure: string; casualties: number | null; rate_per_bn_miles: number | null; release_label: string; source_url: string };
export type UserRow = { council_gss_code: string; year: number; road_user: string; measure: string; casualties: number | null };

export type ParseResult = { casualties: CasualtyRow[]; users: UserRow[]; years: number[]; unmatched: string[]; checks: string[] };

function sheet(wb: XLSX.WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`sheet "${name}" not found (sheets: ${wb.SheetNames.join(', ')})`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][];
}

// Year columns after a given column in the heading row ("2022 [note 3]" -> 2022), stopping at the first gap.
function yearCols(head: unknown[], after: number): { col: number; year: number }[] {
  const out: { col: number; year: number }[] = [];
  for (let c = after + 1; c < head.length; c++) {
    const m = clean(head[c]).match(/^(\d{4})\b/);
    if (m) out.push({ col: c, year: Number(m[1]) });
    else if (out.length) break;
  }
  return out;
}

export function parseEdition(ed: Edition, councilCodes: Set<string>): ParseResult {
  const checks: string[] = [];
  const unmatched = new Set<string>();
  const resolve = (raw: string): string | null => {
    if (!/^(E0[6-9]|E10|W06|S12)\d{6}$/.test(raw)) return null; // councils only (not regions or nations)
    const code = councilCodes.has(raw) ? raw : CODE_ALIASES[raw] && councilCodes.has(CODE_ALIASES[raw]) ? CODE_ALIASES[raw] : null;
    if (!code) unmatched.add(raw);
    return code;
  };

  // ---- Casualties: two side-by-side tables (counts, then rates).
  const cas = sheet(ed.wb, 'Casualties');
  const hi = cas.findIndex((r) => r.some((v) => clean(v) === 'ONS code Local authority'));
  if (hi < 0) throw new Error('Casualties: heading row not found');
  const head = cas[hi];
  const codeCols = head.map((v, i) => (clean(v) === 'ONS code Local authority' ? i : -1)).filter((i) => i >= 0);
  if (codeCols.length < 2) throw new Error(`Casualties: expected two tables (counts and rates), found ${codeCols.length}`);
  const [cA, cB] = codeCols;
  if (!/^severity/i.test(clean(head[cA + 2])) || !/^severity/i.test(clean(head[cB + 2]))) throw new Error('Casualties: severity column not where expected');
  const yearsA = yearCols(head, cA + 2);
  const yearsB = yearCols(head, cB + 2).length ? yearCols(head, cB + 2) : yearCols(head, cB + 3);
  if (yearsA.length === 0 || yearsB.length === 0) throw new Error('Casualties: year columns not found');
  if (yearsA.map((y) => y.year).join() !== yearsB.map((y) => y.year).join()) throw new Error('Casualties: count and rate tables cover different years');

  const map = new Map<string, CasualtyRow>();
  for (const r of cas.slice(hi + 1)) {
    for (const [codeCol, years, isRate] of [[cA, yearsA, false], [cB, yearsB, true]] as const) {
      const raw = clean(r[codeCol]);
      if (!raw) continue;
      const code = resolve(raw);
      if (!code) continue;
      const measure = MEASURES[clean(r[codeCol + 2]).toLowerCase()];
      if (!measure) continue;
      for (const { col, year } of years) {
        const key = `${code}|${year}|${measure}`;
        const row = map.get(key) ?? { council_gss_code: code, year, measure, casualties: null, rate_per_bn_miles: null, release_label: ed.label, source_url: ed.url };
        if (isRate) row.rate_per_bn_miles = num(r[col]); else row.casualties = num(r[col]);
        map.set(key, row);
      }
    }
  }
  const casualties = [...map.values()];
  const years = yearsA.map((y) => y.year);
  const councilsFound = new Set(casualties.map((c) => c.council_gss_code));
  checks.push(`Casualties: ${councilsFound.size} councils, years ${years[0]}-${years[years.length - 1]}, ${casualties.length} rows`);
  // KSI should never be below killed.
  const bad = casualties.filter((c) => c.measure === 'killed' && c.casualties != null).filter((k) => {
    const ksi = map.get(`${k.council_gss_code}|${k.year}|ksi_unadjusted`);
    return ksi?.casualties != null && ksi.casualties < (k.casualties as number);
  });
  if (bad.length) throw new Error(`Casualties: KSI below killed for ${bad.length} council-years (columns misread?)`);
  checks.push('Casualties: KSI >= killed for every council-year OK');

  // ---- Road user type.
  const ru = sheet(ed.wb, 'Road_user_type');
  const hu = ru.findIndex((r) => r.some((v) => clean(v) === 'ONS code Local authority'));
  if (hu < 0) throw new Error('Road_user_type: heading row not found');
  const uh = ru[hu];
  const uc = uh.findIndex((v) => clean(v) === 'ONS code Local authority');
  const userCol = uh.findIndex((v) => /^road user type/i.test(clean(v)));
  const sevCol = uh.findIndex((v) => /^severity/i.test(clean(v)));
  if (userCol < 0 || sevCol < 0) throw new Error('Road_user_type: columns not found');
  const yearsU = yearCols(uh, sevCol);
  const users: UserRow[] = [];
  for (const r of ru.slice(hu + 1)) {
    const code = resolve(clean(r[uc]));
    if (!code) continue;
    const measure = MEASURES[clean(r[sevCol]).toLowerCase()];
    if (measure !== 'killed' && measure !== 'ksi_unadjusted') continue;
    const user = clean(r[userCol]);
    if (!user) continue;
    for (const { col, year } of yearsU) users.push({ council_gss_code: code, year, road_user: user, measure, casualties: num(r[col]) });
  }
  // Road users' killed should add up to the council's killed total (where every user row is present).
  const latest = years[years.length - 1];
  let compared = 0;
  let mismatched = 0;
  for (const code of councilsFound) {
    const parts = users.filter((u) => u.council_gss_code === code && u.year === latest && u.measure === 'killed');
    const total = map.get(`${code}|${latest}|killed`)?.casualties;
    if (parts.length < 8 || total == null || parts.some((p) => p.casualties == null)) continue;
    compared++;
    if (parts.reduce((t, p) => t + (p.casualties as number), 0) !== total) mismatched++;
  }
  if (compared && mismatched / compared > 0.05) throw new Error(`Road_user_type: killed by road user doesn't add up for ${mismatched} of ${compared} councils in ${latest}`);
  checks.push(`Road_user_type: ${users.length} rows; ${latest} killed by road user adds up for ${compared - mismatched} of ${compared} councils compared OK`);

  return { casualties, users, years, unmatched: [...unmatched].sort(), checks };
}

export async function writeEdition(db: SupabaseClient, r: ParseResult): Promise<number> {
  const now = new Date().toISOString();
  for (let i = 0; i < r.casualties.length; i += 1000) {
    const { error } = await db.from('council_road_casualties').upsert(r.casualties.slice(i, i + 1000).map((x) => ({ ...x, synced_at: now })), { onConflict: 'council_gss_code,year,measure' });
    if (error) throw new Error(`council_road_casualties upsert at ${i}: ${error.message}`);
  }
  for (let i = 0; i < r.users.length; i += 1000) {
    const { error } = await db.from('council_road_casualties_users').upsert(r.users.slice(i, i + 1000).map((x) => ({ ...x, synced_at: now })), { onConflict: 'council_gss_code,year,road_user,measure' });
    if (error) throw new Error(`council_road_casualties_users upsert at ${i}: ${error.message}`);
  }
  return r.casualties.length + r.users.length;
}

// Edition label stored with the newest year (e.g. 'RAS0403, first published 30 July 2026').
export async function storedReleaseLabel(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.from('council_road_casualties').select('release_label, year').order('year', { ascending: false }).limit(1);
  if (error) throw new Error(`council_road_casualties read: ${error.message}`);
  return (data?.[0]?.release_label as string | undefined) ?? null;
}

export async function loadCouncilCodes(db: SupabaseClient): Promise<{ codes: Set<string>; councils: { gss_code: string; name: string; type: string }[] }> {
  const { data, error } = await db.from('councils').select('gss_code, name, type');
  if (error) throw new Error(`councils read: ${error.message}`);
  const councils = ((data ?? []) as { gss_code: string; name: string; type: string }[]).filter((c) => c.gss_code);
  return { codes: new Set(councils.map((c) => c.gss_code)), councils };
}
