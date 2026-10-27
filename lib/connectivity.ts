// Shared logic for Ofcom Connected Nations council data (fixed broadband
// coverage, full-fibre take-up, mobile coverage): used by
// scripts/import-council-connectivity.ts and app/api/sync-connectivity/route.ts
// (weekly: loads each new release). Tables:
// scripts/migrations/2026-10-11n-council-connectivity.sql.
//
// Ofcom's download addresses change with every release and aren't on
// GOV.UK, so releases are found by reading Ofcom's Connected Nations pages
// for links named {YYYYMM}_fixed_broadband_coverage...zip and
// {YYYYMM}_mobile_coverage...zip and taking the newest month.

import zlib from 'zlib';
import type { SupabaseClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';

const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const OFCOM = 'https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/';
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };

export type Release = { month: string; fixedUrl: string; mobileUrl: string | null; pages: string[] };

// Pages where Ofcom has published Connected Nations downloads.
function candidatePages(now: Date): string[] {
  const y = now.getUTCFullYear();
  const out: string[] = [];
  for (const yr of [y, y - 1]) {
    out.push(`${OFCOM}connected-nations-update-spring-${yr}`);
    out.push(`${OFCOM}connected-nations-${yr}/data-downloads-${yr}`);
    out.push(`${OFCOM}connected-nations-${yr}2/data-downloads-${yr}`);
  }
  return out;
}

export async function findLatestRelease(now = new Date()): Promise<Release> {
  const fixed = new Map<string, string>();
  const mobile = new Map<string, string>();
  const pages: string[] = [];
  for (const page of candidatePages(now)) {
    const res = await politeFetch(page, { headers: UA });
    if (!res.ok) continue;
    pages.push(page);
    const html = await res.text();
    for (const m of html.matchAll(/href="([^"]*?\/(\d{6})_(fixed_broadband_coverage|mobile_coverage)[^"/]*?\.zip)(?:\?[^"]*)?"/gi)) {
      const url = m[1].startsWith('http') ? m[1] : `https://www.ofcom.org.uk${m[1]}`;
      (m[3].toLowerCase().startsWith('fixed') ? fixed : mobile).set(m[2], url);
    }
  }
  const months = [...fixed.keys()].sort();
  if (months.length === 0) throw new Error(`No Ofcom fixed broadband download links found (pages read: ${pages.length})`);
  const latest = months[months.length - 1];
  return { month: `${latest.slice(0, 4)}-${latest.slice(4, 6)}-01`, fixedUrl: fixed.get(latest)!, mobileUrl: mobile.get(latest) ?? null, pages };
}

