// DfT "Road condition statistics: data tables (RDC)" (owner's approval, 28 Oct 2026): reading the local authority
// tables into council_road_condition rows, FYE 2008 to FYE 2026. This is the last year of the red, amber and green
// series: DfT moved to the PAS 2161 standard in April 2026, whose 5 condition categories are not backward compatible
// (note on every table), so the tables are loaded once (scripts/import-road-condition.ts) and /api/sync-road-condition
// only watches for the new tables.
//   RDC0120  red: A roads and motorways; B and C roads (FYE 2008 to 2026)
//   RDC0122  green, amber and red: A roads (FYE 2018 to 2026); B and C roads (FYE 2020 to 2026)
//   RDC0130  red: unclassified roads (FYE 2008 to 2026)
//   RDC0321  length treated, per cent of network: A roads; B, C and unclassified roads (FYE 2026 only)
// Shorthand, as DfT writes it: [x] unavailable, [y] unrepresentative (insufficient coverage or known data quality
// issues), [z] not applicable. A cell DfT flags as surveyed by a method other than SCANNER (the "alternative methods"
// note) is kept, and named in not_comparable: DfT advises against comparing it with other councils.
import * as XLSX from 'xlsx';

export const RDC_PAGE = 'https://www.gov.uk/government/statistical-data-sets/road-condition-statistics-data-tables-rdc';
export const RDC_CONTENT_API = 'https://www.gov.uk/api/content/government/statistical-data-sets/road-condition-statistics-data-tables-rdc';
export const TABLE_URLS = {
  rdc0120: 'https://assets.publishing.service.gov.uk/media/6acd14dfec9d3aba1e013c81/rdc0120.ods',
  rdc0122: 'https://assets.publishing.service.gov.uk/media/6accaf9fec9d3aba1e013be1/rdc0122.ods',
  rdc0130: 'https://assets.publishing.service.gov.uk/media/6accaf26a57ddfe32196aab9/rdc0130.ods',
  rdc0321: 'https://assets.publishing.service.gov.uk/media/6acd14f0ec9d3aba1e013c82/rdc0321.ods',
} as const;
// Every RDC table on the page on 28 Oct 2026. A table code not in this list is reported by the weekly check.
export const KNOWN_TABLES = ['RDC0120', 'RDC0121', 'RDC0122', 'RDC0123', 'RDC0130', 'RDC0131', 'RDC0140', 'RDC0201', 'RDC0210', 'RDC0301', 'RDC0310', 'RDC0320', 'RDC0321'];

export const PCT_FIELDS = ['a_roads_red_pct', 'b_c_roads_red_pct', 'unclassified_red_pct', 'a_roads_amber_pct', 'a_roads_green_pct', 'b_c_roads_amber_pct', 'b_c_roads_green_pct'] as const;
export const TREAT_FIELDS = ['treated_a_pct', 'treated_bcu_pct', 'network_a_km', 'network_bcu_km'] as const;
export type RoadField = (typeof PCT_FIELDS)[number] | (typeof TREAT_FIELDS)[number];
export type RoadRow = {
  ons_code: string; area_name: string; area_level: 'england' | 'council'; year: string;
  symbols: Record<string, string>; not_comparable: string[]; source_url: string;
} & Record<RoadField, number | null>;

// New codes DfT uses for Barnsley and Sheffield (boundary change, 1 April 2025), mapped to ours.
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };
// Highway authorities that no longer exist, kept under their own codes (not shown on council pages).
export const OLD_CODES = new Set(['E10000004', 'E10000001', 'E10000006', 'E10000021', 'E06000028', 'E06000029']);

const colIndex = (letters: string) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

type Sheet = { head: string[]; rows: unknown[][]; altCells: Set<string> };
function readSheet(wb: XLSX.WorkBook, name: string, altNotes: Set<string>): Sheet {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`sheet ${name} missing (${wb.SheetNames.join(', ')})`);
  const t = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', blankrows: false });
  const hi = t.findIndex((r) => String(r[0]).trim() === 'ONS Area Code');
  if (hi < 0) throw new Error(`${name}: no "ONS Area Code" heading`);
  const head = t[hi].map((h) => String(h).replace(/\s+/g, ' ').trim());
  const rows = t.slice(hi + 1).filter((r) => /^E(92|06|08|09|10)\d{6}$/.test(String(r[0]).trim()));
  // "[8] applies to T7, U7 and V7": cells flagged by an alternative methods note, as "row|column" (sheet row number).
  const altCells = new Set<string>();
  const notesCol = head.findIndex((h) => /^Notes$/i.test(h));
  for (const r of rows) {
    const text = String(r[notesCol] ?? '');
    for (const m of text.matchAll(/\[(\d+)\] applies to ([A-Z0-9, and]+)/g)) {
      if (!altNotes.has(m[1])) continue;
      for (const cell of m[2].match(/[A-Z]+\d+/g) ?? []) altCells.add(`${String(r[0]).trim()}|${colIndex(cell.match(/[A-Z]+/)![0])}`);
    }
  }
  return { head, rows, altCells };
}

