#!/usr/bin/env node
// Fly-tipping recorded by councils, 2023/24 and 2024/25, into council_fly_tipping
// (migration 2026-10-19p-council-fly-tipping.sql). John's decisions, 19 Oct 2026.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. Rerunnable: --sql writes one guarded transaction that
// replaces the rows for the years loaded (backing up any rows already there).
//
// Sources (robots.txt allows each):
//   --defra=file.ods      Defra, "Flytipping incidents and actions taken reported by LAs in England 2012-13 to 2024-25"
//                         (sheets LA_incidents and LA_actions), from
//                         https://www.gov.uk/government/statistics/fly-tipping-statistics-for-england
//   StatsWales "Local authority reported fly-tipping" is downloaded on every run (no saved copy): the dataset
//                         page's Download data form, full dataset, CSV, unformatted numbers, with reference codes.
//                         robots.txt is checked first (for the redirect target too); if the download fails, the run stops.
//   --population=file.xlsx  ONS mid-year estimates mye24tablesew.xlsx (table MYE4: mid-2023 and mid-2024), the
//                         file Defra uses for its rates
//   --councils=file.tsv   slug, name, type, gss_code, country, parent_slug (default: read from the database)
//   --show=slug,slug      councils to print the page draft for
//   --sql=file.sql --sql-tag=20261019q
//
// Rules:
//   - England: incidents, rate per 1,000 (Defra's own), total enforcement actions, fixed penalty notices issued
//     specifically for fly-tipping, prosecution actions, reporting basis, as published.
//   - Wales: the same measures from StatsWales; the rate per 1,000 is worked out from the ONS mid-year estimate for
//     the year's start (mid-2023 for 2023/24, mid-2024 for 2024/25), as Defra does, with rate_calculated = true.
//     The method is checked against every Defra rate before use.
//   - County councils: the sum of their district councils (summed_from_districts = true, rate_calculated = true).
//     A county gets no incidents total when any district has no figure for the year.
//   - Known gaps from Defra's notes are carried as notes: Fylde 2024/25 (no incidents figure; enforcement 9 months),
//     Birmingham 2024/25 (enforcement 6 months), Isle of Wight 2023/24 (9 months), reporting basis changes.

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { execFileSync } = require('child_process');
const XLSX = require('xlsx');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(m); process.exit(1); };
const YEARS = ['2023-24', '2024-25'];
const POP_COLUMN = { '2023-24': 'Mid-2023', '2024-25': 'Mid-2024' };
const DEFRA_URL = 'https://assets.publishing.service.gov.uk/media/699dbf7e3e672177d0bc75b0/Flytipping_incidents_and_actions_taken__reported_by_LAs_in_England__2012-13_to_2024-25v2.ods';
const WALES_URL = 'https://stats.gov.wales/en-GB/1d891896-2866-4fe8-a6fd-90f7caea2a24';

// From the Notes sheet of the Defra file (February 2026 release). Each is checked against the file.
const DEFRA_NOTES = [
  { year: '2024-25', name: 'Fylde', gss: 'E07000119', incidentsBlank: true, months_incidents: null, months_enforcement: 9,
    note: 'Fylde sent 9 months of data for 2024/25; Defra estimated the rest for the national total but publishes no council figure for incidents.' },
  { year: '2024-25', name: 'Birmingham', gss: 'E08000025', months_enforcement: 6,
    note: 'Defra left out the last two quarters of Birmingham\'s 2024/25 enforcement data over quality concerns.' },
  { year: '2024-25', name: 'Gravesham', gss: 'E07000109',
    note: 'The last quarter of 2024/25 counts only fly-tips reported by staff or contractors and cleared proactively.' },
  { year: '2023-24', name: 'Isle of Wight', gss: 'E06000046', months_incidents: 9, months_enforcement: 9,
    note: 'Isle of Wight sent 9 months of data for 2023/24.' },
  { year: '2023-24', name: 'Blackburn with Darwen', gss: 'E06000008',
    note: 'The first quarters of 2023/24 count only fly-tips reported by the public; the rest count all incidents.' },
  { year: '2023-24', name: 'Uttlesford', gss: 'E07000077',
    note: 'The first quarters of 2023/24 count only fly-tips reported by the public; the rest count all incidents.' },
];

