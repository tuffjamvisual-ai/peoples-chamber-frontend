// Shared logic for DESNZ "Sub-regional fuel poverty data": used by
// scripts/import-council-fuel-poverty.ts and app/api/sync-fuel-poverty/route.ts
// (weekly: loads each new annual release). Council level only (Table 2): the small area (LSOA) table is no longer
// loaded (owner's decision, 28 Oct 2026). Table: scripts/migrations/2026-10-11l-council-fuel-poverty.sql.

import * as XLSX from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';

const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const CONTENT_API = 'https://www.gov.uk/api/content/government/statistics/';
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };

export type Release = { dataYear: number; pubYear: number; pageUrl: string; xlsxUrl: string };

// Release pages follow a fixed address: sub-regional-fuel-poverty-data-{publication year}-{data year}-data
// (data year = publication year - 2). Returns the newest that exists.
export async function findLatestRelease(now = new Date()): Promise<Release | null> {
  const y = now.getUTCFullYear();
  for (const pubYear of [y + 1, y, y - 1, y - 2]) {
    const dataYear = pubYear - 2;
    const slug = `sub-regional-fuel-poverty-data-${pubYear}-${dataYear}-data`;
    const res = await politeFetch(CONTENT_API + slug, { headers: UA });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`GOV.UK Content API HTTP ${res.status} for ${slug}`);
    const json = await res.json();
    const atts = (json?.details?.attachments ?? []) as { url?: string }[];
    const xlsx = atts.find((a) => /\.xlsx$/i.test(String(a.url ?? '')));
    if (!xlsx?.url) throw new Error(`${slug}: no .xlsx attachment`);
    return { dataYear, pubYear, pageUrl: `https://www.gov.uk/government/statistics/${slug}`, xlsxUrl: xlsx.url };
  }
  return null;
}

export type CouncilRow = { council_gss_code: string; data_year: number; households: number; fuel_poor: number; percentage: number; source_url: string };

export type ParseResult = {
  councils: CouncilRow[];
  england: { households: number; fuel_poor: number; percentage: number } | null;
  unmatchedCouncilCodes: string[];
  checks: string[];
};

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const num = (v: unknown) => (typeof v === 'number' ? v : Number(clean(v).replace(/,/g, '')));

function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`sheet "${name}" not found (sheets: ${wb.SheetNames.join(', ')})`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][];
}

function headingIndex(rows: unknown[][], firstHeading: RegExp): { hi: number; col: (re: RegExp) => number } {
  const hi = rows.findIndex((r) => firstHeading.test(clean(r[0])));
  if (hi < 0) throw new Error(`heading row matching ${firstHeading} not found`);
  const h = rows[hi].map(clean);
  return {
    hi,
    col: (re: RegExp) => { const i = h.findIndex((x) => re.test(x)); if (i < 0) throw new Error(`column ${re} not found in: ${h.join(' | ')}`); return i; },
  };
}

export function parseRelease(buf: Buffer, rel: Release, councilCodes: Set<string>): ParseResult {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const checks: string[] = [];
  const resolve = (code: string) => (councilCodes.has(code) ? code : CODE_ALIASES[code] && councilCodes.has(CODE_ALIASES[code]) ? CODE_ALIASES[code] : null);

  // Table 2: local authorities (with England, regions, met counties, inner/outer London).
  const t2 = sheetRows(wb, 'Table 2');
  const h2 = headingIndex(t2, /^Local Authority code/i);
  const c2 = { code: 0, hh: h2.col(/^Number of households$/i), fp: h2.col(/^Number of households in fuel poverty/i), pct: h2.col(/^Proportion of households fuel poor/i) };
  const councils: CouncilRow[] = [];
  const unmatched = new Set<string>();
  let england: ParseResult['england'] = null;
  let districtHH = 0;
  for (const r of t2.slice(h2.hi + 1)) {
    const raw = clean(r[c2.code]);
    if (!/^E\d{8}$/.test(raw)) continue;
    const hh = num(r[c2.hh]); const fp = num(r[c2.fp]); const pct = num(r[c2.pct]);
    if (![hh, fp, pct].every(Number.isFinite)) throw new Error(`Table 2: non-numeric values for ${raw}`);
    if (raw === 'E92000001') {
      england = { households: hh, fuel_poor: fp, percentage: pct };
      // Stored too, so council pages can show the England rate.
      councils.push({ council_gss_code: raw, data_year: rel.dataYear, households: Math.round(hh), fuel_poor: Math.round(fp), percentage: pct, source_url: rel.xlsxUrl });
      continue;
    }
    if (/^E(11|12|13)/.test(raw)) continue; // met counties, regions, inner/outer London
    const code = resolve(raw);
    if (!code) { unmatched.add(raw); continue; }
    if (/^E0[6-9]/.test(raw)) districtHH += hh;
    councils.push({ council_gss_code: code, data_year: rel.dataYear, households: Math.round(hh), fuel_poor: Math.round(fp), percentage: pct, source_url: rel.xlsxUrl });
  }
  if (!england) throw new Error('Table 2: England row not found');
  const diff = Math.abs(districtHH - england.households) / england.households;
  if (diff > 0.005) throw new Error(`Table 2: district/unitary households ${Math.round(districtHH)} differ from England ${england.households} by ${(diff * 100).toFixed(2)}%`);
  checks.push(`Table 2: district/unitary households ${Math.round(districtHH).toLocaleString()} vs England ${england.households.toLocaleString()} (${(diff * 100).toFixed(3)}%) OK`);

  return { councils, england, unmatchedCouncilCodes: [...unmatched].sort(), checks };
}

export async function downloadXlsx(url: string): Promise<Buffer> {
  const res = await politeFetch(url, { headers: UA }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`fuel poverty download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function writeRelease(db: SupabaseClient, r: ParseResult): Promise<number> {
  const now = new Date().toISOString();
  const { error } = await db.from('council_fuel_poverty').upsert(r.councils.map((x) => ({ ...x, synced_at: now })), { onConflict: 'council_gss_code,data_year' });
  if (error) throw new Error(`council_fuel_poverty upsert: ${error.message}`);
  return r.councils.length;
}

export async function storedDataYear(db: SupabaseClient): Promise<number | null> {
  const { data, error } = await db.from('council_fuel_poverty').select('data_year').order('data_year', { ascending: false }).limit(1);
  if (error) throw new Error(`council_fuel_poverty read: ${error.message}`);
  return (data?.[0]?.data_year as number | undefined) ?? null;
}

export async function loadCouncilCodes(db: SupabaseClient): Promise<{ codes: Set<string>; names: Map<string, string> }> {
  const { data, error } = await db.from('councils').select('gss_code, name');
  if (error) throw new Error(`councils read: ${error.message}`);
  const rows = (data ?? []).filter((c) => c.gss_code) as { gss_code: string; name: string }[];
  return { codes: new Set(rows.map((c) => c.gss_code)), names: new Map(rows.map((c) => [c.gss_code, c.name])) };
}