// The note numbers whose text says figures came from an alternative (non SCANNER) method.
function alternativeNotes(wb: XLSX.WorkBook): Set<string> {
  const ws = wb.Sheets['Notes'];
  const out = new Set<string>();
  if (!ws) return out;
  for (const r of XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })) {
    if (/provided by a local authority using alternative methods/i.test(String(r[1]))) out.add(String(r[0]).replace(/\D/g, ''));
  }
  return out;
}

// Cells that are neither a number nor DfT shorthand (one on 28 Oct 2026: "C", Calderdale, B and C roads amber, FYE
// 2022): stored as unavailable, and listed by the import.
export const oddCells: string[] = [];
function cell(raw: unknown, where = ''): { v: number | null; sym: string | null } {
  if (typeof raw === 'number') return { v: raw, sym: null };
  const s = String(raw ?? '').trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { v: Number(s), sym: null };
  const m = s.match(/^\[([a-z])\]$/i);
  if (m) return { v: null, sym: m[1].toLowerCase() };
  if (s === '') return { v: null, sym: 'x' };
  oddCells.push(`${where}: "${s}"`);
  return { v: null, sym: 'x' };
}

export type Workbooks = { rdc0120: XLSX.WorkBook; rdc0122: XLSX.WorkBook; rdc0130: XLSX.WorkBook; rdc0321: XLSX.WorkBook };