// ---------- ZIP reading (with ZIP64 support)
type ZipEntry = { name: string; method: number; comp: number; local: number };
function listZip(buf: Buffer): ZipEntry[] {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  let entries = buf.readUInt16LE(eocd + 10);
  let cd = buf.readUInt32LE(eocd + 16);
  if (entries === 0xffff || cd === 0xffffffff) {
    const loc = eocd - 20;
    if (buf.readUInt32LE(loc) === 0x07064b50) {
      const z64 = Number(buf.readBigUInt64LE(loc + 8));
      entries = Number(buf.readBigUInt64LE(z64 + 32));
      cd = Number(buf.readBigUInt64LE(z64 + 48));
    }
  }
  const out: ZipEntry[] = [];
  let p = cd;
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip central directory');
    const method = buf.readUInt16LE(p + 10);
    let comp = buf.readUInt32LE(p + 20);
    let size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    let local = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    let e = p + 46 + nameLen;
    const end = e + extraLen;
    while (e + 4 <= end) {
      const id = buf.readUInt16LE(e); const len = buf.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) { size = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (comp === 0xffffffff) { comp = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (local === 0xffffffff) local = Number(buf.readBigUInt64LE(q));
      }
      e += 4 + len;
    }
    out.push({ name, method, comp, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
function readEntry(buf: Buffer, en: ZipEntry): string {
  const nl = buf.readUInt16LE(en.local + 26);
  const xl = buf.readUInt16LE(en.local + 28);
  const start = en.local + 30 + nl + xl;
  const data = buf.slice(start, start + en.comp);
  return (en.method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8').replace(/^﻿/, '');
}
function findCsv(buf: Buffer, re: RegExp, exclude?: RegExp): string {
  const hits = listZip(buf).filter((e) => re.test(e.name.split('/').pop() || '') && (!exclude || !exclude.test(e.name.split('/').pop() || '')));
  if (hits.length !== 1) throw new Error(`expected one file matching ${re} in zip, found ${hits.length}: ${hits.map((h) => h.name).join(', ')}`);
  return readEntry(buf, hits[0]);
}

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = []; let row: string[] = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const all = rows.filter((r) => r.length > 1);
  return { header: all[0].map((h) => h.trim()), rows: all.slice(1) };
}

const num = (s: string | undefined): number | null => { const t = (s ?? '').trim().replace(/,/g, ''); return t === '' || !/^-?\d+(\.\d+)?$/.test(t) ? null : Number(t); };

function colIndex(header: string[], name: string): number {
  const i = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  if (i < 0) throw new Error(`column "${name}" not found`);
  return i;
}

export type BroadbandRow = {
  council_gss_code: string; data_month: string; all_premises: number;
  sfbb_n: number | null; ufbb100_n: number | null; ufbb300_n: number | null; full_fibre_n: number | null; gigabit_n: number | null;
  unable_10_n: number | null; unable_decent_n: number | null;
  res_premises: number | null; res_gigabit_n: number | null; res_full_fibre_n: number | null;
  ff_takeup_of_coverage_pct: number | null; ff_takeup_of_all_pct: number | null; source_url: string;
};
export type MobileRow = {
  council_gss_code: string; data_month: string; prem_count: number | null; pixel_count: number | null;
  g4_in_none_pct: number | null; g4_in_all_pct: number | null; g4_out_none_pct: number | null; g4_out_all_pct: number | null;
  g4_geo_none_pct: number | null; g4_geo_all_pct: number | null; g5_out_none_pct: number | null; g5_out_all_pct: number | null;
  voice_in_none_pct: number | null; voice_in_all_pct: number | null; source_url: string;
};
export type ParseResult = { broadband: BroadbandRow[]; mobile: MobileRow[]; ukPremises: number | null; unmatched: string[]; checks: string[] };

export async function download(url: string): Promise<Buffer> {
  const res = await politeFetch(url, { headers: UA }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`Ofcom download HTTP ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export function parseRelease(rel: Release, fixedZip: Buffer, mobileZip: Buffer | null, councilCodes: Set<string>): ParseResult {
  const checks: string[] = [];
  const unmatched = new Set<string>();
  const resolve = (raw: string): string | null => {
    const code = raw.trim();
    if (!code) return null;
    if (councilCodes.has(code)) return code;
    if (CODE_ALIASES[code] && councilCodes.has(CODE_ALIASES[code])) return CODE_ALIASES[code];
    unmatched.add(code);
    return null;
  };

  // ---- fixed: all premises
  const all = parseCsv(findCsv(fixedZip, /fixed_laua_coverage/i, /_res_/i));
  const res = parseCsv(findCsv(fixedZip, /fixed_laua_res_coverage/i));
  let take: { header: string[]; rows: string[][] } | null = null;
  try { take = parseCsv(findCsv(fixedZip, /full_fibre_take-?up_laua/i)); } catch { take = null; checks.push('no full-fibre take-up file in this release'); }

  const A = (n: string) => colIndex(all.header, n);
  const cA = { code: A('laua'), all: A('All Premises'), sfbb: A('Number of premises with SFBB availability'), u100: A('Number of premises with UFBB (100Mbit/s) availability'), u300: A('Number of premises with UFBB availability'), ff: A('Number of premises with Full Fibre availability'), gig: A('Number of premises with Gigabit availability'), u10: A('Number of premises unable to receive 10Mbit/s'), dec: A('Number of premises unable to receive decent broadband from fixed or FWA') };
  const R = (n: string) => colIndex(res.header, n);
  const cR = { code: R('laua'), all: R('All Premises'), gig: R('Number of premises with Gigabit availability'), ff: R('Number of premises with Full Fibre availability') };
  const resBy = new Map(res.rows.map((r) => [r[cR.code].trim(), r]));
  const takeBy = new Map<string, string[]>();
  let tCov = -1; let tAll = -1;
  if (take) {
    tCov = take.header.findIndex((h) => /take-up \(% of full-fibre coverage\)/i.test(h));
    tAll = take.header.findIndex((h) => /take-up \(% of all premises\)/i.test(h));
    if (tCov < 0 || tAll < 0) throw new Error('full-fibre take-up columns not found');
    const tc = colIndex(take.header, 'laua');
    for (const r of take.rows) takeBy.set(r[tc].trim(), r);
  }

  const broadband: BroadbandRow[] = [];
  let sumPremises = 0;
  for (const r of all.rows) {
    const raw = r[cA.code].trim();
    const code = resolve(raw);
    if (!code) continue;
    const premises = num(r[cA.all]);
    if (premises == null) throw new Error(`no premises count for ${raw}`);
    sumPremises += premises;
    const rr = resBy.get(raw);
    const tr = takeBy.get(raw);
    broadband.push({
      council_gss_code: code, data_month: rel.month, all_premises: premises,
      sfbb_n: num(r[cA.sfbb]), ufbb100_n: num(r[cA.u100]), ufbb300_n: num(r[cA.u300]), full_fibre_n: num(r[cA.ff]), gigabit_n: num(r[cA.gig]),
      unable_10_n: num(r[cA.u10]), unable_decent_n: num(r[cA.dec]),
      res_premises: rr ? num(rr[cR.all]) : null, res_gigabit_n: rr ? num(rr[cR.gig]) : null, res_full_fibre_n: rr ? num(rr[cR.ff]) : null,
      ff_takeup_of_coverage_pct: tr ? num(tr[tCov]) : null, ff_takeup_of_all_pct: tr ? num(tr[tAll]) : null,
      source_url: rel.fixedUrl,
    });
  }

  // UK total premises (UK and nations file) to check the council files add up.
  let ukPremises: number | null = null;
  try {
    const uk = parseCsv(findCsv(fixedZip, /fixed_coverage_UK_and_nations/i));
    const [iLoc, iType, iRur, iSpeed, iN] = ['Location', 'Premise type', 'Rurality', 'Speed', 'Premises'].map((n) => colIndex(uk.header, n));
    const row = uk.rows.find((r) => r[iLoc].trim() === 'UK' && r[iType].trim() === 'All' && r[iRur].trim() === 'Total' && /premise base/i.test(r[iSpeed]));
    ukPremises = row ? num(row[iN]) : null;
  } catch { ukPremises = null; }
  if (ukPremises != null) {
    const diff = Math.abs(sumPremises - ukPremises) / ukPremises;
    if (diff > 0.005) throw new Error(`council premises ${sumPremises} differ from UK total ${ukPremises} by ${(diff * 100).toFixed(2)}%`);
    checks.push(`fixed: council premises ${sumPremises.toLocaleString()} vs UK ${ukPremises.toLocaleString()} (${(diff * 100).toFixed(3)}%) OK`);
  } else checks.push('fixed: UK total not found, premises check skipped');
  // Counts must not exceed premises, and gigabit >= full fibre.
  const bad = broadband.filter((b) => [b.sfbb_n, b.gigabit_n, b.full_fibre_n].some((n) => n != null && n > b.all_premises) || (b.gigabit_n != null && b.full_fibre_n != null && b.full_fibre_n > b.gigabit_n));
  if (bad.length) throw new Error(`fixed: inconsistent counts for ${bad.map((b) => b.council_gss_code).join(' ')}`);
  checks.push(`fixed: ${broadband.length} councils; counts consistent OK`);

  // ---- mobile
  const mobile: MobileRow[] = [];
  if (mobileZip && rel.mobileUrl) {
    const m = parseCsv(findCsv(mobileZip, /mobile_coverage_laua/i));
    const ix = (n: string) => m.header.findIndex((h) => h.toLowerCase() === n.toLowerCase());
    const iCode = ix('laua');
    if (iCode < 0) throw new Error('mobile: laua column not found');
    // % in group with exactly 0 and exactly 4 networks; blanks are 0 when the group has any value.
    const group = (r: string[], prefix: string): { none: number | null; all: number | null } => {
      const cols = [0, 1, 2, 3, 4].map((k) => ix(`${prefix}_${k}`));
      if (cols[0] < 0) throw new Error(`mobile: column ${prefix}_0 not found`);
      const vals = cols.map((c) => (c < 0 ? null : num(r[c])));
      if (vals.every((v) => v == null)) return { none: null, all: null };
      return { none: vals[0] ?? 0, all: cols[4] < 0 ? null : vals[4] ?? 0 };
    };
    for (const r of m.rows) {
      const code = resolve(r[iCode]);
      if (!code) continue;
      const g4in = group(r, '4G_prem_in'); const g4out = group(r, '4G_prem_out'); const g4geo = group(r, '4G_geo_out');
      const g5 = group(r, '5G_high_confidence_prem_out'); const vin = group(r, 'Voice_prem_in');
      mobile.push({
        council_gss_code: code, data_month: rel.month, prem_count: num(r[ix('prem_count')]), pixel_count: num(r[ix('pixel_count')]),
        g4_in_none_pct: g4in.none, g4_in_all_pct: g4in.all, g4_out_none_pct: g4out.none, g4_out_all_pct: g4out.all,
        g4_geo_none_pct: g4geo.none, g4_geo_all_pct: g4geo.all, g5_out_none_pct: g5.none, g5_out_all_pct: g5.all,
        voice_in_none_pct: vin.none, voice_in_all_pct: vin.all, source_url: rel.mobileUrl,
      });
    }
    // Each group's shares should add up to ~100%.
    const sumCheck = m.rows.slice(0, 50).filter((r) => {
      const vals = [0, 1, 2, 3, 4].map((k) => num(r[ix(`4G_prem_in_${k}`)]) ?? 0);
      const s = vals.reduce((a, b) => a + b, 0);
      return s > 0 && Math.abs(s - 100) > 0.5;
    });
    if (sumCheck.length) throw new Error(`mobile: 4G indoor shares don't add up to 100% for ${sumCheck.length} councils (columns misread?)`);
    checks.push(`mobile: ${mobile.length} councils; 4G indoor shares add up to 100% OK`);
  } else checks.push('mobile: no mobile file for this release');

  return { broadband, mobile, ukPremises, unmatched: [...unmatched].sort(), checks };
}

export async function writeRelease(db: SupabaseClient, r: ParseResult): Promise<number> {
  const now = new Date().toISOString();
  const { error } = await db.from('council_broadband').upsert(r.broadband.map((x) => ({ ...x, synced_at: now })), { onConflict: 'council_gss_code,data_month' });
  if (error) throw new Error(`council_broadband upsert: ${error.message}`);
  if (r.mobile.length) {
    const { error: e } = await db.from('council_mobile_coverage').upsert(r.mobile.map((x) => ({ ...x, synced_at: now })), { onConflict: 'council_gss_code,data_month' });
    if (e) throw new Error(`council_mobile_coverage upsert: ${e.message}`);
  }
  return r.broadband.length + r.mobile.length;
}

export async function storedMonth(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.from('council_broadband').select('data_month').order('data_month', { ascending: false }).limit(1);
  if (error) throw new Error(`council_broadband read: ${error.message}`);
  return (data?.[0]?.data_month as string | undefined) ?? null;
}

export async function loadCouncilCodes(db: SupabaseClient): Promise<{ codes: Set<string>; councils: { gss_code: string; name: string; type: string }[] }> {
  const { data, error } = await db.from('councils').select('gss_code, name, type');
  if (error) throw new Error(`councils read: ${error.message}`);
  const councils = ((data ?? []) as { gss_code: string; name: string; type: string }[]).filter((c) => c.gss_code);
  return { codes: new Set(councils.map((c) => c.gss_code)), councils };
}
