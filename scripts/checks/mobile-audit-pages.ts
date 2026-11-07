// Page list for the mobile audit (owner, 4 Nov 2026): every route in app/ except admin, API, test and always noindex
// pages. A dynamic route gets three real examples from the database (or, where the list is only built on a page, from
// that parent page on the running site): one typical, one with the most data, one with little or none.
//   npx tsx scripts/checks/mobile-audit-pages.ts --base http://localhost:3100 [--extra-out <file.csv>]
// Writes scripts/checks/mobile-audit-pages.csv (route, example URL, why chosen). Reads only: one BEGIN READ ONLY transaction.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import dotenv from 'dotenv';
import { donorPageSlug } from '../../lib/donor-slug';
import { topics } from '../../lib/topics';
import { SECTION_PAGES } from '../../lib/site-nav';

dotenv.config({ path: '.env.local', quiet: true });
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : null; };
const BASE = arg('base') ?? 'http://localhost:3100';

const EXCLUDED: Record<string, string> = {
  '/admin/users': 'admin', '/internal/humaniser': 'admin',
  '/blank-landing': 'test', '/folder-bg': 'test', '/homepage-v2': 'test', '/land101': 'test', '/landing-demo': 'test', '/landing-demo2': 'test',
  '/landing-pca': 'test', '/landing-preview': 'test', '/landing1012': 'test', '/mp121': 'test', '/new2': 'test', '/newpage': 'test',
  '/newspaper-101': 'test', '/newspaper-112': 'test', '/newspaper-blank': 'test', '/newspaper-demo': 'test', '/newspaper-new1': 'test',
  '/newspaper-preview': 'test', '/preview': 'test', '/preview-2': 'test', '/preview-3': 'test', '/preview-4': 'test', '/preview-5': 'test',
  '/preview-footer': 'test', '/preview-home2': 'test', '/preview-home2/[id]': 'test', '/template': 'test', '/unite-kingdom': 'test',
  '/preview/briefings/[slug]': 'private', '/preview/briefings/[slug]/sources': 'private', '/preview/editorials/[slug]': 'private', '/preview/editorials/[slug]/sources': 'private', '/preview/programmes/[slug]': 'private',
  '/login': 'noindex', '/reset-password': 'noindex', '/preferences': 'noindex', '/feedback': 'noindex', '/tools/welfare/search': 'noindex',
  '/councils/league-table': 'noindex', '/your-tax-pound': 'noindex (hidden)', '/budget-trade-offs': 'noindex (hidden)', '/news/[slug]': 'noindex',
  '/mps/[id]/questions': 'noindex', '/mps/[id]/reports': 'noindex', '/lords/[id]/questions': 'noindex', '/editorials/[slug]/sources': 'noindex',
  '/briefings/[slug]/sources': 'noindex', '/councils/[slug]/panel/[tab]': 'noindex',
};

function routes(dir = 'app', out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'api') routes(p, out);
    else if (e.name === 'page.tsx') out.push(dir === 'app' ? '/' : dir.slice(3).replace(/\\/g, '/'));
  }
  return out;
}