export function buildRows(wbs: Workbooks): RoadRow[] {
  oddCells.length = 0;
  const rows = new Map<string, RoadRow>();
  const rowFor = (rawCode: string, rawName: string, fye: number, source: string): RoadRow => {
    const code = CODE_ALIASES[rawCode] ?? rawCode;
    const year = `${fye}-03-31`;
    const key = `${code}|${year}`;
    let row = rows.get(key);
    if (!row) {
      const england = code === 'E92000001';
      row = {
        ons_code: code, area_name: england ? 'England' : rawName.replace(/\s*\[[^\]]*\]/g, '').replace(/\s+UA$/, '').trim(),
        area_level: england ? 'england' : 'council', year, symbols: {}, not_comparable: [], source_url: source,
        a_roads_red_pct: null, b_c_roads_red_pct: null, unclassified_red_pct: null, a_roads_amber_pct: null, a_roads_green_pct: null,
        b_c_roads_amber_pct: null, b_c_roads_green_pct: null, treated_a_pct: null, treated_bcu_pct: null, network_a_km: null, network_bcu_km: null,
      } as RoadRow;
      rows.set(key, row);
    }
    return row;
  };
  const set = (row: RoadRow, field: RoadField, raw: unknown, alt: boolean) => {
    const { v, sym } = cell(raw, `${row.area_name} ${row.year.slice(0, 4)} ${field}`);
    row[field] = v;
    if (sym) row.symbols[field] = sym;
    if (alt && v != null && !row.not_comparable.includes(field)) row.not_comparable.push(field);
  };
  const yearly = (wb: XLSX.WorkBook, sheet: string, source: string, pick: (h: string) => { fye: number; field: RoadField } | null) => {
    const s = readSheet(wb, sheet, alternativeNotes(wb));
    s.head.forEach((h, i) => {
      const p = pick(h);
      if (!p) return;
      for (const r of s.rows) {
        const raw = String(r[0]).trim();
        // Highway authorities only (England, unitaries, metropolitan and London boroughs, counties; DfT lists no districts).
        set(rowFor(raw, String(r[2] || r[1]), p.fye, source), p.field, r[i], s.altCells.has(`${raw}|${i}`));
      }
    });
  };
  const fyeOf = (h: string) => Number(h.match(/^FYE (\d{4})/)?.[1] ?? NaN);
  yearly(wbs.rdc0120, 'RDC0120_A_Road_and_Motorway', TABLE_URLS.rdc0120, (h) => (/^FYE \d{4}$/.test(h) ? { fye: fyeOf(h), field: 'a_roads_red_pct' } : null));
  yearly(wbs.rdc0120, 'RDC0120_B_and_C_Road', TABLE_URLS.rdc0120, (h) => (/^FYE \d{4}$/.test(h) ? { fye: fyeOf(h), field: 'b_c_roads_red_pct' } : null));
  yearly(wbs.rdc0130, 'RDC0130', TABLE_URLS.rdc0130, (h) => (/^FYE \d{4}$/.test(h) ? { fye: fyeOf(h), field: 'unclassified_red_pct' } : null));
  yearly(wbs.rdc0122, 'RDC0122_A_Road_and_Motorway', TABLE_URLS.rdc0122, (h) => {
    const m = h.match(/^FYE (\d{4}) (Green|Amber)$/);
    return m ? { fye: Number(m[1]), field: m[2] === 'Green' ? 'a_roads_green_pct' : 'a_roads_amber_pct' } : null;
  });
  yearly(wbs.rdc0122, 'RDC0122_B_and_C_Road', TABLE_URLS.rdc0122, (h) => {
    const m = h.match(/^FYE (\d{4}) (Green|Amber)$/);
    return m ? { fye: Number(m[1]), field: m[2] === 'Green' ? 'b_c_roads_green_pct' : 'b_c_roads_amber_pct' } : null;
  });
  // RDC0321 is one year, named in its title ("... in Financial Year Ending 2026").
  for (const [sheet, pct, km] of [['RDC0321_A_Road', 'treated_a_pct', 'network_a_km'], ['RDC0321_B,_C_and_U_Road', 'treated_bcu_pct', 'network_bcu_km']] as const) {
    const ws = wbs.rdc0321.Sheets[sheet];
    if (!ws) throw new Error(`sheet ${sheet} missing`);
    const title = String(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })[0]?.[0] ?? '');
    const fye = Number(title.match(/Financial Year Ending (\d{4})/i)?.[1] ?? NaN);
    if (!Number.isFinite(fye)) throw new Error(`${sheet}: no year in the title`);
    const s = readSheet(wbs.rdc0321, sheet, new Set());
    const iTotal = s.head.findIndex((h) => /^Total/.test(h));
    const iLen = s.head.findIndex((h) => /^Network Length/.test(h));
    if (iTotal < 0 || iLen < 0) throw new Error(`${sheet}: Total or Network Length column missing`);
    for (const r of s.rows) {
      const row = rowFor(String(r[0]).trim(), String(r[2] || r[1]), fye, TABLE_URLS.rdc0321);
      set(row, pct, r[iTotal], false);
      set(row, km, r[iLen], false);
    }
  }
  return [...rows.values()].sort((a, b) => a.year.localeCompare(b.year) || a.ons_code.localeCompare(b.ons_code));
}

export type RoadCheck = { ok: boolean; problems: string[]; years: string[]; councilsLatest: number; england: Record<string, Record<string, number | null>> };
export function checkRows(rows: RoadRow[], ourCodes: Set<string>, highwayCouncils: Set<string>): RoadCheck {
  const problems: string[] = [];
  const years = [...new Set(rows.map((r) => r.year))].sort();
  const latest = years[years.length - 1];
  const england: RoadCheck['england'] = {};
  for (const y of years) {
    const e = rows.find((r) => r.year === y && r.area_level === 'england');
    if (!e || e.a_roads_red_pct == null) problems.push(`${y}: no England A road figure`);
    else england[y] = { a: e.a_roads_red_pct, bc: e.b_c_roads_red_pct, u: e.unclassified_red_pct };
  }
  const councils = rows.filter((r) => r.area_level === 'council');
  for (const c of councils) if (!ourCodes.has(c.ons_code) && !OLD_CODES.has(c.ons_code)) problems.push(`${c.ons_code} ${c.area_name} not in our councils`);
  const present = new Set(councils.filter((c) => c.year === latest).map((c) => c.ons_code));
  for (const code of highwayCouncils) if (!present.has(code)) problems.push(`highway authority ${code} missing in ${latest}`);
  for (const r of rows) for (const f of PCT_FIELDS) { const v = r[f]; if (v != null && (v < 0 || v > 100)) problems.push(`${r.ons_code} ${r.year} ${f} = ${v}`); }
  return { ok: problems.length === 0, problems, years, councilsLatest: present.size, england };
}

export async function fetchWorkbook(url: string): Promise<XLSX.WorkBook> {
  const res = await fetch(url, { headers: { 'User-Agent': 'OpenGovt/1.0 (+https://www.opengovt.uk)' }, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
}
