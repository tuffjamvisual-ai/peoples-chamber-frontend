// Builds the council_audit_opinions migration (Cowork ENTRY 755 item 2 and ENTRY 756) from one PSAA monthly opinion workbook.
//   node scripts/councils/build-psaa-audit-migration.mjs <workbook.xlsx> <councils.tsv: slug, name, type, gss> <manifest.tsv> <out.sql>
// PSAA gives, per body and accounts year, the audit firm, a status and the date the opinion was signed. It does not give the
// type of opinion, so nothing here stores or infers one. English councils only, matched by name (one alias, Hull); every
// English council in councils.tsv must match exactly one PSAA row a year, or have none, which is listed and stops the build.
import fs from 'node:fs';
import XLSX from 'xlsx';
XLSX.set_fs(fs);

const [file, ctsv, manifest, out] = process.argv.slice(2);
if (!out) { console.error('usage: <workbook> <councils.tsv> <manifest.tsv> <out.sql>'); process.exit(2); }
const YEARS = ['2025-2026', '2024-2025', '2023-2024'];
const STATUSES = new Set(['Unsigned', 'Delivered by backstop', 'Post backstop opinion delivered', 'Late Opinion Delivered', 'Delivered On Time']);
const ALIAS = new Map([['kingston upon hull', 'hull']]);
const NOT_PSAA = new Set(['city-of-london-corporation']);

const norm = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z ]/g, ' ')
  .replace(/\b(the|council|of|city|county|borough|district|metropolitan|royal|london|mbc)\b/g, ' ').replace(/\s+/g, ' ').trim();
const councils = fs.readFileSync(ctsv, 'utf8').trim().split('\n').map((l) => l.split('\t'))
  .map(([slug, name, type, gss]) => ({ slug, name, type, gss })).filter((c) => /^E\d{8}$/.test(c.gss));
const bySlug = new Map(councils.map((c) => [c.slug, c]));
const byName = new Map(); for (const c of councils) byName.set(norm(c.name), [...(byName.get(norm(c.name)) || []), c]);

const base = file.split('/').pop();
const mrow = fs.readFileSync(manifest, 'utf8').split('\n').map((l) => l.split('\t')).find((r) => r[0] && r[0].endsWith('/' + base));
if (!mrow) throw new Error(`${base} is not in the manifest`);
const sourceUrl = mrow[3];
if (!/^https:\/\/www\.psaa\.co\.uk\/wp-content\/uploads\//.test(sourceUrl)) throw new Error(`unexpected source ${sourceUrl}`);
const monthEnd = (() => {
  const m = /Opinion-data-detailed-(\d{1,2})([A-Za-z]+)(\d{4})/.exec(base);
  const d = new Date(`${m[1]} ${m[2]} ${m[3]} 12:00 UTC`); if (Number.isNaN(+d)) throw new Error(`no month in ${base}`);
  return d.toISOString().slice(0, 10);
})();

const wb = XLSX.readFile(file);
const serialDay = (v) => { if (typeof v !== 'number') return null; const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000); return d.toISOString().slice(0, 10); };
const rows = [], problems = [];
for (const year of YEARS) {
  const sheet = wb.Sheets[year]; if (!sheet) { problems.push(`no sheet ${year}`); continue; }
  const got = new Map();
  for (const r of XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1)) {
    if (!r[1]) continue;
    const key = norm(r[1]); const alias = ALIAS.get(key);
    const m = alias ? [bySlug.get(alias)] : byName.get(key);
    if (!m) continue;
    if (m.length !== 1) { problems.push(`${year}: ${r[1]} matches ${m.length} councils`); continue; }
    const c = m[0];
    if (got.has(c.slug)) { problems.push(`${year}: ${c.slug} twice`); continue; }
    const status = String(r[4]).trim();
    if (!STATUSES.has(status)) { problems.push(`${year}: ${r[1]} has status ${JSON.stringify(status)}`); continue; }
    const signed = serialDay(r[5]);
    if (status === 'Unsigned' ? signed !== null : signed === null) { problems.push(`${year}: ${r[1]} status ${status} with date ${r[5]}`); continue; }
    got.set(c.slug, true);
    rows.push({ gss: c.gss, slug: c.slug, year: year.slice(0, 5) + year.slice(7), firm: String(r[2]).trim(), status, signed, psaaName: String(r[1]).trim() });
  }
  const missing = councils.filter((c) => !got.has(c.slug) && !NOT_PSAA.has(c.slug)).map((c) => c.slug);
  if (missing.length) problems.push(`${year}: English councils with no PSAA row: ${missing.join(', ')}`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(3); }