const val = (v) => (v == null || v === '' || v === ':' || v === '[x]' || v === 'x' ? null : Number(v));

function readDefra(file) {
  const wb = XLSX.readFile(file);
  const table = (sheet) => {
    const r = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: true });
    const h = r.findIndex((x) => x[0] === 'Year');
    if (h < 0) fail(`${sheet}: no header row`);
    return r.slice(h + 1).filter((x) => YEARS.includes(x[0]) && !String(x[1]).startsWith('*')).map((x) => Object.fromEntries(r[h].map((k, i) => [k, x[i]])));
  };
  const need = (rows, cols) => cols.forEach((c) => { if (!(c in rows[0])) fail(`Defra column missing: ${c}`); });
  const inc = table('LA_incidents'); const act = table('LA_actions');
  need(inc, ['ONS Code', 'Total Incidents', 'Incidents per 1,000 people', 'Reporting basis']);
  need(act, ['ONS Code', 'Total Actions', 'Fixed Penalty Notices issued specifically for fly-tipping', 'Prosecution Actions']);
  const out = new Map();
  for (const r of inc) out.set(`${r['ONS Code']}|${r.Year}`, { gss: r['ONS Code'], year: r.Year, name: r['LA Name'],
    incidents: val(r['Total Incidents']), rate: val(r['Incidents per 1,000 people']),
    basis: r['Reporting basis'] && r['Reporting basis'] !== ':' ? r['Reporting basis'] : null });
  for (const r of act) {
    const k = `${r['ONS Code']}|${r.Year}`;
    if (!out.has(k)) fail(`Defra actions row with no incidents row: ${k}`);
    Object.assign(out.get(k), { actions: val(r['Total Actions']), fpns: val(r['Fixed Penalty Notices issued specifically for fly-tipping']), prosecutions: val(r['Prosecution Actions']) });
  }
  return out;
}

// ---------- StatsWales download ----------
const UA = 'opengovt.uk-fly-tipping/1.0 (https://opengovt.uk; council fly-tipping statistics; one request every 5 seconds)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const robotsCache = new Map();
async function robotsAllow(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    const r = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { 'User-Agent': UA }, redirect: 'manual' });
    robotsCache.set(u.host, r.ok ? await r.text() : r.status === 404 ? '' : 'User-agent: *\nDisallow: /');
    await sleep(5000);
  }
  // the rules for "*": the longest matching Allow/Disallow wins
  let inStar = false; let best = { len: -1, allow: true };
  for (const line of robotsCache.get(u.host).split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(); const v = m[2].trim();
    if (k === 'user-agent') { inStar = v === '*'; continue; }
    if (!inStar || (k !== 'allow' && k !== 'disallow') || !v) continue;
    const re = new RegExp('^' + v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(u.pathname + u.search) && v.length > best.len) best = { len: v.length, allow: k === 'allow' };
  }
  return best.allow;
}
async function downloadWales() {
  const url = `${WALES_URL}/download`;
  if (!(await robotsAllow(url))) fail(`StatsWales: robots.txt disallows ${url}`);
  const body = new URLSearchParams({ view_type: 'unfiltered', format: 'csv', view_choice: 'raw', extended: 'yes',
    download_language: 'en-GB', selected_filter_options: '[]', action: 'download' });
  let r = await fetch(url, { method: 'POST', body, headers: { 'User-Agent': UA }, redirect: 'manual' });
  for (let hops = 0; r.status >= 300 && r.status < 400 && hops < 3; hops++) {
    const next = new URL(r.headers.get('location'), url).href;
    if (!(await robotsAllow(next))) fail(`StatsWales: robots.txt disallows the download link ${next}`);
    await sleep(5000);
    r = await fetch(next, { headers: { 'User-Agent': UA }, redirect: 'manual' });
  }
  if (!r.ok) fail(`StatsWales download failed: HTTP ${r.status}`);
  if (!/text\/csv/.test(r.headers.get('content-type') || '')) fail(`StatsWales download is not CSV (${r.headers.get('content-type')})`);
  const text = await r.text();
  if (!text.startsWith('\ufeffData values,') && !text.startsWith('Data values,')) fail('StatsWales download: unexpected columns');
  return { text, bytes: Buffer.byteLength(text), file: (r.headers.get('content-disposition') || '').replace(/^.*filename=/, '') };
}

