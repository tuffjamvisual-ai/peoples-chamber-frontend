// Blue Badges by council, 2020 to 2025 (owner's approval, 28 Oct 2026): downloads each release's DfT tables, reads
// them with lib/blue-badges-source.ts, checks them (England's row, councils within rounding, every code matched) and
// writes the guarded load SQL. It never writes to the database itself.
//   npx tsx scripts/import-blue-badges.ts --councils <councils.csv with gss_code column> --sql <out.sql>
// Later releases are loaded by /api/sync-blue-badges.
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRows, checkRows, dis0108Year, type BlueBadgeRow } from '../lib/blue-badges-source';

const MEDIA = 'https://assets.publishing.service.gov.uk/media';
const UA = { 'User-Agent': 'OpenGovt/1.0 (contact@opengovt.uk)' };

// Each year's release: its data tables (a zip, or the files themselves for 2025).
const RELEASES: { year: number; zip?: string; dis0108?: string; dis0105?: string; population: 'DIS0105' | 'DIS0109'; lostStolen?: boolean }[] = [
  { year: 2020, zip: `${MEDIA}/6006ffa0e90e072f50689afc/blue-badge-scheme-statistics-2020.zip`, population: 'DIS0109' },
  { year: 2021, zip: `${MEDIA}/61eecc21e90e070375c23087/blue-badge-scheme-statistics-2021.zip`, population: 'DIS0105', lostStolen: true },
  { year: 2022, zip: `${MEDIA}/63c52dc5e90e074ee5bb7d38/disability-and-blue-badge-data-tables-2021-22.zip`, population: 'DIS0105' },
  { year: 2023, zip: `${MEDIA}/659e9f8de96df5000df843f1/disability-accessibility-blue-badge-tables-2022-23.zip`, population: 'DIS0105' },
  { year: 2024, zip: `${MEDIA}/678f8f66e94a1e07c3ef84df/disability-accessibility-blue-badge-tables-2023-to-2024.zip`, population: 'DIS0105' },
  { year: 2025, dis0108: `${MEDIA}/69b96713a564b64fbe35ab45/dis0108.ods`, dis0105: `${MEDIA}/69b96809a564b64fbe35ab49/dis0105.ods`, population: 'DIS0105' },
];

// England's lost and stolen badges in the year to March 2025, from the release text (no council table is published).
export const ENGLAND_2025_LOST_STOLEN = { lost: 5200, stolen: 1400,
  url: 'https://www.gov.uk/government/statistics/blue-badge-scheme-statistics-april-2024-to-march-2025/blue-badge-scheme-statistics-april-2024-to-march-2025' };

// 2020's council tables have no England row: England's figures come from DfT's England tables (DIS0101 held,
// DIS0111 issued, 2025 edition), published in thousands.
const ENGLAND_2020: Partial<BlueBadgeRow> = {
  ons_code: 'E92000001', area_name: 'England', area_level: 'england', year: '2020-03-31',
  held: 2444000, held_automatic: 978000, held_discretionary: 1444000, held_organisations: 23000,
  issued: 966000, issued_automatic: 374000, issued_discretionary: 584000, issued_organisations: 8000,
  population_dft_thousands: 56287, held_pct_dft: 4.3, held_per_1000_population: Math.round((2444000 / 56287) * 100) / 100,
  lost: null, stolen: null, low_fields: [], rounded_to: 1000, source_table: 'DIS0101, DIS0111 (2025 edition)',
  source_url: 'https://assets.publishing.service.gov.uk/media/69b966eb635612b767a4664a/dis0101.ods',
};

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await new Promise((r) => setTimeout(r, 1000));
  return Buffer.from(await res.arrayBuffer());
}

// A table from a release zip (file names vary in case and spacing: "dis0101 .ods" in 2021).
function fromZip(zip: Buffer, table: string): XLSX.WorkBook {
  const cfb = XLSX.CFB.read(zip, { type: 'buffer' });
  const i = cfb.FullPaths.findIndex((p: string) => new RegExp(`(^|/)${table}\\s*\\.ods$`, 'i').test(p));
  if (i < 0) throw new Error(`${table} not in zip (${cfb.FullPaths.filter((p: string) => /\.ods$/i.test(p)).join(', ')})`);
  return XLSX.read(cfb.FileIndex[i].content as Uint8Array, { type: 'array' });
}