const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const values = rows.map((r) => `  (${q(r.gss)}, ${q(r.year)}, ${q(r.status)}, ${r.signed ? q(r.signed) + '::date' : 'NULL'}, ${q(r.firm)}, ${q(r.psaaName)}, ${q(monthEnd)}::date, ${q(sourceUrl)})`).join(',\n');
const sql = `-- PSAA monthly audit opinion data by English council (Cowork ENTRY 755 item 2, ENTRY 756; built by
-- scripts/councils/build-psaa-audit-migration.mjs from ${base}, month end ${monthEnd}).
-- One row per council per accounts year (${YEARS.join(', ')}): the audit firm, PSAA's status as published, and the date the
-- opinion was signed (NULL when Unsigned). PSAA does not give the type of opinion; this table holds none.
-- Source: Public Sector Audit Appointments, ${sourceUrl} (non commercial re-use with acknowledgement, psaa.co.uk/legal).
\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF to_regclass('public.council_audit_opinions') IS NOT NULL THEN RAISE EXCEPTION 'council_audit_opinions already exists'; END IF;
END $$;

CREATE TABLE public.council_audit_opinions (
  gss           text NOT NULL CHECK (gss ~ '^E\\d{8}$'),
  year          text NOT NULL CHECK (year ~ '^20\\d{2}-\\d{2}$'),
  status        text NOT NULL CHECK (status IN (${[...STATUSES].map(q).join(', ')})),
  signed_date   date CHECK ((status = 'Unsigned') = (signed_date IS NULL)),
  firm          text NOT NULL,
  psaa_name     text NOT NULL,
  source_month  date NOT NULL,
  source_url    text NOT NULL CHECK (source_url ~ '^https://www\\.psaa\\.co\\.uk/'),
  imported_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gss, year)
);
COMMENT ON TABLE public.council_audit_opinions IS
  'PSAA monthly audit opinion data: firm, status and signed date by English council and accounts year; no opinion type (migration 2026-11-26a)';

ALTER TABLE public.council_audit_opinions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_audit_opinions FROM anon, authenticated;
GRANT SELECT ON public.council_audit_opinions TO anon, authenticated;
CREATE POLICY council_audit_opinions_public_read ON public.council_audit_opinions FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.council_audit_opinions (gss, year, status, signed_date, firm, psaa_name, source_month, source_url) VALUES
${values};

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.council_audit_opinions; IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;
  SELECT count(*) INTO n FROM public.council_audit_opinions a LEFT JOIN public.councils c ON c.gss_code = a.gss WHERE c.gss_code IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION '% rows name no council', n; END IF;
  IF has_table_privilege('anon', 'public.council_audit_opinions', 'INSERT') OR has_table_privilege('anon', 'public.council_audit_opinions', 'UPDATE')
     OR has_table_privilege('anon', 'public.council_audit_opinions', 'DELETE') THEN RAISE EXCEPTION 'anon must only read'; END IF;
END $$;

COMMIT;
`;
fs.writeFileSync(out, sql);
fs.writeFileSync(out.replace(/\.sql$/, '-UNDO.sql'), `-- UNDO of ${out.split('/').pop()}: the table is new, so dropping it puts everything back.\n\\set ON_ERROR_STOP on\nBEGIN;\nSET LOCAL lock_timeout = '5s';\nDROP TABLE public.council_audit_opinions;\nCOMMIT;\n`);
const by = {}; for (const r of rows) by[r.year + ' ' + r.status] = (by[r.year + ' ' + r.status] || 0) + 1;
console.log(JSON.stringify({ rows: rows.length, monthEnd, sourceUrl, by }, null, 1));