const WINDOW = (sql: string) => `(SELECT jsonb_agg(t) FROM (SELECT key, m FROM (${sql}) q WHERE key IS NOT NULL ORDER BY m DESC NULLS LAST, key) t)`;
// key, m (how much data): the highest m is "most data", the middle is typical, the lowest is "little".
const QUERIES: Record<string, string> = {
  mp: `SELECT m.member_id::text key, (SELECT count(*) FROM mp_registered_interests r WHERE r.member_id = m.member_id) m FROM mps m WHERE m.current_member`,
  peer: `SELECT member_id::text key, length(coalesce(government_posts::text,''))+length(coalesce(committee_memberships::text,''))+length(coalesce(other_posts::text,'')) m FROM peers WHERE is_current`,
  bill: `SELECT id::text key, length(coalesce(long_title,''))+coalesce(vote_count_yes,0)+coalesce(vote_count_no,0) m FROM bill WHERE hidden_reason IS NULL`,
  briefing: `SELECT slug key, length(coalesce(body::text,'')) m FROM briefings WHERE is_published`,
  committee: `SELECT id::text key, length(coalesce(name,''))+length(coalesce(purpose,'')) m FROM committees WHERE end_date IS NULL`,
  contract: `SELECT ocid key, count(*) m FROM contract_notices WHERE ocid IS NOT NULL GROUP BY ocid`,
  council: `SELECT slug key, coalesce(population,0) m FROM councils`,
  educationCouncil: `SELECT slug key, coalesce(population,0) m FROM councils WHERE gss_code LIKE 'E%' AND type <> 'district'`,
  coverage: `SELECT id::text key, length(coalesce(commentary,'')) m FROM uk_political_news WHERE is_published`,
  debate_longest: `SELECT debate_ext_id key, count(*) m FROM hansard_contributions WHERE removed_at IS NULL GROUP BY 1`,
  debate: `SELECT hansard_ext_id key, length(coalesce(summary,'')) m FROM debates WHERE sitting_date > date '2025-01-01'`,
  division: `SELECT to_char(division_date,'YYYY-MM-DD')||'|'||division_number key, coalesce(aye_count,0)+coalesce(no_count,0) m FROM commons_division_totals`,
  donor: `SELECT donor_name key, count(*) m FROM political_donations WHERE donor_name IS NOT NULL GROUP BY donor_name`,
  editorial: `SELECT slug key, length(coalesce(body_text,'')) m FROM editorials WHERE NOT coalesce(unpublished,false) AND kind IS DISTINCT FROM 'briefing'`,
  lobby: `SELECT slug key, meetings m FROM organisation_index WHERE kind='registry'`,
  org: `SELECT slug key, coalesce(donations,0)+coalesce(contracts,0)+coalesce(grants,0)+coalesce(meetings,0) m FROM organisation_index`,
  orgContracts: `SELECT slug key, contracts m FROM organisation_index WHERE contracts > 0`,
  person: `SELECT slug key, length(coalesce(biography,''))+length(coalesce(political_bio,''))+length(coalesce(current_roles::text,'')) m FROM person_cache`,
  agency: `SELECT slug key, length(coalesce(body,''))+length(coalesce(description,'')) m FROM agency_cache`,
  rec: `SELECT r.session||'/'||r.report_number||'/'||c.rec_number key, length(coalesce(c.recommendation_text,'')) m FROM pac_recommendations c JOIN pac_reports r ON r.id=c.report_id`,
  treaty: `SELECT api_id::text key, length(coalesce(timeline::text,''))+length(coalesce(title,'')) m FROM treaties`,
  constituency: `SELECT constituency_gss_code key, length(coalesce(constituency,'')) m FROM mps WHERE current_member AND constituency_gss_code IS NOT NULL`,
  la: `SELECT council_gss_code key, count(*) m FROM welfare_local_authority_metrics GROUP BY council_gss_code`,
  project: `SELECT project_key key, length(coalesce(cost_narrative,''))+length(coalesce(schedule_narrative,''))+length(coalesce(rating_narrative,'')) m FROM major_projects`,
};

