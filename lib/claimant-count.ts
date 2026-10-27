// Shared logic for the ONS Claimant Count by council (Nomis dataset
// NM_162_1): used by scripts/import-council-claimant-count.ts (full
// history) and app/api/sync-claimant-count/route.ts (daily: latest 3
// months). Table: scripts/migrations/2026-10-11j-council-claimant-count.sql.
//
// Nomis is the official ONS labour-market service: free, Open Government
// Licence, no account needed. Guest requests are capped at 25,000 cells,
// so months are requested in batches (361 councils x 6 months x 3 sexes x
// 2 measures = 12,996 cells per request).

import type { SupabaseClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';

const NOMIS = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_162_1.data.csv';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };

// TYPE424: local authorities: district / unitary (as of April 2023) — 361 councils.
// TYPE423: local authorities: county / unitary (as of April 2023) — used for the 21 county councils.
export const GEOGRAPHY_TYPES = [
  { type: 'TYPE424', keep: (code: string) => code.length > 0 },
  { type: 'TYPE423', keep: (code: string) => code.startsWith('E10') },
] as const;

// Barnsley and Sheffield moved to new codes (April 2025); the councils table
// still uses the old ones. Nomis currently publishes the old codes, but this
// keeps the import working if that changes.
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };

export const MONTHS_PER_REQUEST = 6;

export type ClaimantRow = {
  council_gss_code: string;
  month: string; // YYYY-MM-01
  claimants: number | null;
  claimants_men: number | null;
  claimants_women: number | null;
  rate: number | null;
  rate_men: number | null;
  rate_women: number | null;
};

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// "2026-08" or "August 2026" -> "2026-08-01"
function toMonth(date: string, dateName: string): string | null {
  const a = date.match(/^(\d{4})-(\d{2})/);
  if (a) return `${a[1]}-${a[2]}-01`;
  const b = dateName.trim().toLowerCase().match(/^([a-z]+) (\d{4})$/);
  if (b && MONTH_NAMES.includes(b[1])) return `${b[2]}-${String(MONTH_NAMES.indexOf(b[1]) + 1).padStart(2, '0')}-01`;
  return null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(f); f = ''; }
    else f += c;
  }
  out.push(f);
  return out;
}

export function offsetsParam(offsets: number[]): string {
  return offsets.map((n) => (n === 0 ? 'latest' : `latestMINUS${n}`)).join(',');
}

export type FetchResult = { rows: ClaimantRow[]; unmatched: string[]; cells: number };

// Fetch the given month offsets (0 = latest) for one geography type.
export async function fetchMonths(geoType: (typeof GEOGRAPHY_TYPES)[number], offsets: number[], councilCodes: Set<string>): Promise<FetchResult> {
  const url = `${NOMIS}?geography=${geoType.type}&date=${offsetsParam(offsets)}&gender=0,1,2&age=0&measure=1,2&measures=20100&select=date,date_name,geography_code,gender,measure,obs_value`;
  const res = await politeFetch(url, { headers: UA }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`Nomis ${geoType.type} HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], unmatched: [], cells: 0 };
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const ix = (h: string) => header.indexOf(h);
  const [iDate, iDateName, iCode, iGender, iMeasure, iValue] = ['DATE', 'DATE_NAME', 'GEOGRAPHY_CODE', 'GENDER', 'MEASURE', 'OBS_VALUE'].map(ix);
  if ([iDate, iDateName, iCode, iGender, iMeasure, iValue].some((i) => i < 0)) throw new Error(`Nomis ${geoType.type}: unexpected columns ${header.join(',')}`);

  const resolve = (code: string) => (councilCodes.has(code) ? code : CODE_ALIASES[code] && councilCodes.has(CODE_ALIASES[code]) ? CODE_ALIASES[code] : null);
  const out = new Map<string, ClaimantRow>();
  const unmatched = new Set<string>();
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    const raw = (c[iCode] ?? '').trim();
    if (!geoType.keep(raw)) continue;
    const code = resolve(raw);
    if (!code) { unmatched.add(raw); continue; }
    const month = toMonth(c[iDate] ?? '', c[iDateName] ?? '');
    if (!month) throw new Error(`Nomis ${geoType.type}: unreadable date "${c[iDate]}" / "${c[iDateName]}"`);
    const v = (c[iValue] ?? '').trim();
    const value = v === '' ? null : Number(v);
    const key = `${code}|${month}`;
    const row = out.get(key) ?? { council_gss_code: code, month, claimants: null, claimants_men: null, claimants_women: null, rate: null, rate_men: null, rate_women: null };
    const gender = c[iGender].trim();
    const measure = c[iMeasure].trim();
    const field = measure === '1'
      ? (gender === '0' ? 'claimants' : gender === '1' ? 'claimants_men' : gender === '2' ? 'claimants_women' : null)
      : measure === '2'
        ? (gender === '0' ? 'rate' : gender === '1' ? 'rate_men' : gender === '2' ? 'rate_women' : null)
        : null;
    if (!field) continue;
    (row as Record<string, unknown>)[field] = value != null && Number.isFinite(value) ? (measure === '1' ? Math.round(value) : value) : null;
    out.set(key, row);
  }
  return { rows: [...out.values()], unmatched: [...unmatched].sort(), cells: lines.length - 1 };
}

export async function writeClaimantRows(db: SupabaseClient, rows: ClaimantRow[]): Promise<number> {
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from('council_claimant_count').upsert(rows.slice(i, i + 1000).map((r) => ({ ...r, synced_at: now })), { onConflict: 'council_gss_code,month' });
    if (error) throw new Error(`council_claimant_count upsert at ${i}: ${error.message}`);
  }
  return rows.length;
}

export async function loadCouncilCodes(db: SupabaseClient): Promise<{ codes: Set<string>; names: Map<string, string> }> {
  const { data, error } = await db.from('councils').select('gss_code, name');
  if (error) throw new Error(`councils read: ${error.message}`);
  const rows = (data ?? []).filter((c) => c.gss_code) as { gss_code: string; name: string }[];
  return { codes: new Set(rows.map((c) => c.gss_code)), names: new Map(rows.map((c) => [c.gss_code, c.name])) };
}
