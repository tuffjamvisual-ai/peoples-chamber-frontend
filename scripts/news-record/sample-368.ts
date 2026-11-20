// ENTRY 368 item 3 (read only): for 50 recent press releases spread across issuing organisations, build the "What the
// record shows" box (lib/news-record-core.ts, the same matching and sentences the page uses) and report whether each
// would qualify for indexing under the proposed rule. Nothing is written to the database: every read is one psql
// session in BEGIN READ ONLY with a 60 second statement timeout, ended by ROLLBACK; one session a second at most.
//   npx tsx scripts/news-record/sample-368.ts <out dir>
// DATABASE_URL is read from .env.local into the child's environment only; it is never printed.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FETCH_MAX, buildNewsRecord, websearchOr, containsPattern, billPatterns, KIND_ORDER, KIND_HEADING, type NewsRecordReader, type Refs, type ReleaseInput, type NewsRecord } from '../../lib/news-record-core';

const OUT = process.argv[2];
if (!OUT) throw new Error('usage: sample-368.ts <out dir>');
fs.mkdirSync(OUT, { recursive: true });
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const DB = (env.match(/^DATABASE_URL=(.*)$/m)?.[1] || '').replace(/^["']|["']$/g, '').trim();
if (!DB) throw new Error('DATABASE_URL missing from .env.local');

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (xs: string[]) => `ARRAY[${xs.map(lit).join(',')}]::text[]`;
let last = 0;
async function session(selects: string[]): Promise<unknown[]> {
  const wait = 1000 - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const sql = ["BEGIN READ ONLY;", "SET LOCAL statement_timeout='60s';", ...selects.map((s) => `SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (${s}) x;`), 'ROLLBACK;'].join('\n');
  const out = execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', DB, '-f', '-'], { input: sql, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'pipe'] });
  return out.split('\n').filter((l) => l.startsWith('[')).map((l) => JSON.parse(l));
}

// The page's queries (lib/news-record.ts), written in SQL.
const Q = {
  questions: (ps: string[]) => `SELECT id, uin, house, heading, date_tabled, date_answered, answering_body, asking_member_id FROM parliament_written_questions WHERE search @@ websearch_to_tsquery('english', ${lit(websearchOr(ps))}) AND heading ILIKE ANY(${arr(ps.map(containsPattern))}) AND is_withdrawn IS NOT TRUE ORDER BY date_tabled DESC, id DESC LIMIT ${FETCH_MAX}`,
  debates: (ps: string[]) => `SELECT hansard_ext_id, title, sitting_date, section, house FROM debates WHERE title ILIKE ANY(${arr(ps.map(containsPattern))}) ORDER BY sitting_date DESC, id DESC LIMIT ${FETCH_MAX}`,
  edms: (ps: string[]) => `SELECT id, uin_with_suffix, uin, title, date_tabled, signature_count FROM early_day_motions WHERE title ILIKE ANY(${arr(ps.map(containsPattern))}) ORDER BY date_tabled DESC, id DESC LIMIT ${FETCH_MAX}`,
  bills: (cs: string[]) => `SELECT id, title, is_act, current_stage, originating_house, status FROM bill WHERE hidden_reason IS NULL AND title ILIKE ANY(${arr(billPatterns(cs))}) ORDER BY last_update DESC NULLS LAST LIMIT 13`,
  divisions: (ps: string[]) => `SELECT f.division_date_only::text AS date, f.division_number AS number, f.division_title AS title, t.aye_count AS ayes, t.no_count AS noes FROM (SELECT division_date_only, division_number, division_title FROM commons_divisions_fts WHERE search_vec @@ websearch_to_tsquery('english', ${lit(websearchOr(ps))}) ORDER BY division_date_only DESC, division_number DESC LIMIT ${FETCH_MAX}) f LEFT JOIN commons_division_totals t ON t.division_date = f.division_date_only AND t.division_number = f.division_number ORDER BY 1 DESC, 2 DESC`,
};

// One psql session per release, all five reads in it: the reader collects the queries, runs them once, then answers.
function batchReader(): { reader: NewsRecordReader; run: () => Promise<void> } {
  const want: { key: keyof typeof Q; arg: string[]; resolve: (v: never[]) => void }[] = [];
  const mk = (key: keyof typeof Q) => (arg: string[]) => new Promise<never[]>((resolve) => want.push({ key, arg, resolve }));
  return {
    reader: { questions: mk('questions'), debates: mk('debates'), edms: mk('edms'), bills: mk('bills'), divisions: mk('divisions') } as unknown as NewsRecordReader,
    run: async () => {
      if (!want.length) return;
      const res = await session(want.map((w) => Q[w.key](w.arg)));
      want.forEach((w, i) => w.resolve(res[i] as never[]));
    },
  };
}

async function main() {
  const [councils, seats, mps, orgs] = await session([
    'SELECT slug, name, short_name, type_label, population, council_tax_band_d_pounds, political_control FROM councils',
    'SELECT slug, name, ons_code FROM constituencies',
    'SELECT member_id, name, display_name, party, constituency, constituency_gss_code, current_member FROM mps',
    'SELECT slug, name, name_variants, contracts, contract_value, grants, grant_value FROM organisation_index WHERE contracts > 0 OR grants > 0',
  ]);
  const refs = { councils, seats, mps, orgs } as Refs;
  // 50 recent releases: each organisation's newest first (round robin), so the sample spreads across issuers.
  const [releases] = await session([`SELECT id, title, description, organisation, body, news_slug, published_at FROM (
      SELECT id, title, description, organisation, body, news_slug, published_at, row_number() OVER (PARTITION BY organisation ORDER BY published_at DESC, id DESC) AS rn
      FROM press_releases WHERE news_slug IS NOT NULL AND body IS NOT NULL AND removed_upstream IS NOT TRUE AND published_at > now() - interval '30 days') r
    WHERE rn <= 3 ORDER BY rn, published_at DESC, id DESC LIMIT 50`]) as [(ReleaseInput & { news_slug: string; published_at: string })[]];

  const results: (NewsRecord & { slug: string; organisation: string | null; title: string; published_at: string })[] = [];
  for (const r of releases) {
    const { reader, run } = batchReader();
    const p = buildNewsRecord(r, refs, reader);
    await new Promise((res) => setImmediate(res)); // let buildNewsRecord queue its reads
    await run();
    const rec = await p;
    results.push({ ...rec, slug: r.news_slug, organisation: r.organisation, title: r.title, published_at: r.published_at });
    process.stdout.write(`${rec.qualifies ? 'Y' : '.'}`);
  }
  process.stdout.write('\n');
  fs.writeFileSync(path.join(OUT, 'sample.json'), JSON.stringify(results, null, 1));

  // Report.
  const q = results.filter((r) => r.qualifies);
  const byOrg = new Map<string, { n: number; yes: number; strict: number }>();
  for (const r of results) { const k = r.organisation || '(none)'; const v = byOrg.get(k) ?? { n: 0, yes: 0, strict: 0 }; v.n++; if (r.qualifies) v.yes++; if (r.qualifiesStrict) v.strict++; byOrg.set(k, v); }
  const kindTotals = Object.fromEntries(KIND_ORDER.map((k) => [k, results.filter((r) => r.kinds.includes(k)).length]));
  const L: string[] = [];
  L.push('# ENTRY 368: "What the record shows" on press releases, sample of 50 (read only)', '');
  L.push(`Built ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })} GMT from the production database, read only (BEGIN READ ONLY; ROLLBACK). Nothing written. Not live.`, '');
  L.push('Rule tested (proposal, not switched on): index only if the box has at least 3 distinct linked items, of at least 2 different kinds, and at least 150 words of its own text (item titles and lines; the fixed heading is not counted).', '');
  L.push('## Totals', '');
  L.push(`- Releases sampled: ${results.length} (each issuing organisation's newest first, published in the last 30 days, then their second and third)`);
  L.push(`- Would qualify: **${q.length} of ${results.length}**`);
  L.push(`- Would qualify if the department budget line is not counted (it is the same on every release from that department): **${results.filter((r) => r.qualifiesStrict).length} of ${results.length}**`);
  L.push(`- Releases with no item at all: ${results.filter((r) => !r.items.length).length}`);
  L.push(`- Releases with each kind of item: ${KIND_ORDER.map((k) => `${KIND_HEADING[k]} ${kindTotals[k]}`).join('; ')}`, '');
  L.push('| Organisation | Sampled | Qualify | Qualify without budget line |', '|---|---|---|---|');
  for (const [k, v] of [...byOrg.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))) L.push(`| ${k} | ${v.n} | ${v.yes} | ${v.strict} |`);
  L.push('', '## Per release', '');
  for (const r of results) {
    const by = KIND_ORDER.filter((k) => r.kinds.includes(k)).map((k) => `${KIND_HEADING[k]} ${r.items.filter((i) => i.kind === k).length}`).join(', ') || 'none';
    L.push(`### ${r.slug}`, '');
    L.push(`- Organisation: ${r.organisation} · ${String(r.published_at).slice(0, 10)}`);
    L.push(`- Title: ${r.title}`);
    L.push(`- Names found: bills ${JSON.stringify(r.names.bills)}; named ${JSON.stringify(r.names.phrases.slice(0, 8))}; councils ${JSON.stringify(r.names.councils.map((c) => c.name))}; constituencies ${JSON.stringify(r.names.seats.map((s) => s.name))}; organisations ${JSON.stringify(r.names.orgs.map((o) => o.name))}`);
    L.push(`- Items by kind: ${by} (total ${r.items.length})`);
    L.push(`- Words: ${r.words}`);
    L.push(`- Qualifies: **${r.why}**${r.qualifies && !r.qualifiesStrict ? ' (not without the budget line)' : ''}`);
    for (const i of r.items) L.push(`  - [${i.kind}] ${i.label} (${i.href}) matched on "${i.matchedOn}"`);
    L.push('');
  }
  fs.writeFileSync(path.join(OUT, 'SAMPLE.md'), L.join('\n'));
  console.log(`qualify ${q.length}/${results.length}; strict ${results.filter((r) => r.qualifiesStrict).length}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