function readWales(text) {
  const { parse } = require('csv-parse/sync');
  const rows = parse(text, { columns: true, bom: true });
  const pick = { 'Total recorded incidents': ['Number of incidents', 'incidents'], 'Number of enforcement actions': ['Number of actions', 'actions'],
    'Fixed penalty notice': ['Number of actions', 'fpns'], 'Prosecution': ['Number of actions', 'prosecutions'] };
  const out = new Map();
  for (const r of rows) {
    if (!YEARS.includes(r.Year) || !/^W06/.test(r.Area_reference)) continue;
    const p = pick[r.Variable];
    if (!p || r['Data description'] !== p[0]) continue;
    const k = `${r.Area_reference}|${r.Year}`;
    if (!out.has(k)) out.set(k, { gss: r.Area_reference, year: r.Year, name: r.Area, revised: [] });
    const o = out.get(k);
    if (o[p[1]] !== undefined) fail(`StatsWales: two values for ${k} ${r.Variable}`);
    o[p[1]] = val(r['Data values']);
    if (/revised/i.test(r.Notes || '')) o.revised.push(r.Variable);
  }
  return out;
}

function readPopulation(file) {
  const wb = XLSX.readFile(file, { sheets: ['MYE4'] });
  const r = XLSX.utils.sheet_to_json(wb.Sheets.MYE4, { header: 1, raw: true });
  const h = r.findIndex((x) => x[0] === 'Code');
  const H = r[h];
  const out = new Map();
  for (const x of r.slice(h + 1)) if (x[0]) out.set(x[0], Object.fromEntries(Object.values(POP_COLUMN).map((c) => [c, x[H.indexOf(c)]])));
  return out;
}

function councils() {
  const f = arg('councils');
  const text = f ? fs.readFileSync(f, 'utf8') : execFileSync('psql', [process.env.DATABASE_URL || fail('DATABASE_URL not set'), '-AtF', '\t', '-c',
    "select slug, name, type, gss_code, country, coalesce(parent_slug, '') from public.councils order by slug"], { encoding: 'utf8' });
  return text.trim().split('\n').map((l) => { const [slug, name, type, gss, country, parent] = l.split('\t'); return { slug, name, type, gss, country, parent }; });
}

