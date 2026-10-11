// Shared logic for the UK House Price Index (HM Land Registry) council
// import: used by scripts/import-council-house-prices.ts (full history,
// run once from the terminal) and app/api/sync-house-prices/route.ts
// (daily check; rewrites the latest 13 months when a new release appears).
// Table: scripts/migrations/2026-10-11h-council-house-prices.sql.
//
// The full file is ~35 MB / ~150k rows. It is parsed line by line and only
// council rows inside the requested month window are kept, so memory stays
// small enough for a serverless function.

import type { SupabaseClient } from '@supabase/supabase-js';

export const HPI_BASE = 'https://publicdata.landregistry.gov.uk/market-trend-data/house-price-index-data/';
const UA = 'opengovt/1.0 (+https://opengovt.uk)';

// Codes the HPI publishes that are aggregates, not councils (regions,
// metropolitan counties, inner/outer London, nations, GB, UK, E&W).
const AGGREGATE_PREFIXES = ['E11', 'E12', 'E13', 'E92', 'K02', 'K03', 'K04', 'N92', 'S92', 'W92'];

// Barnsley and Sheffield moved to new codes (April 2025 boundary change);
// the councils table still uses the old ones.
export const HPI_CODE_ALIASES: Record<string, string> = {
  E08000038: 'E08000016',
  E08000039: 'E08000019',
};

export type HousePriceRow = {
  council_gss_code: string;
  month: string; // YYYY-MM-01
  hpi_area_code: string;
  average_price: number | null;
  house_price_index: number | null;
  change_1m_pct: number | null;
  change_12m_pct: number | null;
  sales_volume: number | null;
  detached_price: number | null;
  detached_12m_pct: number | null;
  semi_detached_price: number | null;
  semi_detached_12m_pct: number | null;
  terraced_price: number | null;
  terraced_12m_pct: number | null;
  flat_price: number | null;
  flat_12m_pct: number | null;
  ftb_price: number | null;
  ftb_12m_pct: number | null;
  foo_price: number | null;
  foo_12m_pct: number | null;
  cash_price: number | null;
  cash_12m_pct: number | null;
  mortgage_price: number | null;
  mortgage_12m_pct: number | null;
  release_tag: string;
};

// Table column -> CSV header.
const COLUMN_MAP: [keyof HousePriceRow, string][] = [
  ['average_price', 'AveragePrice'],
  ['house_price_index', 'Index'],
  ['change_1m_pct', '1m%Change'],
  ['change_12m_pct', '12m%Change'],
  ['sales_volume', 'SalesVolume'],
  ['detached_price', 'DetachedPrice'],
  ['detached_12m_pct', 'Detached12m%Change'],
  ['semi_detached_price', 'SemiDetachedPrice'],
  ['semi_detached_12m_pct', 'SemiDetached12m%Change'],
  ['terraced_price', 'TerracedPrice'],
  ['terraced_12m_pct', 'Terraced12m%Change'],
  ['flat_price', 'FlatPrice'],
  ['flat_12m_pct', 'Flat12m%Change'],
  ['ftb_price', 'FTBPrice'],
  ['ftb_12m_pct', 'FTB12m%Change'],
  ['foo_price', 'FOOPrice'],
  ['foo_12m_pct', 'FOO12m%Change'],
  ['cash_price', 'CashPrice'],
  ['cash_12m_pct', 'Cash12m%Change'],
  ['mortgage_price', 'MortgagePrice'],
  ['mortgage_12m_pct', 'Mortgage12m%Change'],
];

export function fullFileUrl(tag: string): string {
  return `${HPI_BASE}UK-HPI-full-file-${tag}.csv`;
}

function monthTag(d: Date, back: number): string {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Newest full file on the server. Files are named by data month, which is
// ~2 months behind the publication date, so look back up to 6 months.
export async function findLatestFullFile(now = new Date()): Promise<{ tag: string; url: string } | null> {
  for (let back = 0; back <= 6; back++) {
    const tag = monthTag(now, back);
    const url = fullFileUrl(tag);
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
    if (res.ok) return { tag, url };
  }
  return null;
}

export async function downloadFullFile(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`UK HPI download HTTP ${res.status}`);
  return res.text();
}

// One CSV line (RFC 4180 quoting; HPI area names such as "Bristol, City of"
// are quoted, and no field spans lines).
function parseLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}

