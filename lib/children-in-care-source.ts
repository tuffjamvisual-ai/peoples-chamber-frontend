// DfE "Children looked after in England including adoptions" (owner's approval, 28 Oct 2026): reading the release's
// "Download all data" zip into council_children_in_care rows. Shared by scripts/import-children-in-care.ts (the first
// load, reporting year 2025: 31 March 2021 to 2025) and /api/sync-children-in-care (each new release).
//   cla_number_and_rate_per_10k_children.csv           looked after on 31 March (number, rate per 10,000), started
//                                                      and ceased during the year
//   la_cla_on_31_march_by_characteristics.csv          placed outside the council's boundary; unaccompanied asylum
//                                                      seeking children
//   la_children_who_ceased_during_the_year.csv         adopted (reason the episode ceased)
// Council figures are unrounded; England's are rounded to the nearest 10 (DfE's data guidance). A cell DfE shows as a
// symbol is stored as empty, with the symbol kept in `symbols` and shown with DfE's own meaning (lib/children-in-care.ts).
import * as XLSX from 'xlsx';

export const PUBLICATION_ID = '3260801d-601a-48c6-93b7-cf51680323d1';
export const PUBLICATION_SLUG = 'children-looked-after-in-england-including-adoptions';
export const FIND_STATISTICS_URL = `https://explore-education-statistics.service.gov.uk/find-statistics/${PUBLICATION_SLUG}`;
const API = 'https://api.education.gov.uk/statistics/v1';
const UA = { 'User-Agent': 'OpenGovt/1.0 (+https://www.opengovt.uk)' };

export const FIELDS = ['looked_after', 'rate_per_10000', 'started', 'ceased', 'placed_outside_area', 'placed_outside_area_pct', 'uasc', 'adopted'] as const;
export type Field = (typeof FIELDS)[number];
export type CareRow = {
  ons_code: string; area_name: string; area_level: 'england' | 'council'; year: string;
  looked_after: number | null; rate_per_10000: number | null; started: number | null; ceased: number | null;
  placed_outside_area: number | null; placed_outside_area_pct: number | null; uasc: number | null; adopted: number | null;
  symbols: Record<string, string>; rounded_to: number; source_url: string;
};

// Old codes in some government files, mapped to the codes in our councils table.
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };
// Children's services councils that no longer exist, kept under their own codes (not shown on council pages).
export const OLD_COUNTY_CODES = new Set(['E10000006', 'E10000021']); // Cumbria (to 2023), Northamptonshire (to 2021)

// A small CSV reader: quoted fields, commas and doubled quotes inside quotes.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// The release zip's data files by name ("data/cla_number_and_rate_per_10k_children.csv").
export function filesFromZip(zip: Buffer | Uint8Array, names: string[]): Map<string, string> {
  const cfb = XLSX.CFB.read(zip, { type: 'buffer' });
  const out = new Map<string, string>();
  for (const name of names) {
    const i = cfb.FullPaths.findIndex((p: string) => p.toLowerCase().endsWith(`/${name.toLowerCase()}`));
    if (i < 0) throw new Error(`${name} not in the DfE zip`);
    out.set(name, Buffer.from(cfb.FileIndex[i].content as Uint8Array).toString('utf8'));
  }
  return out;
}
export const DATA_FILES = ['cla_number_and_rate_per_10k_children.csv', 'la_cla_on_31_march_by_characteristics.csv', 'la_children_who_ceased_during_the_year.csv'];

const SYMBOLS = new Set(['c', 'z', 'x', 'k', 'u', 'low']);
function value(raw: string | undefined): { v: number | null; sym: string | null } {
  const s = (raw ?? '').trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { v: Number(s), sym: null };
  if (SYMBOLS.has(s.toLowerCase())) return { v: null, sym: s.toLowerCase() };
  if (s === '') return { v: null, sym: 'x' };
  throw new Error(`unexpected value "${s}"`);
}