const lit = (v: unknown): string => {
  if (v == null) return 'NULL';
  if (Array.isArray(v)) return v.length ? `ARRAY[${v.map(lit).join(', ')}]::text[]` : `'{}'::text[]`;
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const COLS: (keyof BlueBadgeRow)[] = ['ons_code', 'area_name', 'area_level', 'year', 'held', 'held_automatic', 'held_discretionary', 'held_organisations',
  'issued', 'issued_automatic', 'issued_discretionary', 'issued_organisations', 'population_dft_thousands', 'held_pct_dft', 'held_per_1000_population',
  'lost', 'stolen', 'low_fields', 'rounded_to', 'source_table', 'source_url'];

async function main() {
  const councilsCsv = arg('--councils'), out = arg('--sql');
  if (!councilsCsv || !out) throw new Error('usage: --councils <csv> --sql <out.sql>');
  const csv = readFileSync(councilsCsv, 'utf8').trim().split('\n');
  const gi = csv[0].split(',').indexOf('gss_code');
  const ours = new Set(csv.slice(1).map((l) => (l.match(/E\d{8}/g) ?? [])[0]).filter((c): c is string => !!c));
  if (gi < 0 || ours.size < 300) throw new Error(`councils CSV: gss_code column or rows missing (${ours.size})`);

  const all: BlueBadgeRow[] = [];
  let failed = false;
  for (const r of RELEASES) {
    let dis0108: XLSX.WorkBook, population: XLSX.WorkBook, lostStolen: XLSX.WorkBook | null = null;
    let urls: { dis0108: string; population: string };
    if (r.zip) {
      const zip = await download(r.zip);
      dis0108 = fromZip(zip, 'dis0108');
      population = fromZip(zip, r.population.toLowerCase());
      if (r.lostStolen) lostStolen = fromZip(zip, 'dis0301');
      urls = { dis0108: r.zip, population: r.zip };
    } else {
      dis0108 = XLSX.read(await download(r.dis0108!), { type: 'buffer' });
      population = XLSX.read(await download(r.dis0105!), { type: 'buffer' });
      urls = { dis0108: r.dis0108!, population: r.dis0105! };
    }
    const titled = dis0108Year(dis0108);
    if (titled != null && titled !== r.year) throw new Error(`${r.year}: DIS0108 title says ${titled}`);
    const rows = buildRows({ year: r.year, dis0108, population, lostStolen, sourceUrls: urls, populationTable: r.population });
    if (r.year === 2020) {
      if (rows.some((x) => x.area_level === 'england')) throw new Error('2020 now has an England row; drop ENGLAND_2020');
      rows.unshift(ENGLAND_2020 as BlueBadgeRow);
    }
    if (r.year === 2025) {
      const eng = rows.find((x) => x.area_level === 'england')!;
      Object.assign(eng, { lost: ENGLAND_2025_LOST_STOLEN.lost, stolen: ENGLAND_2025_LOST_STOLEN.stolen, source_table: `${eng.source_table}; lost and stolen from the release text` });
    }
    const c = checkRows(rows, ours);
    const old = rows.filter((x) => x.area_level === 'council' && !ours.has(x.ons_code)).map((x) => x.area_name);
    const lows = rows.filter((x) => x.low_fields.length).map((x) => `${x.area_name} (${x.low_fields.join(', ')})`);
    console.log(`${r.year}: ${rows.length} rows (${c.councils} councils, rounded to ${rows[0]?.rounded_to}); England held ${c.england.held}, issued ${c.england.issued}; councils add up to held ${c.councilSums.held}, issued ${c.councilSums.issued}`);
    if (old.length) console.log(`   old county codes kept: ${old.join(', ')}`);
    if (lows.length) console.log(`   [low] cells: ${lows.join('; ')}`);
    if (!c.ok) { failed = true; console.log(`   PROBLEMS: ${c.problems.join(' | ')}`); }
    all.push(...rows);
  }
  if (failed) throw new Error('checks failed; no SQL written');
  const e25 = all.find((x) => x.year === '2025-03-31' && x.area_level === 'england')!;
  if (e25.held !== 3065000 || e25.issued !== 1273500) throw new Error(`England 2025 is held ${e25.held}, issued ${e25.issued}; expected 3,065,000 and 1,273,500`);

  const years = [...new Set(all.map((x) => x.year))].sort();
  const sql = [
    `-- Blue Badges by council, ${years[0].slice(0, 4)} to ${years.at(-1)!.slice(0, 4)}: ${all.length} rows (England, regions, councils), written by scripts/import-blue-badges.ts`,
    '\\set ON_ERROR_STOP on',
    'BEGIN;',
    "SET LOCAL statement_timeout = '60s';",
    "SET LOCAL lock_timeout = '5s';",
    'DO $$ BEGIN',
    "  IF to_regclass('public.council_blue_badges') IS NULL THEN RAISE EXCEPTION 'council_blue_badges missing (run 2026-10-28d first)'; END IF;",
    `  IF EXISTS (SELECT 1 FROM public.council_blue_badges) THEN RAISE EXCEPTION 'council_blue_badges is not empty'; END IF;`,
    'END $$;',
    `INSERT INTO public.council_blue_badges (${COLS.join(', ')}) VALUES`,
    all.map((r) => `  (${COLS.map((k) => lit(r[k])).join(', ')})`).join(',\n') + ';',
    'DO $$ DECLARE n integer; h bigint; i bigint; BEGIN',
    '  SELECT count(*) INTO n FROM public.council_blue_badges;',
    `  IF n <> ${all.length} THEN RAISE EXCEPTION 'expected ${all.length} rows, found %', n; END IF;`,
    "  SELECT held, issued INTO h, i FROM public.council_blue_badges WHERE ons_code = 'E92000001' AND year = '2025-03-31';",
    "  IF h IS DISTINCT FROM 3065000 OR i IS DISTINCT FROM 1273500 THEN RAISE EXCEPTION 'England 2025 is held %, issued %', h, i; END IF;",
    'END $$;',
    'COMMIT;',
    '',
  ].join('\n');
  writeFileSync(out, sql);
  console.log(`wrote ${out}: ${all.length} rows`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