const num = (s: string | undefined): number | null => {
  if (s == null) return null;
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// "01/07/2026" (as published) or "2026-07-01" -> "2026-07-01"
function toMonth(s: string): string | null {
  const a = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (a) return `${a[3]}-${a[2]}-01`;
  const b = s.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (b) return `${b[1]}-${b[2]}-01`;
  return null;
}

export type BuildResult = {
  rows: HousePriceRow[];
  latestMonth: string | null;
  unknownCodes: string[];           // codes that are neither a council nor a known aggregate
  councilsWithLatest: Set<string>;  // council codes with an average price in the latest month
};

// Parse the full file and build rows for councils in councilCodes.
// fromMonth (YYYY-MM-01) limits rows to that month onwards; null = all.
export function buildHousePriceRows(
  text: string,
  councilCodes: Set<string>,
  releaseTag: string,
  fromMonth: string | null,
): BuildResult {
  const nl = text.indexOf('\n');
  if (nl < 0) throw new Error('UK HPI file has no rows');
  const header = parseLine(text.slice(0, nl).replace(/\r$/, '')).map((h) => h.trim());
  const idx = (h: string) => header.indexOf(h);
  const iDate = idx('Date');
  const iCode = idx('AreaCode');
  const missingHeaders = ['Date', 'AreaCode', ...COLUMN_MAP.map(([, h]) => h)].filter((h) => idx(h) < 0);
  if (missingHeaders.length) throw new Error(`UK HPI file is missing columns: ${missingHeaders.join(', ')}`);
  const colIdx = COLUMN_MAP.map(([col, h]) => [col, idx(h)] as const);

  // Resolve aliases only when the councils table uses the old code.
  const resolve = (code: string): string | null => {
    if (councilCodes.has(code)) return code;
    const alias = HPI_CODE_ALIASES[code];
    if (alias && councilCodes.has(alias)) return alias;
    return null;
  };

  const rows: HousePriceRow[] = [];
  const unknown = new Set<string>();
  let latestMonth: string | null = null;
  const priceByMonth = new Map<string, Set<string>>(); // month -> councils with a price

  let pos = nl + 1;
  while (pos < text.length) {
    let end = text.indexOf('\n', pos);
    if (end < 0) end = text.length;
    const line = text.slice(pos, end).replace(/\r$/, '');
    pos = end + 1;
    if (!line.trim()) continue;
    const cells = parseLine(line);
    const code = (cells[iCode] ?? '').trim();
    const month = toMonth((cells[iDate] ?? '').trim());
    if (!code || !month) continue;
    const council = resolve(code);
    if (!council) {
      if (!AGGREGATE_PREFIXES.some((p) => code.startsWith(p))) unknown.add(code);
      continue;
    }
    if (!latestMonth || month > latestMonth) latestMonth = month;
    if (fromMonth && month < fromMonth) continue;
    const row = { council_gss_code: council, month, hpi_area_code: code, release_tag: releaseTag } as HousePriceRow;
    for (const [col, i] of colIdx) {
      const v = num(cells[i]);
      (row as Record<string, unknown>)[col] = col === 'sales_volume' && v != null ? Math.round(v) : v;
    }
    rows.push(row);
    if (row.average_price != null) {
      const s = priceByMonth.get(month) ?? new Set<string>();
      s.add(council);
      priceByMonth.set(month, s);
    }
  }

  return {
    rows,
    latestMonth,
    unknownCodes: [...unknown].sort(),
    councilsWithLatest: (latestMonth && priceByMonth.get(latestMonth)) || new Set<string>(),
  };
}

// First day of the month n months before month (YYYY-MM-01).
export function monthsBefore(month: string, n: number): string {
  const d = new Date(`${month}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
}

export async function writeHousePriceRows(
  db: SupabaseClient,
  rows: HousePriceRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000).map((r) => ({ ...r, synced_at: now }));
    const { error } = await db.from('council_house_prices').upsert(chunk, { onConflict: 'council_gss_code,month' });
    if (error) throw new Error(`council_house_prices upsert at ${i}: ${error.message}`);
    onProgress?.(Math.min(i + 1000, rows.length), rows.length);
  }
  return rows.length;
}

// Newest release_tag stored, or null if the table is empty.
export async function storedReleaseTag(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db
    .from('council_house_prices')
    .select('release_tag')
    .order('release_tag', { ascending: false })
    .limit(1);
  if (error) throw new Error(`council_house_prices read: ${error.message}`);
  return (data?.[0]?.release_tag as string | undefined) ?? null;
}

export async function loadCouncilCodes(db: SupabaseClient): Promise<{ codes: Set<string>; names: Map<string, string> }> {
  const { data, error } = await db.from('councils').select('gss_code, name');
  if (error) throw new Error(`councils read: ${error.message}`);
  const rows = (data ?? []).filter((c) => c.gss_code) as { gss_code: string; name: string }[];
  return { codes: new Set(rows.map((c) => c.gss_code)), names: new Map(rows.map((c) => [c.gss_code, c.name])) };
}