type Key = string; // code|year
export function buildRows(files: Map<string, string>, sourceUrl: string): CareRow[] {
  const rows = new Map<Key, CareRow>();
  const levelOk = (r: Record<string, string>) => r.geographic_level === 'National' || r.geographic_level === 'Local authority';
  const rowFor = (r: Record<string, string>): CareRow => {
    const national = r.geographic_level === 'National';
    const raw = national ? 'E92000001' : r.new_la_code;
    const code = CODE_ALIASES[raw] ?? raw;
    if (!/^E(92|06|08|09|10)\d{6}$/.test(code)) throw new Error(`unexpected area code ${raw} (${r.la_name})`);
    const year = `${r.time_period}-03-31`;
    const key = `${code}|${year}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        ons_code: code, area_name: national ? 'England' : r.la_name, area_level: national ? 'england' : 'council', year,
        looked_after: null, rate_per_10000: null, started: null, ceased: null, placed_outside_area: null, placed_outside_area_pct: null,
        uasc: null, adopted: null, symbols: {}, rounded_to: national ? 10 : 1, source_url: sourceUrl,
      };
      rows.set(key, row);
    }
    return row;
  };
  const set = (row: CareRow, field: Field, raw: string | undefined) => {
    const { v, sym } = value(raw);
    (row as Record<Field, number | null>)[field] = v;
    if (sym) row.symbols[field] = sym; else delete row.symbols[field];
  };
  const yearOk = (r: Record<string, string>) => /^\d{4}$/.test(r.time_period);

  for (const r of parseCsv(files.get(DATA_FILES[0])!)) {
    if (!levelOk(r) || !yearOk(r)) continue;
    const row = rowFor(r);
    if (r.population_type === 'Children looked after on 31 March each year') { set(row, 'looked_after', r.children_count); set(row, 'rate_per_10000', r.rate_per_10000); }
    else if (r.population_type === 'Children starting to be looked after each year') set(row, 'started', r.children_count);
    else if (r.population_type === 'Children ceasing to be looked after each year') set(row, 'ceased', r.children_count);
  }
  for (const r of parseCsv(files.get(DATA_FILES[1])!)) {
    if (!levelOk(r) || !yearOk(r)) continue;
    if (r.characteristic === 'Locality of placement' && r.breakdown === 'Placed outside the local authority boundary') {
      const row = rowFor(r); set(row, 'placed_outside_area', r.children_count); set(row, 'placed_outside_area_pct', r.children_percent);
    } else if (r.characteristic === 'Unaccompanied asylum-seeking children' && r.breakdown === 'Unaccompanied asylum-seeking children') {
      set(rowFor(r), 'uasc', r.children_count);
    }
  }
  for (const r of parseCsv(files.get(DATA_FILES[2])!)) {
    if (!levelOk(r) || !yearOk(r)) continue;
    if (r.characteristic === 'Reason episode ceased' && r.breakdown === 'Adopted') set(rowFor(r), 'adopted', r.children_count);
  }
  return [...rows.values()].sort((a, b) => a.year.localeCompare(b.year) || a.ons_code.localeCompare(b.ons_code));
}

export type CheckResult = { ok: boolean; problems: string[]; years: string[]; councils: Record<string, number>; england: Record<string, number | null>; councilSums: Record<string, number> };

// England's row present each year; councils add up to England within its rounding (nearest 10, so within 5 plus 1 for
// each council suppressed); every council code is ours or an old county code; every children's services council present.
export function checkRows(rows: CareRow[], ourCodes: Set<string>, childrensCouncils: Set<string>): CheckResult {
  const problems: string[] = [];
  const years = [...new Set(rows.map((r) => r.year))].sort();
  const out: CheckResult = { ok: true, problems, years, councils: {}, england: {}, councilSums: {} };
  for (const y of years) {
    const yr = rows.filter((r) => r.year === y);
    const eng = yr.find((r) => r.area_level === 'england');
    if (!eng?.looked_after) { problems.push(`${y}: no England figure`); continue; }
    const councils = yr.filter((r) => r.area_level === 'council');
    out.councils[y] = councils.length;
    for (const c of councils) if (!ourCodes.has(c.ons_code) && !OLD_COUNTY_CODES.has(c.ons_code)) problems.push(`${y}: ${c.ons_code} ${c.area_name} not in our councils`);
    const present = new Set(councils.filter((c) => !OLD_COUNTY_CODES.has(c.ons_code)).map((c) => c.ons_code));
    for (const code of childrensCouncils) if (!present.has(code)) problems.push(`${y}: children's services council ${code} missing`);
    const sum = councils.reduce((s, c) => s + (c.looked_after ?? 0), 0);
    const suppressed = councils.filter((c) => c.looked_after == null && c.symbols.looked_after === 'c').length;
    out.england[y] = eng.looked_after; out.councilSums[y] = sum;
    if (Math.abs(sum - eng.looked_after) > 5 + suppressed * 10) problems.push(`${y}: councils add up to ${sum}, England is ${eng.looked_after}`);
  }
  out.ok = problems.length === 0;
  return out;
}

// The newest reporting year: the end of DfE's national time series in the statistics API.
export async function newestReportingYear(): Promise<number | null> {
  const res = await fetch(`${API}/publications/${PUBLICATION_ID}/data-sets?pageSize=20`, { headers: UA, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`DfE statistics API HTTP ${res.status}`);
  const j = (await res.json()) as { results?: { latestVersion?: { timePeriods?: { end?: string } } }[] };
  const ends = (j.results ?? []).map((d) => Number(String(d.latestVersion?.timePeriods?.end ?? '').slice(0, 4))).filter((n) => n > 2000);
  return ends.length ? Math.max(...ends) : null;
}

// The latest release's "Download all data" zip, from its release page.
export async function latestReleaseZip(): Promise<{ year: number; zipUrl: string; pageUrl: string }> {
  const res = await fetch(FIND_STATISTICS_URL, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`release page HTTP ${res.status}`);
  const html = await res.text();
  const zip = html.match(/href="(https:\/\/content\.explore-education-statistics\.service\.gov\.uk\/api\/releases\/[0-9a-f-]{36}\/files\?fromPage=ReleaseDownloads)"/)?.[1];
  const year = Number(res.url.match(/\/(\d{4})(?:\/)?$/)?.[1] ?? NaN);
  if (!zip || !Number.isFinite(year)) throw new Error('release page: no "Download all data" link or reporting year');
  return { year, zipUrl: zip.replace(/&amp;/g, '&'), pageUrl: res.url };
}

export async function downloadZip(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`DfE zip HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