(async () => {
  const defra = readDefra(arg('defra') || fail('give --defra=<Defra LA ods>'));
  const wd = await downloadWales();
  const wales = readWales(wd.text);
  if (wales.size !== 44) fail(`StatsWales: expected 22 councils x 2 years, found ${wales.size}`);
  for (const w of wales.values()) if (w.incidents == null || w.actions == null) fail(`StatsWales: ${w.name} ${w.year} has no incidents or actions figure`);
  const pop = readPopulation(arg('population') || fail('give --population=<mye24tablesew.xlsx>'));
  const all = councils();
  const byGss = new Map(all.map((c) => [c.gss, c]));
  const rows = [];
  const problems = [];

  // 1. Rate method: Defra's rate = incidents / ONS population for the year's start x 1,000
  let worst = 0; let checked = 0;
  for (const d of defra.values()) {
    if (d.incidents == null || d.rate == null) continue;
    const p = pop.get(d.gss)?.[POP_COLUMN[d.year]];
    if (!p) { problems.push(`no ONS population for ${d.gss} ${d.name}`); continue; }
    worst = Math.max(worst, Math.abs((d.incidents / p) * 1000 - d.rate)); checked++;
  }
  if (worst > 0.001) fail(`rate method does not match Defra (largest difference ${worst})`);

  // 2. England, district/unitary/borough level
  for (const d of defra.values()) {
    const c = byGss.get(d.gss);
    if (!c) { problems.push(`Defra row for a council we do not hold: ${d.gss} ${d.name}`); continue; }
    const kn = DEFRA_NOTES.find((n) => n.gss === d.gss && n.year === d.year);
    if (kn && !d.name.startsWith(kn.name)) fail(`known note for ${kn.gss} names ${kn.name}, file has ${d.name}`);
    if (kn?.incidentsBlank && d.incidents != null) fail(`${kn.name} ${d.year}: expected no incidents figure`);
    rows.push({ gss: d.gss, year: d.year, nation: 'England', incidents: d.incidents, incidents_per_1000: d.incidents == null ? null : d.rate,
      rate_calculated: false, actions: d.actions, fpns_fly_tipping: d.fpns, prosecutions: d.prosecutions,
      reporting_basis: d.basis, months_incidents: d.incidents == null ? null : (kn && 'months_incidents' in kn ? kn.months_incidents : 12),
      months_enforcement: kn?.months_enforcement ?? 12, summed_from_districts: false, source_url: DEFRA_URL, notes: kn?.note ?? null, _slug: c.slug, _name: c.name });
  }
  for (const n of DEFRA_NOTES) if (!rows.some((r) => r.gss === n.gss && r.year === n.year)) fail(`known note not matched: ${n.name} ${n.year}`);

  // 3. English county councils: the sum of their districts
  for (const county of all.filter((c) => c.type === 'county')) {
    const ds = all.filter((c) => c.parent === county.slug);
    if (!ds.length) { problems.push(`${county.name}: no districts`); continue; }
    for (const y of YEARS) {
      const dr = ds.map((d) => rows.find((r) => r.gss === d.gss && r.year === y));
      const missing = ds.filter((_, i) => !dr[i]);
      if (missing.length) { problems.push(`${county.name} ${y}: no Defra row for ${missing.map((m) => m.name).join(', ')}`); continue; }
      const sum = (k) => (dr.every((r) => r[k] != null) ? dr.reduce((t, r) => t + r[k], 0) : null);
      const noInc = dr.filter((r) => r.incidents == null);
      const incidents = noInc.length ? null : sum('incidents');
      const people = ds.reduce((t, d) => t + (pop.get(d.gss)?.[POP_COLUMN[y]] ?? NaN), 0);
      const bases = [...new Set(dr.map((r) => r.reporting_basis))];
      const pub = dr.filter((r) => /public reported only/i.test(r.reporting_basis ?? '')).length;
      const chg = dr.filter((r) => /changed during/i.test(r.reporting_basis ?? '')).length;
      const notes = [];
      if (noInc.length) notes.push(`No county total of incidents: ${noInc.map((r) => r._name).join(', ')} has no figure for ${y.replace('-', '/')}.`);
      // Mixed: the basis names the districts, so the page compares two years only when the same districts count the same way
      const pubNames = dr.filter((r) => /public reported only/i.test(r.reporting_basis ?? '')).map((r) => r._name);
      const chgNames = dr.filter((r) => /changed during/i.test(r.reporting_basis ?? '')).map((r) => r._name);
      const mixed = `Mixed: ${[pubNames.length ? `only public reports in ${pubNames.join(', ')}` : '', chgNames.length ? `changed during the year in ${chgNames.join(', ')}` : ''].filter(Boolean).join('; ')}`;
      if (bases.length > 1) notes.push(`Districts count differently: ${pub ? `${pub} of ${ds.length} (${pubNames.join(', ')}) count only fly-tips reported by the public` : ''}${pub && chg ? '; ' : ''}${chg ? `${chgNames.join(', ')} changed how ${chg > 1 ? 'they count' : 'it counts'} during the year` : ''}.`);
      for (const r of dr.filter((x) => x.months_enforcement < 12)) notes.push(`${r._name}'s enforcement figures cover ${r.months_enforcement} months.`);
      for (const r of dr.filter((x) => x.months_incidents != null && x.months_incidents < 12)) notes.push(`${r._name}'s incidents cover ${r.months_incidents} months.`);
      const monthsInc = incidents == null ? null : Math.min(...dr.map((r) => r.months_incidents));
      rows.push({ gss: county.gss, year: y, nation: 'England', incidents, incidents_per_1000: incidents == null || !people ? null : (incidents / people) * 1000,
        rate_calculated: true, actions: sum('actions'), fpns_fly_tipping: sum('fpns_fly_tipping'), prosecutions: sum('prosecutions'),
        reporting_basis: bases.length === 1 ? bases[0] : mixed, months_incidents: monthsInc, months_enforcement: Math.min(...dr.map((r) => r.months_enforcement)),
        summed_from_districts: true, source_url: DEFRA_URL, notes: notes.join(' ') || null, _slug: county.slug, _name: county.name, _districts: ds.length });
    }
  }

  // 4. Wales
  for (const w of wales.values()) {
    const c = byGss.get(w.gss);
    if (!c) { problems.push(`StatsWales row for a council we do not hold: ${w.gss} ${w.name}`); continue; }
    const p = pop.get(w.gss)?.[POP_COLUMN[w.year]];
    if (!p) fail(`no ONS population for ${w.gss}`);
    rows.push({ gss: w.gss, year: w.year, nation: 'Wales', incidents: w.incidents ?? null, incidents_per_1000: w.incidents == null ? null : (w.incidents / p) * 1000,
      rate_calculated: true, actions: w.actions ?? null, fpns_fly_tipping: w.fpns ?? null, prosecutions: w.prosecutions ?? null,
      reporting_basis: null, months_incidents: w.incidents == null ? null : 12, months_enforcement: 12, summed_from_districts: false, source_url: WALES_URL,
      notes: w.revised.length ? `StatsWales marks ${w.revised.join(', ').toLowerCase()} as revised.` : null, _slug: c.slug, _name: c.name });
  }

  // ---------- report ----------
  console.log(`Fly-tipping: dry run${arg('sql') ? ' (writing SQL)' : ''}\n`);
  console.log(`StatsWales downloaded: ${wd.file}, ${wd.bytes.toLocaleString('en-GB')} bytes.`);
  console.log(`Rate method checked against ${checked} Defra rates: largest difference ${worst.toExponential(2)} per 1,000.`);
  const nations = { England: all.filter((c) => c.country === 'England'), Wales: all.filter((c) => c.country === 'Wales'),
    Scotland: all.filter((c) => c.country === 'Scotland'), 'Northern Ireland': all.filter((c) => c.country === 'Northern Ireland') };
  for (const [n, cs] of Object.entries(nations)) {
    const line = YEARS.map((y) => {
      const rs = rows.filter((r) => r.nation === n && r.year === y);
      return `${y}: ${rs.length} rows, ${rs.filter((r) => r.incidents != null).length} with incidents${n === 'England' ? `, ${rs.filter((r) => r.summed_from_districts).length} county sums` : ''}`;
    }).join('; ');
    console.log(`  ${n}: ${new Set(rows.filter((r) => r.nation === n).map((r) => r.gss)).size} of ${cs.length} councils. ${rows.some((r) => r.nation === n) ? line : 'No official council figures.'}`);
  }
  console.log(`  Rows in all: ${rows.length}`);
  if (problems.length) { console.log(`\nPROBLEMS (${problems.length})`); problems.forEach((p) => console.log(`  ${p}`)); }
  console.log(`\nNOTES CARRIED (${rows.filter((r) => r.notes).length} rows)`);
  for (const r of rows.filter((x) => x.notes)) console.log(`  ${r._name} ${r.year}: ${r.notes}`);

  const show = arg('show').split(',').filter(Boolean);
  if (show.length) {
    // the page's own wording (lib/fly-tipping.ts)
    let lib = null;
    try { lib = require('../lib/fly-tipping.ts'); } catch (e) { console.log(`\n(page draft not printed: run with node --experimental-strip-types; ${e.message.split('\n')[0]})`); }
    if (lib) {
      console.log('\nPAGE DRAFT');
      for (const s of show) {
        const c = all.find((x) => x.slug === s);
        if (!c) { console.log(`\n${s}: not a council slug`); continue; }
        console.log(`\n${c.name} (${c.slug}, ${c.type}, ${c.country})`);
        const none = lib.noFlyTippingFigures(c.country);
        if (none) { console.log(`  ${none}`); continue; }
        const v = lib.flyTippingView(rows.filter((r) => r.gss === c.gss));
        if (!v) { console.log('  (no rows: section not shown)'); continue; }
        for (const l of v.lines) console.log(`  ${l.label}: ${l.value}${l.sub ? `\n      ${l.sub}` : ''}`);
        for (const n of v.notes) console.log(`  Note: ${n}`);
        console.log(`  ${v.source}`);
      }
    }
  }
  if (arg('tsv')) fs.writeFileSync(arg('tsv'), ['slug\tgss\tyear\tnation\tincidents\tper_1000\trate_calculated\tactions\tfpns\tprosecutions\tbasis\tmonths_inc\tmonths_enf\tcounty_sum\tnotes',
    ...rows.map((r) => [r._slug, r.gss, r.year, r.nation, r.incidents, r.incidents_per_1000, r.rate_calculated, r.actions, r.fpns_fly_tipping, r.prosecutions,
      r.reporting_basis, r.months_incidents, r.months_enforcement, r.summed_from_districts, r.notes].map((v) => v ?? '').join('\t'))].join('\n') + '\n');

  const SQL = arg('sql');
  if (SQL) {
    const tag = arg('sql-tag');
    if (!/^[a-z0-9_]+$/.test(tag)) fail('give --sql-tag=<backup table suffix>, e.g. 20261019q');
    const q = (v) => (v == null ? 'NULL' : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
    const cols = ['gss', 'year', 'nation', 'incidents', 'incidents_per_1000', 'rate_calculated', 'actions', 'fpns_fly_tipping', 'prosecutions',
      'reporting_basis', 'months_incidents', 'months_enforcement', 'summed_from_districts', 'source_url', 'notes'];
    const yrs = YEARS.map(q).join(', ');
    const L = [`-- Fly-tipping ${YEARS.join(' and ')}: ${rows.length} rows (England and Wales)`, '-- written by scripts/import-fly-tipping.js --sql',
      '\\set ON_ERROR_STOP on', 'BEGIN;', '',
      `CREATE TABLE public.council_fly_tipping_backup_${tag} AS SELECT * FROM public.council_fly_tipping WHERE year IN (${yrs});`,
      `DELETE FROM public.council_fly_tipping WHERE year IN (${yrs});`,
      `INSERT INTO public.council_fly_tipping (${cols.join(', ')}) VALUES`,
      rows.map((r) => `  (${cols.map((k) => q(r[k])).join(', ')})`).join(',\n') + ';', '',
      'DO $$', 'DECLARE n int;', 'BEGIN',
      ...Object.keys(nations).filter((n) => rows.some((r) => r.nation === n)).flatMap((n) => {
        const k = rows.filter((r) => r.nation === n).length;
        return [`  SELECT count(*) INTO n FROM public.council_fly_tipping WHERE nation = ${q(n)} AND year IN (${yrs});`,
          `  IF n <> ${k} THEN RAISE EXCEPTION 'expected ${k} ${n} rows, found %', n; END IF;`];
      }),
      `  SELECT count(*) INTO n FROM public.council_fly_tipping WHERE summed_from_districts;`,
      `  IF n <> ${rows.filter((r) => r.summed_from_districts).length} THEN RAISE EXCEPTION 'expected ${rows.filter((r) => r.summed_from_districts).length} county rows, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.council_fly_tipping f WHERE year IN (${yrs}) AND NOT EXISTS (SELECT 1 FROM public.councils c WHERE c.gss_code = f.gss);`,
      `  IF n <> 0 THEN RAISE EXCEPTION '% rows for councils not in councils', n; END IF;`,
      'END $$;', '',
      'SELECT nation, year, count(*), count(incidents) AS with_incidents, sum(incidents) FILTER (WHERE NOT summed_from_districts) AS incidents FROM public.council_fly_tipping GROUP BY 1, 2 ORDER BY 1, 2;',
      '', 'COMMIT;', ''];
    fs.writeFileSync(SQL, L.join('\n'));
    console.log(`\nSQL written to ${SQL} (not run).`);
  }
})();
