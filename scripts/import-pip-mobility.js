#!/usr/bin/env node
// PIP mobility awards by council, England and Wales, into council_pip_mobility (migration 2026-10-21t).
// John's decisions, 21 Oct 2026.
//
// DRY RUN BY DEFAULT: one Stat-Xplore table query, then the report; writes nothing. --sql=file.sql writes one guarded
// transaction that replaces the rows for the months loaded (backing up any already there) and checks exact counts.
//
// Source: DWP Stat-Xplore, database PIP_Monthly_new ("PIP Cases with Entitlement from 2019"), field "National -
// Regional - LA - OAs" at its "Local Authority" level (V_C_MASTERGEOG21_LA_TO_REGION, values are GSS codes), by
// Mobility Award Status (enhanced, standard, nil). The API key comes from .env.local (STAT_XPLORE_API_KEY).
//
// Rules:
//   - Every England and Wales council in councils except county councils is asked for by its GSS code; the run stops
//     unless Stat-Xplore returns every one.
//   - County councils are not a Stat-Xplore geography: each is the sum of its districts (councils.parent_slug, the
//     hand-written mapping of 3 Jun 2026), derived_from_districts = true, with the district codes used. The run stops
//     unless every district has exactly one county and every county at least one district.
//
// Usage:
//   node scripts/import-pip-mobility.js                                   # July 2025 and July 2026, dry run
//   node scripts/import-pip-mobility.js --months=202507,202607 --sql=scripts/migrations/2026-10-21u-council-pip-mobility-load.sql

require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(`STOPPED: ${m}`); process.exit(1); };
const MONTHS = arg('months', '202507,202607').split(',');
for (const m of MONTHS) if (!/^20\d\d(0[1-9]|1[0-2])$/.test(m)) fail(`not a month like 202607: ${m}`);
const SQL_FILE = arg('sql');

const KEY = process.env.STAT_XPLORE_API_KEY;
if (!KEY) fail('STAT_XPLORE_API_KEY not set (.env.local)');
const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const SOURCE_URL = 'https://stat-xplore.dwp.gov.uk/';
const DB = 'str:database:PIP_Monthly_new';
const COUNT = 'str:count:PIP_Monthly_new:V_F_PIP_MONTHLY';
const GEO = 'str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:COA_CODE';
const LA = 'str:value:PIP_Monthly_new:V_F_PIP_MONTHLY:COA_CODE:V_C_MASTERGEOG21_LA_TO_REGION:';
const MONTH = 'str:field:PIP_Monthly_new:F_PIP_DATE:DATE2';
const MONTH_V = 'str:value:PIP_Monthly_new:F_PIP_DATE:DATE2:C_PIP_DATE:';
const MOB = 'str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:MOB_AWARD_TYPE';
const MOB_V = 'str:value:PIP_Monthly_new:V_F_PIP_MONTHLY:MOB_AWARD_TYPE:C_PIP_MOB_AWARD_TYPE:';
const AWARDS = [['enhanced', '1'], ['standard', '2'], ['nil', '3']];

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const period = (m) => `${m.slice(0, 4)}-${m.slice(4)}-01`;
const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