type Row = { key: string; m: number | string };
function readAll(): Record<string, Row[]> {
  const out: Record<string, Row[]> = {};
  for (const [name, sql] of Object.entries(QUERIES)) {
    const text = `BEGIN READ ONLY; SET LOCAL statement_timeout='60s'; SET LOCAL lock_timeout='5s';\nSELECT ${WINDOW(sql)};\nROLLBACK;`;
    try {
      const res = execFileSync('psql', [process.env.DATABASE_URL as string, '-X', '-q', '-At', '-c', text], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
      const line = res.split('\n').find((l) => l.startsWith('[')) ?? '[]';
      out[name] = JSON.parse(line);
    } catch (e) {
      console.error(`${name}: ${String((e as Error).message).replace(process.env.DATABASE_URL as string, '<db>').slice(0, 200)}`);
      out[name] = [];
    }
  }
  return out;
}

const three = <T,>(rows: T[]): [T, string][] => {
  if (!rows.length) return [];
  const picks: [T, string][] = [[rows[Math.floor(rows.length / 2)], 'typical (middle of the list)'], [rows[0], 'most data'], [rows[rows.length - 1], 'little or no data']];
  const seen = new Set<T>();
  return picks.filter(([r]) => (seen.has(r) ? false : (seen.add(r), true)));
};

async function linksFrom(parent: string, re: RegExp): Promise<string[]> {
  const html = await (await fetch(BASE + parent)).text();
  return [...new Set([...html.matchAll(/href="([^"#?]+)"/g)].map((m) => m[1]).filter((h) => re.test(h)))];
}

(async () => {
  const data = readAll();
  const rows: [string, string, string][] = [];
  const add = (route: string, url: string, why: string) => rows.push([route, url, why]);
  const fromDb = (route: string, q: string, url: (k: string) => string | null) => {
    const list = data[q].map((r) => ({ ...r, url: url(r.key) })).filter((r) => r.url);
    if (!list.length) add(route, '', `NO EXAMPLE: query ${q} returned nothing`);
    for (const [r, why] of three(list)) add(route, r.url as string, `${why}, measure ${r.m}`);
  };
  const fromList = (route: string, list: string[], source: string) => {
    if (!list.length) add(route, '', `NO EXAMPLE: nothing listed on ${source}`);
    for (const [u, why] of three(list)) add(route, u, `${why}, from ${source}`);
  };

  const all = routes().sort();
  const excluded = all.filter((r) => EXCLUDED[r]);
  for (const r of all.filter((x) => !EXCLUDED[x] && !x.includes('['))) add(r, r, 'the only page of this route');

  fromDb('/mps/[id]', 'mp', (k) => `/mps/${k}`);
  fromDb('/lords/[id]', 'peer', (k) => `/lords/${k}`);
  fromDb('/bills/[id]', 'bill', (k) => `/bills/${k}`);
  fromDb('/bills/[id]/full', 'bill', (k) => `/bills/${k}/full`);
  fromList('/bills/page/[page]', ['/bills/page/2', '/bills/page/3'], 'the /bills pager');
  fromList('/bills/sessions/[id]', await linksFrom('/bills/sessions', /^\/bills\/sessions\/\d+$/), '/bills/sessions');
  fromDb('/briefings/[slug]', 'briefing', (k) => `/briefings/${k}`);
  fromDb('/committees/[id]', 'committee', (k) => `/committees/${k}`);
  fromDb('/contracts/[ocid]', 'contract', (k) => `/contracts/${k}`);
  fromDb('/councils/[slug]', 'council', (k) => `/councils/${k}`);
  fromDb('/councils/[slug]/schools', 'educationCouncil', (k) => `/councils/${k}/schools`);
  fromDb('/councils/[slug]/sewage', 'council', (k) => `/councils/${k}/sewage`);
  fromDb('/coverage/[id]', 'coverage', (k) => `/coverage/${k}`);
  fromDb('/debates/[guid]', 'debate', (k) => `/debates/${k}`);
  // The 10 longest debates by contribution count (owner, 6 Nov 2026), not a sample.
  for (const r of data.debate_longest.slice(0, 10)) add('/debates/[guid]', `/debates/${r.key.toUpperCase()}`, `one of the 10 longest, ${r.m} contributions`);
  fromDb('/divisions/[slug]', 'division', (k) => { const [d, n] = k.split('|'); return `/divisions/pw-${d}-${n}-commons`; });
  fromList('/divisions/year/[year]', ['/divisions/year/2024', '/divisions/year/2019', '/divisions/year/2016'], 'the years on /divisions');
  fromDb('/donors/[slug]', 'donor', (k) => { const s = donorPageSlug(k); return s ? `/donors/${s}` : null; });
  add('/donors/[slug]', '/donors/unison', 'second most donation rows, 1,704');
  add('/donors/[slug]', '/donors/unite-the-union', 'third most donation rows, 1,038');
  fromDb('/editorials/[slug]', 'editorial', (k) => `/editorials/${k}`);
  fromDb('/lobbying/[slug]', 'lobby', (k) => `/lobbying/${k}`);
  fromDb('/organisations/[slug]', 'org', (k) => `/organisations/${k}`);
  fromDb('/organisations/[slug]/[dataset]', 'orgContracts', (k) => `/organisations/${k}/contracts`);
  fromDb('/people/[slug]', 'person', (k) => `/people/${k}`);
  fromDb('/agencies/[slug]', 'agency', (k) => `/agencies/${k}`);
  fromDb('/recommendations/[session]/[report]/[rec]', 'rec', (k) => `/recommendations/${k}`);
  fromList('/statutory-instruments/[id]', await linksFrom('/laws/made-without-a-vote', /^\/statutory-instruments\/[^/]+$/), '/laws/made-without-a-vote');
  fromDb('/treaties/[id]', 'treaty', (k) => `/treaties/${k}`);
  fromDb('/tools/welfare/constituency/[gss]', 'constituency', (k) => `/tools/welfare/constituency/${k}`);
  fromDb('/tools/welfare/local-authority/[gss]', 'la', (k) => `/tools/welfare/local-authority/${k}`);
  fromDb('/transparency/major-projects/[project_key]', 'project', (k) => `/transparency/major-projects/${k}`);
  for (const route of ['/parties/[slug]', '/parties/[slug]/bio', '/parties/[slug]/money', '/parties/[slug]/whip']) {
    const tail = route.split('[slug]')[1];
    add(route, `/parties/green${tail}`, 'typical (a party with a few MPs)');
    add(route, `/parties/labour${tail}`, 'most data (largest party)');
    add(route, `/parties/your-party${tail}`, 'little or no data (a new party)');
  }
  fromList('/second-jobs/[slug]', ['/second-jobs/green', '/second-jobs/labour', '/second-jobs/independent'], 'party slugs');
  fromList('/second-jobs/[slug]/[memberId]', await linksFrom('/second-jobs/labour', /^\/second-jobs\/labour\/\d+$/), '/second-jobs/labour');
  fromList('/secretariats/[slug]', await linksFrom('/secretariats', /^\/secretariats\/[^/]+$/), '/secretariats');
  fromList('/departments/[slug]', await linksFrom('/departments', /^\/departments\/[^/]+$/), '/departments');
  fromList('/programmes/[slug]', await linksFrom('/programmes', /^\/programmes\/[^/]+$/), '/programmes');
  fromList('/donations/constituencies/[slug]', await linksFrom('/donations/constituencies', /^\/donations\/constituencies\/[^/]+$/), '/donations/constituencies');
  add('/search', '/search?q=nhs', 'a common search');
  add('/pmqs/[date]', '/pmqs/2026-10-28', 'a typical session');
  add('/mps/[id]/pmqs', '/mps/4597/pmqs', 'the Leader of the Opposition, most questions');
  add('/pmqs/[date]', '/pmqs/1961-12-07', 'archive session, 1961');
  add('/pmqs/[date]', '/pmqs/1991-11-05', 'archive session, 1991');
  add('/pmqs/[date]', '/pmqs/2015-03-18', 'archive session, 2015');
  add('/pmqs/1945-to-1961', '/pmqs/1945-to-1961', 'the only page of this route');
  add('/pmqs/1945-to-1961/[date]', '/pmqs/1945-to-1961/1949-04-26', 'the most text in a day');
  add('/pmqs/1945-to-1961/[date]', '/pmqs/1945-to-1961/1960-02-18', 'the most contributions in a day');
  add('/pmqs/1945-to-1961/[date]', '/pmqs/1945-to-1961/1961-07-18', 'the 3.15 p.m. experiment');
  add('/pmqs/1945-to-1961/[date]', '/pmqs/1945-to-1961/1946-03-11', 'a date not confirmed on Historic Hansard');
  add('/mps/[id]', '/mps/769', 'basic profile from the Members API record: James Callaghan');
  add('/mps/[id]', '/mps/2565', 'basic profile with no Commons seat in the record: Harold Macmillan');
  add('/mps/[id]/pmqs', '/mps/185/pmqs', 'with archive data');
  add('/mps/[id]/pmqs', '/mps/4128/pmqs', 'a former MP');
  add('/mps/[id]/pmqs', '/mps/8/pmqs', 'a former Prime Minister, answers apart from questions');
  add('/questions/department/[slug]', '/questions/department/science-innovation-and-technology', 'a reorganised department');
  add('/questions/[id]', '/questions/1951193', 'a corrected answer with its original');
  add('/divisions/[slug]', '/divisions/pw-2013-02-05-151-commons', 'archive division, 2013, a long list of names');
  add('/divisions/[slug]', '/divisions/pw-2008-05-14-183-commons', 'archive division whose printed record is inconsistent');
  add('/mps/[id]', '/mps/206', 'current MP with the longest register history of any current MP');
  add('/mps/[id]', '/mps/4160', 'former MP with archive votes and register history under a Lords record');
  add('/mps/[id]/votes-from-hansard/[year]', '/mps/325/votes-from-hansard/2012', 'the member with most archive votes');
  add('/mps/[id]/votes-from-hansard/[year]', '/mps/4160/votes-from-hansard/2006', 'a former MP under a Lords record');
  add('/mps/[id]/votes-from-hansard/[year]', '/mps/1571/votes-from-hansard/2015', 'one with few votes in the year');
  add('/edms/[id]', '/edms/65938', 'most signatures');
  add('/edms/[id]', '/edms/62415', 'a long list with a withdrawn signature');
  add('/constituencies/[slug]', '/constituencies/clacton', 'most candidates, 34 at the byelection');
  add('/constituencies/[slug]', '/constituencies/arbroath-and-broughty-ferry', 'changed MP at a byelection');
  add('/petitions/[id]', '/petitions/700143', 'most signed, with a debate');
  add('/petitions/[id]', '/petitions/750050', 'with the Petitions Committee note, no debate');
  for (const u of ['se9k4m2xq7', 'bg9k4mxw2q', 'mi5k7qxw9n', 'hx7n4qw2mk', 'whr8acs2gf']) add('/editorials/[slug]', `/editorials/${u}`, 'one of the 5 tallest reports');
  for (const s of SECTION_PAGES) add('/sections/[slug]', `/sections/${s.slug}`, 'every section page (few of them)');
  for (const s of ['ministers-meetings', 'appgs', 'hospitality', 'revolving-door', 'donations', 'contracts']) add('/transparency/[section]', `/transparency/${s}`, 'every section (few of them)');
  const mid = topics[Math.floor(topics.length / 2)].slug;
  for (const [t, why] of [[mid, 'typical (middle of the list)'], [topics[0].slug, 'first topic'], [topics[topics.length - 1].slug, 'last topic']] as const) {
    add('/topics/[slug]', `/topics/${t}`, why);
    add('/topics/[slug]/bills', `/topics/${t}/bills`, why);
  }
  add('/topics/[slug]/bills/page/[page]', `/topics/${topics[0].slug}/bills/page/2`, 'second page of the first topic');

  const covered = new Set(rows.map((r) => r[0]));
  const missing = all.filter((r) => !EXCLUDED[r] && !covered.has(r));
  if (missing.length) console.error(`routes with no examples: ${missing.join(' ')}`);

  const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const text = ['route,example_url,why_chosen', ...rows.filter((r) => r[1]).map((r) => r.map(csv).join(','))].join('\n') + '\n';
  fs.writeFileSync('scripts/checks/mobile-audit-pages.csv', text);
  const extra = arg('extra-out');
  if (extra) {
    fs.mkdirSync(path.dirname(extra), { recursive: true });
    fs.writeFileSync(extra, text);
    fs.writeFileSync(extra.replace(/\.csv$/, '-excluded.csv'), ['route,reason', ...excluded.map((r) => `${csv(r)},${csv(EXCLUDED[r])}`)].join('\n') + '\n');
  }
  console.log(JSON.stringify({ routes: all.length, excluded: excluded.length, page_types: covered.size, pages: rows.filter((r) => r[1]).length, no_example: rows.filter((r) => !r[1]).map((r) => r[0]), missing }));
})().catch((e) => { console.error(String(e.message).slice(0, 300)); process.exit(1); });