(async () => {
  const { data: councils, error } = await db.from('councils').select('slug, name, type, country, gss_code, parent_slug').in('country', ['England', 'Wales']).order('gss_code');
  if (error) fail(error.message);
  const counties = councils.filter((c) => c.type === 'county');
  const asked = councils.filter((c) => c.type !== 'county');
  const bySlug = new Map(councils.map((c) => [c.slug, c]));

  // The district-to-county mapping must be complete and one-to-one.
  const districtsOf = new Map(counties.map((c) => [c.slug, []]));
  for (const d of councils.filter((c) => c.type === 'district')) {
    const parent = bySlug.get(d.parent_slug);
    if (!parent || parent.type !== 'county') fail(`district ${d.name} (${d.gss_code}) has no county`);
    districtsOf.get(parent.slug).push(d);
  }
  const others = councils.filter((c) => c.type !== 'district' && c.parent_slug && bySlug.get(c.parent_slug)?.type === 'county');
  if (others.length) fail(`non-district councils under a county: ${others.map((c) => c.name).join(', ')}`);
  for (const [slug, ds] of districtsOf) if (!ds.length) fail(`county ${slug} has no districts`);

  const body = {
    database: DB, measures: [COUNT],
    recodes: {
      [GEO]: { map: asked.map((c) => [LA + c.gss_code]), total: false },
      [MONTH]: { map: MONTHS.map((m) => [MONTH_V + m]), total: false },
      [MOB]: { map: AWARDS.map(([, v]) => [MOB_V + v]), total: false },
    },
    dimensions: [[GEO], [MONTH], [MOB]],
  };
  const res = await fetch(`${BASE}/table`, { method: 'POST', headers: { APIKey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) fail(`Stat-Xplore HTTP ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const values = json.cubes[COUNT].values;
  const geoItems = json.fields[0].items.map((it) => String(it.uris[0]).split(':').pop());
  const monthItems = json.fields[1].items.map((it) => String(it.uris[0]).split(':').pop());
  if (geoItems.length !== asked.length) fail(`Stat-Xplore returned ${geoItems.length} of ${asked.length} councils`);
  if (monthItems.join() !== MONTHS.join()) fail(`months returned ${monthItems.join()} not ${MONTHS.join()}`);

  const rows = [];
  const counts = new Map(); // gss|month -> {enhanced, standard, nil}
  geoItems.forEach((gss, gi) => MONTHS.forEach((m, mi) => {
    const v = Object.fromEntries(AWARDS.map(([k], ai) => [k, values[gi][mi][ai]]));
    for (const k of Object.keys(v)) if (!Number.isInteger(v[k]) || v[k] < 0) fail(`${gss} ${m} ${k}: not a count (${v[k]})`);
    counts.set(`${gss}|${m}`, v);
    const c = asked.find((x) => x.gss_code === gss);
    rows.push({ gss, period: period(m), nation: c.country, ...v, derived: false, districts: null });
  }));
  for (const county of counties) {
    const ds = districtsOf.get(county.slug);
    for (const m of MONTHS) {
      const sum = { enhanced: 0, standard: 0, nil: 0 };
      for (const d of ds) { const v = counts.get(`${d.gss_code}|${m}`); for (const k of Object.keys(sum)) sum[k] += v[k]; }
      rows.push({ gss: county.gss_code, period: period(m), nation: 'England', ...sum, derived: true, districts: ds.map((d) => d.gss_code).sort() });
    }
  }

  const expected = councils.length * MONTHS.length;
  console.log(`councils: ${councils.length} (${asked.length} from Stat-Xplore, ${counties.length} counties from ${[...districtsOf.values()].flat().length} districts); months ${MONTHS.join(', ')}; rows ${rows.length} of ${expected}`);
  const total = (m, k) => rows.filter((r) => r.period === period(m) && !r.derived).reduce((s, r) => s + r[k], 0);
  for (const m of MONTHS) console.log(`  ${m}: enhanced ${total(m, 'enhanced')}, standard ${total(m, 'standard')}, nil ${total(m, 'nil')} (councils other than counties)`);
  for (const slug of arg('show', 'cambridgeshire,cambridge,hartlepool,cardiff').split(',')) {
    const c = bySlug.get(slug) || councils.find((x) => x.slug.startsWith(slug));
    if (!c) continue;
    console.log(`  ${c.name}: ${rows.filter((r) => r.gss === c.gss_code).map((r) => `${r.period.slice(0, 7)} enhanced ${r.enhanced}${r.derived ? ` (sum of ${r.districts.length} districts)` : ''}`).join('; ')}`);
  }
  if (rows.length !== expected) fail(`expected ${expected} rows`);
  if (!SQL_FILE) { console.log('DRY RUN complete. Nothing was written.'); return; }

  const tag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const periods = MONTHS.map((m) => q(period(m))).join(', ');
  const sql = [
    `-- PIP mobility awards by council, ${MONTHS.join(' and ')}: ${rows.length} rows (England and Wales; ${counties.length} counties summed from their districts)`,
    '-- written by scripts/import-pip-mobility.js --sql',
    '\\set ON_ERROR_STOP on',
    'BEGIN;',
    `CREATE TABLE public.council_pip_mobility_backup_${tag} AS SELECT * FROM public.council_pip_mobility WHERE period IN (${periods});`,
    `ALTER TABLE public.council_pip_mobility_backup_${tag} ENABLE ROW LEVEL SECURITY;  -- service role only`,
    `DELETE FROM public.council_pip_mobility WHERE period IN (${periods});`,
    'INSERT INTO public.council_pip_mobility (gss, period, nation, enhanced, standard, nil, derived_from_districts, district_gss, source_url) VALUES',
    rows.map((r) => `  (${q(r.gss)}, ${q(r.period)}, ${q(r.nation)}, ${r.enhanced}, ${r.standard}, ${r.nil}, ${r.derived}, ${r.districts ? `ARRAY[${r.districts.map(q).join(', ')}]` : 'NULL'}, ${q(SOURCE_URL)})`).join(',\n') + ';',
    'DO $$ DECLARE n int; bad int; BEGIN',
    `  SELECT count(*) INTO n FROM public.council_pip_mobility WHERE period IN (${periods});`,
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.council_pip_mobility p JOIN public.councils c ON c.gss_code = p.gss WHERE p.period IN (${periods});`,
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'only % rows match a council', n; END IF;`,
    '  -- every county row equals its districts added up, from the stored rows',
    '  SELECT count(*) INTO bad FROM public.council_pip_mobility p',
    '   CROSS JOIN LATERAL (SELECT sum(d.enhanced)::int AS e, sum(d.standard)::int AS s, sum(d.nil)::int AS n, count(*) AS k FROM public.council_pip_mobility d',
    '          WHERE d.period = p.period AND d.gss = ANY (p.district_gss) AND NOT d.derived_from_districts) t',
    '   WHERE p.derived_from_districts AND p.period IN (' + periods + ')',
    '     AND ((p.enhanced, p.standard, p.nil) IS DISTINCT FROM (t.e, t.s, t.n) OR t.k <> cardinality(p.district_gss));',
    "  IF bad > 0 THEN RAISE EXCEPTION '% county rows do not equal their districts', bad; END IF;",
    `  RAISE NOTICE 'loaded % rows', ${rows.length};`,
    'END $$;',
    'COMMIT;',
    '',
  ].join('\n');
  fs.writeFileSync(SQL_FILE, sql);
  console.log(`SQL written to ${SQL_FILE}. Rehearse with COMMIT changed to ROLLBACK, then apply.`);
})().catch((e) => fail(e.message));
