#!/usr/bin/env node
// Council leaders: reads each council's own Wikipedia article (the /wiki/ page, never the API) and takes the
// political leader from the infobox entry labelled as such, into councils.leader_role, leader_name, leader_party,
// leader_since, leader_since_text, leader_source_url, leader_checked_on and leader_second_source_url
// (migration 2026-10-19n-council-leader-columns.sql).
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. Rerunnable: every run reads the articles afresh
// (or from --cache) and replaces the leader fields of every council: a council with no sourced leader has them
// all set to NULL (leader_name and leader_party included), so the page shows no Leader row for it.
//
// Rules (John's decisions, 19 Oct 2026):
//   - Directly elected mayors (the 13 below, from the House of Commons Library list of 11 May 2026): role
//     "Directly elected mayor" (Salford: "City Mayor"), from the article's labelled Mayor entry, and confirmed on
//     the council's own page where its robots.txt allows (that page is saved as leader_second_source_url).
//   - Every other council in Great Britain: role "Leader of the council" ("Co-leaders" where the article names
//     co-leaders), name, party and since date from the entry labelled Leader. City of London: its "Policy
//     chairman", shown as "Chairman of the Policy and Resources Committee".
//   - Northern Ireland: the civic head, with the article's own title and "(civic, elected annually)", e.g.
//     "Mayor (civic, elected annually)", "Lord Mayor (civic, elected annually)" (Belfast), "Chair (...)".
//   - Isles of Scilly (no leader post): "Chair of the council", from the labelled Chair entry.
//   - Where the article shows the Leader post as vacant, the council's own site is checked (COUNCIL_PAGES): a page
//     confirming the vacancy gives "Leader of the council: vacant" (leader_name NULL, the page as the source);
//     if the site cannot be checked, the council has no row.
//   - Never the first infobox entry by position; never a civic role (Speaker, Chair, Provost, Convener,
//     ceremonial Mayor, Presiding Member) as the leader outside Northern Ireland. A council with no labelled
//     entry is listed as a gap, with the reason.
//
// Inputs:
//   --councils=file.tsv   slug, name, type, wikipedia_url, website_url, gss_code (default: read from the database)
//   --cache=dir           read <slug>.html from here instead of fetching the article (a saved /wiki/ page)
//   --site-cache=dir      the same for the council pages (<slug>.html, or <slug>-<n>.html for COUNCIL_PAGES' nth page)
//   --checked-on=YYYY-MM-DD  the date the sources were read (default today)
//   --tsv=file.tsv        also write the table (council, role, name, party, since, source, second source, gap)
//   --random=10           also print this many councils picked at random (default 10)
//   --sql=file.sql --sql-tag=20261019o  write the update as one guarded psql transaction (nothing is run here):
//                         backs up the leader fields of every council (councils_leader_backup_<tag>) and checks
//                         the exact number of rows before COMMIT
//
// Fetching: one request every 5 seconds, robots.txt checked per host, redirects followed only to an allowed URL,
// and a page that shows a bot check or cookie wall is left alone (the mayor stays confirmed by Wikipedia only).

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const CACHE = arg('cache');
const SITE_CACHE = arg('site-cache');
const CHECKED_ON = arg('checked-on', new Date().toISOString().slice(0, 10));
const RANDOM = Number(arg('random', '10'));
const SQL = arg('sql');
const SQL_TAG = arg('sql-tag');
const TSV = arg('tsv');
const UA = 'opengovt.uk-council-leaders/1.0 (https://opengovt.uk; council leaders from Wikipedia and council pages; one request every 5 seconds)';
const fail = (m) => { console.error(m); process.exit(1); };
if (!/^\d{4}-\d{2}-\d{2}$/.test(CHECKED_ON)) fail('--checked-on must be YYYY-MM-DD');

// House of Commons Library, Directly elected mayors (SN05000), 11 May 2026: 13 councils. The council page is
// where each council names its mayor; the name must appear on it for the mayor to count as confirmed there.
const ELECTED_MAYORS = {
  bedford: 'https://www.bedford.gov.uk/your-council/councillors-and-senior-staff/mayor-bedford-borough',
  croydon: 'https://www.croydon.gov.uk/council-and-elections/mayors-croydon/elected-mayor-croydon',
  lewisham: 'https://lewisham.gov.uk/mayorandcouncil/mayor-and-cabinet',
  newham: 'https://www.newham.gov.uk/council/mayor-newham-1',
  'north-tyneside': 'https://www.northtyneside.gov.uk/council/council-meetings-and-decision-making/elected-mayor-and-cabinet/elected-mayor',
  'city-of-doncaster': 'https://www.doncaster.gov.uk/mayor/elected-mayor',
  hackney: 'https://www.hackney.gov.uk/council-and-elections/mayor-cabinet-and-councillors/mayor-and-cabinet/mayor-hackney',
  leicester: 'https://www.leicester.gov.uk/about-council/city-mayor-peter-soulsby/about-me',
  salford: 'https://www.salford.gov.uk/your-council/city-mayor/about-paul-and-his-role/',
  // the democracy site's mayor page is closed to robots; the council's own news page names him
  'tower-hamlets': 'https://www.towerhamlets.gov.uk/News_events/2026/July/Mayor-of-Londons-concession-shows-impact-of-our-legal-challenge-to-affordable-housing-cuts-says-Tower-Hamlets.aspx',
  watford: 'https://www.watford.gov.uk/elected-mayor/mayor-cabinet',
  mansfield: 'https://www.mansfield.gov.uk/council-councillors-democracy/meet-mayor-1',
  middlesbrough: 'https://www.middlesbrough.gov.uk/latest-news/mayor-announces-changes-to-executive/',
};
// Councils whose article shows the Leader post as vacant: the council's own pages, tried in order. `vacant` is
// the wording that confirms there is no leader.
const COUNCIL_PAGES = {
  // Published 17 Sep 2026: interim Lead Members "while the borough continues to work towards the appointment of a
  // Council Leader and Cabinet"
  oldham: { pages: ['https://www.oldham.gov.uk/news/article/2958/oldham_council_agrees_interim_lead_member_arrangements_to_strengthen_governance_and_accountability'],
    vacant: /continues to work towards the appointment of a Council Leader/i },
  // The Cabinet page and the councillors' pages on the democracy site (closed to robots); no other current page
  // names the leader (the November 2025 portfolio list predates the vacancy of 24 Sep 2026)
  gloucester: { pages: ['https://www.gloucester.gov.uk/about-the-council/councillors-mps-and-mayor/the-cabinet/',
    'https://democracy.gloucester.gov.uk/mgMemberIndex.aspx?bcr=1'], vacant: null },
};
const MAYOR_ROLE = (slug) => (slug === 'salford' ? 'City Mayor' : 'Directly elected mayor');

const MAYOR_LABEL = /^(directly[- ]elected |elected |city |executive )?mayor$/i;
const LEADER_LABEL = /^(council |executive )?leader( of (the )?council)?$/i;
const COLEADER_LABEL = /^co-?leaders?$/i;
const NI_LABEL = /^(lord mayor|mayor|chair|chairperson)$/i;
const SCILLY = 'isles-of-scilly';
const CITY_OF_LONDON = 'city-of-london-corporation';

// ---------- fetching ----------
const robots = new Map();
let lastFetch = 0;
const wait = async () => { const d = lastFetch + 5000 - Date.now(); if (d > 0) await new Promise((r) => setTimeout(r, d)); lastFetch = Date.now(); };
async function robotsAllow(url) {
  const u = new URL(url);
  if (!robots.has(u.host)) {
    await wait();
    let rules = null; // null: allow all
    try {
      const r = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { 'User-Agent': UA }, redirect: 'manual' });
      if (r.ok) rules = await r.text();
      else if (r.status !== 404) rules = 'User-agent: *\nDisallow: /';
    } catch { rules = 'User-agent: *\nDisallow: /'; }
    robots.set(u.host, rules);
  }
  const t = robots.get(u.host);
  if (t == null) return true;
  // the rules for "*": the longest matching Allow/Disallow wins
  let inStar = false; let best = { len: -1, allow: true };
  for (const line of t.split(/\r?\n/)) {
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
const BOT = /just a moment|cf-chl|challenge-platform|_incapsula_resource|captcha|attention required|access denied|request unsuccessful|sucuri/i;
async function politeGet(url, hops = 3) {
  if (!(await robotsAllow(url))) return { error: 'robots.txt disallows it' };
  await wait();
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'manual' }); }
  catch (e) { return { error: e.message }; }
  if (r.status >= 300 && r.status < 400 && hops) return politeGet(new URL(r.headers.get('location'), url).href, hops - 1);
  const body = await r.text();
  const wiki = /- Wikipedia<\/title>/.test(body); // MediaWiki pages mention captcha in their settings
  if (r.status === 403 || (!wiki && BOT.test(body.slice(0, 6000)))) return { error: `bot check (HTTP ${r.status})` };
  if (!r.ok) return { error: `HTTP ${r.status}` };
  return { body };
}
async function page(dir, slug, url) {
  const f = dir && path.join(dir, `${slug}.html`);
  if (f && fs.existsSync(f)) return { body: fs.readFileSync(f, 'utf8') };
  if (!/^https:\/\/en\.wikipedia\.org\/wiki\/[^?#]+$/.test(url) && dir === CACHE) return { error: `not a /wiki/ article URL: ${url}` };
  return politeGet(url);
}

// ---------- infobox ----------
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
function clean(s) {
  return (s || '')
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{(?:nowrap|nobr)\|([^{}]*)\}\}/gi, '$1')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?|<[^>]+>|\{\{[^}]*\}\}/g, '')
    .replace(/\s+/g, ' ').trim()
    .replace(/^(Cllr\.?|Councillor)\s+/i, '');
}
// Every infobox in the article; the council's own box (one with leaderN_type entries) is used.
function infobox(html) {
  const found = [];
  for (const m of html.matchAll(/data-mw='(\{[^']*\})'|data-mw="(\{[^"]*\})"/g)) {
    let d; try { d = JSON.parse(unescape(m[1] || m[2])); } catch { continue; }
    for (const p of d.parts || []) {
      const t = p && p.template; if (!t) continue;
      const name = (t.target.wt || '').trim().toLowerCase();
      if (name.startsWith('infobox')) found.push(Object.fromEntries(Object.entries(t.params || {}).map(([k, v]) => [k, v.wt || ''])));
    }
  }
  return found.find((P) => Object.keys(P).some((k) => /^leader\d*_type$/.test(k))) || null;
}
function entries(P) {
  return Object.keys(P).map((k) => k.match(/^leader(\d*)_type$/)).filter(Boolean).map((m) => {
    const n = m[1];
    return { n: Number(n || 1), label: clean(P[`leader${n}_type`]), raw: P[`leader${n}`] || '', party: partyField(P[`party${n}`]),
      since: clean(P[`election${n}`] || P[`leader${n}_start`] || P[`start${n}`]) };
  }).sort((a, b) => a.n - b.n);
}
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// "23 May 2023" -> 2023-05-23; a month or year alone is not a date and is reported, not stored
function isoDate(s) {
  const m = (s || '').match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!m) return null;
  const mo = MONTHS.findIndex((x) => x.startsWith(m[2].toLowerCase().slice(0, 3)));
  return mo < 0 ? null : `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
// Party names as the articles abbreviate them, written out (the page shortens them again with shortParty).
const PARTY = { Lab: 'Labour', Con: 'Conservative', 'Lib Dem': 'Liberal Democrats', 'Liberal Democrat': 'Liberal Democrats',
  LD: 'Liberal Democrats', SF: 'Sinn Féin', DUP: 'Democratic Unionist Party', SNP: 'Scottish National Party', Green: 'Green Party',
  RIRG: "Runnymede Independent Residents' Group", Reform: 'Reform UK', Conservatives: 'Conservative', 'Conservative Party': 'Conservative',
  // not linked in the article: the councils' own names for the groups
  RAOIC: 'Rother Association of Independent Councillors', OLRG: 'Oxted and Limpsfield Residents Group' };
const party = (p) => { p = p.replace(/[,;]$/, '').replace(/\s*\([A-Z]{2,5}\)$/, '').trim(); return PARTY[p] || p; };
// A party field linked under an abbreviation ("[[Canvey Island Independent Party|CIIP]]") is read as the link's article.
const partyField = (wt) => {
  const m = (wt || '').match(/\[\[([^|\]]+)\|\s*([A-Z0-9]{2,5})\s*\]\]/);
  return m ? m[1].replace(/\s*\((UK|Scotland|Wales|England)\)$/, '').trim() : clean(wt);
};
// One leaderN field naming several people: "A (Lab)<br>B (Lib Dem)", or "A<br>Conservative<br>and<br>B<br>Liberal Democrat".
function people(e) {
  const parts = e.raw.split(/<br\s*\/?>|\{\{\s*(?:plainlist|ubl|unbulleted list)\s*\||\n\*/i).map(clean).filter((p) => p && !/^and$/i.test(p));
  if (parts.length === 1) return [{ name: parts[0], party: party(e.party) }];
  if (parts.length % 2 === 0 && !parts.some((p) => /\(/.test(p)))
    return parts.filter((_, i) => i % 2 === 0).map((name, i) => ({ name, party: party(parts[2 * i + 1]) }));
  return parts.map((p) => {
    const m = p.match(/^(.*?)\s*\(([^)]+)\)$/);
    return m ? { name: m[1], party: party(m[2]) } : { name: p, party: '' };
  });
}

function classify(c, P) {
  const nation = (c.gss_code || '?')[0];
  if (!P) return { gap: 'the article has no council infobox with labelled entries' };
  const E = entries(P);
  const one = (e, role) => {
    const ps = people(e);
    if (ps.length !== 1) return { gap: `the ${e.label} entry names ${ps.length} people` };
    if (/^vacant$/i.test(ps[0].name)) return { gap: `the article shows the ${e.label} post as vacant`, vacant: true, role };
    return { role, name: ps[0].name, party: ps[0].party, since: isoDate(e.since), sinceText: e.since, label: e.label };
  };
  if (nation === 'N') {
    const e = E.find((x) => NI_LABEL.test(x.label));
    if (!e) return { gap: 'no labelled Mayor, Lord Mayor or Chair entry' };
    return one(e, `${e.label[0].toUpperCase()}${e.label.slice(1)} (civic, elected annually)`);
  }
  if (ELECTED_MAYORS[c.slug]) {
    const e = E.find((x) => MAYOR_LABEL.test(x.label) && !/^(civic|ceremonial|lord|lady) /i.test(x.label));
    if (!e) return { gap: 'directly elected mayor, but the article has no labelled Mayor entry' };
    return one(e, MAYOR_ROLE(c.slug));
  }
  if (c.slug === SCILLY) {
    const e = E.find((x) => /^chair(man|person)?$/i.test(x.label));
    if (!e) return { gap: 'no labelled Chair entry' };
    return one(e, 'Chair of the council');
  }
  if (c.slug === CITY_OF_LONDON) {
    const e = E.find((x) => /^policy chair(man)?$/i.test(x.label));
    if (!e) return { gap: 'no labelled Policy chairman entry' };
    return one(e, 'Chairman of the Policy and Resources Committee');
  }
  const co = E.filter((x) => COLEADER_LABEL.test(x.label));
  if (co.length) {
    const ps = co.flatMap((e) => people(e).map((p) => ({ ...p, since: isoDate(e.since), sinceText: e.since })));
    if (ps.length < 2) return { gap: 'a Co-leader entry names only one person' };
    const dates = ps.map((p) => p.since).filter(Boolean).sort();
    // the co-leadership in its present form began when the latest co-leader took office
    return { role: 'Co-leaders', name: ps.map((p) => p.name).join(' and '), party: ps.map((p) => p.party || 'party not given').join(' / '),
      since: dates.length === ps.length ? dates[dates.length - 1] : null, sinceText: ps.map((p) => p.sinceText).filter(Boolean).join(' / '),
      label: co.map((e) => e.label).join(', '), people: ps };
  }
  const L = E.filter((x) => LEADER_LABEL.test(x.label));
  if (L.length > 1) return { gap: `${L.length} entries labelled Leader` };
  if (L.length === 1) return one(L[0], 'Leader of the council');
  const civic = E.map((x) => x.label).filter(Boolean).join(', ') || 'no entries';
  return { gap: `no labelled Leader entry (the infobox has: ${civic})` };
}

function councils() {
  const f = arg('councils');
  const rows = f
    ? fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => l.split('\t'))
    : execFileSync('psql', [process.env.DATABASE_URL || fail('DATABASE_URL not set'), '-AtF', '\t', '-c',
      'select slug, name, type, wikipedia_url, website_url, gss_code from public.councils order by slug'], { encoding: 'utf8' }).trim().split('\n').map((l) => l.split('\t'));
  return rows.map(([slug, name, type, wikipedia_url, website_url, gss_code]) => ({ slug, name, type, wikipedia_url, website_url, gss_code }));
}

const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);

(async () => {
  const all = councils();
  const missingMayors = Object.keys(ELECTED_MAYORS).filter((s) => !all.some((c) => c.slug === s));
  if (missingMayors.length) fail(`elected mayor councils not found: ${missingMayors.join(', ')}`);
  const out = [];
  for (const c of all) {
    const p = await page(CACHE, c.slug, c.wikipedia_url);
    const r = p.body ? classify(c, infobox(p.body)) : { gap: `article not read: ${p.error}` };
    r.slug = c.slug; r.council = c.name; r.nation = (c.gss_code || '?')[0]; r.source = c.wikipedia_url; r.wiki = c.wikipedia_url;
    if (r.vacant) {
      const cp = COUNCIL_PAGES[c.slug];
      const tried = [];
      for (const [i, url] of (cp ? cp.pages : []).entries()) {
        const s = await page(SITE_CACHE, i ? `${c.slug}-${i + 1}` : c.slug, url);
        if (!s.body) { tried.push(`${url}: ${s.error}`); continue; }
        const text = unescape(s.body.replace(/<script[\s\S]*?<\/script>|<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
        if (cp.vacant && cp.vacant.test(text)) {
          Object.assign(r, { gap: null, name: null, party: '', since: null, sinceText: '', source: url, siteNote: 'the council page confirms the post is vacant' });
          break;
        }
        tried.push(`${url}: read, but it does not name the current leader or confirm a vacancy`);
      }
      if (r.gap) r.gap += cp ? `; council site: ${tried.join('; ')}` : '; no council page listed to check';
    }
    if (!r.gap && ELECTED_MAYORS[c.slug]) {
      const s = await page(SITE_CACHE, c.slug, ELECTED_MAYORS[c.slug]);
      const text = s.body ? unescape(s.body.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').toLowerCase() : '';
      const surname = r.name.split(' ').pop().toLowerCase();
      r.second = s.body && text.includes(surname) ? ELECTED_MAYORS[c.slug] : null;
      r.secondNote = s.body ? (r.second ? 'named on the council page' : 'not named on the council page') : `council page not read: ${s.error}`;
    }
    out.push(r);
  }

  const ok = out.filter((r) => !r.gap);
  const gaps = out.filter((r) => r.gap);
  const row = (r) => `${pad(r.council, 44)} ${pad(r.role, 46)} ${pad(r.name ?? 'vacant', 34)} ${pad(r.party, 30)} ${pad(r.since || (r.sinceText ? `(${r.sinceText})` : ''), 12)} ${r.source !== r.wiki ? 'council site' : r.second ? 'Wikipedia + council site' : 'Wikipedia'}`;
  const head = `${pad('Council', 44)} ${pad('Role', 46)} ${pad('Name', 34)} ${pad('Party', 30)} ${pad('Since', 12)} Source`;
  console.log(`Council leaders: dry run${SQL ? ' (writing SQL)' : ''}, sources read ${CHECKED_ON}\n`);
  console.log(`${ok.length} of ${out.length} councils with a sourced leader; ${gaps.length} gaps.`);
  for (const n of ['E', 'W', 'S', 'N']) console.log(`  ${n}: ${out.filter((r) => r.nation === n && !r.gap).length} of ${out.filter((r) => r.nation === n).length}`);
  console.log(`\nALL COUNCILS\n${head}`);
  for (const r of out) console.log(r.gap ? `${pad(r.council, 44)} GAP: ${r.gap}` : row(r));
  console.log(`\nDIRECTLY ELECTED MAYORS (${Object.keys(ELECTED_MAYORS).length})\n${head}`);
  for (const r of out.filter((x) => ELECTED_MAYORS[x.slug])) console.log(r.gap ? `${pad(r.council, 44)} GAP: ${r.gap}` : `${row(r)}\n${' '.repeat(45)}council page: ${r.secondNote} (${ELECTED_MAYORS[r.slug]})`);
  // a fixed seed, so a rerun shows the same sample
  let seed = 20261019; const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pool = ok.filter((r) => r.nation !== 'N' && !ELECTED_MAYORS[r.slug]);
  const pick = []; while (pick.length < Math.min(RANDOM, pool.length)) { const r = pool[Math.floor(rand() * pool.length)]; if (!pick.includes(r)) pick.push(r); }
  console.log(`\n${RANDOM} COUNCILS AT RANDOM\n${head}`);
  for (const r of pick.sort((a, b) => a.council.localeCompare(b.council))) console.log(row(r));
  console.log(`\nNORTHERN IRELAND (${out.filter((r) => r.nation === 'N').length})\n${head}`);
  for (const r of out.filter((x) => x.nation === 'N')) console.log(r.gap ? `${pad(r.council, 44)} GAP: ${r.gap}` : row(r));
  console.log(`\nNO SOURCED LEADER (${gaps.length})`);
  for (const r of gaps) console.log(`  ${pad(r.council, 44)} ${r.gap}  [${r.source}]`);
  const noDate = ok.filter((r) => !r.since);
  console.log(`\nSINCE DATE NOT A FULL DATE (${noDate.length}; the text is kept in leader_since_text)`);
  for (const r of noDate) console.log(`  ${pad(r.council, 44)} ${r.sinceText ? `"${r.sinceText}"` : 'not given'}`);

  if (TSV) fs.writeFileSync(TSV, ['slug\tcouncil\trole\tname\tparty\tsince\tsource\tsecond_source\tgap', ...out.map((r) =>
    [r.slug, r.council, r.role, r.gap ? '' : r.name ?? 'vacant', r.party, r.since || r.sinceText, r.source, r.second, r.gap].map((v) => v ?? '').join('\t'))].join('\n') + '\n');

  if (SQL) {
    if (!/^[a-z0-9_]+$/.test(SQL_TAG)) fail('give --sql-tag=<backup table suffix>, e.g. 20261019o');
    const L = [`-- Council leaders: ${ok.length} councils, sources read ${CHECKED_ON}`, '-- written by scripts/import-council-leaders.js --sql',
      '\\set ON_ERROR_STOP on', 'BEGIN;', '',
      '-- name is NULL only where the council page confirms the post is vacant',
      'CREATE TEMP TABLE leader_new (slug text PRIMARY KEY, role text NOT NULL, name text, party text, since date, since_text text, source text NOT NULL, second text, wiki text NOT NULL) ON COMMIT DROP;',
      'INSERT INTO leader_new VALUES',
      ok.map((r) => `  (${[r.slug, r.role, r.name, r.party || null, r.since, r.since ? null : r.sinceText || null, r.source, r.second || null, r.wiki].map(q).join(', ')})`).join(',\n') + ';', '',
      'DO $$', 'DECLARE n int;', 'BEGIN',
      `  SELECT count(*) INTO n FROM public.councils c JOIN leader_new l ON l.slug = c.slug;`,
      `  IF n <> ${ok.length} THEN RAISE EXCEPTION 'expected ${ok.length} councils, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils c JOIN leader_new l ON l.slug = c.slug AND c.wikipedia_url = l.wiki;`,
      `  IF n <> ${ok.length} THEN RAISE EXCEPTION 'expected ${ok.length} councils whose wikipedia_url is the source read, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils;`,
      `  IF n <> ${out.length} THEN RAISE EXCEPTION 'expected ${out.length} councils in all, found %', n; END IF;`,
      'END $$;', '',
      `CREATE TABLE public.councils_leader_backup_${SQL_TAG} AS SELECT c.slug, c.leader_name, c.leader_party, c.leader_role, c.leader_since,`,
      '  c.leader_since_text, c.leader_source_url, c.leader_checked_on, c.leader_second_source_url FROM public.councils c;', '',
      'UPDATE public.councils c SET leader_role = l.role, leader_name = l.name, leader_party = l.party, leader_since = l.since,',
      `  leader_since_text = l.since_text, leader_source_url = l.source, leader_checked_on = ${q(CHECKED_ON)}, leader_second_source_url = l.second`,
      '  FROM leader_new l WHERE l.slug = c.slug;', '',
      `-- councils with no sourced leader (${gaps.map((r) => r.slug).join(', ')}): every leader field cleared`,
      'UPDATE public.councils c SET leader_role = NULL, leader_name = NULL, leader_party = NULL, leader_since = NULL, leader_since_text = NULL,',
      '  leader_source_url = NULL, leader_checked_on = NULL, leader_second_source_url = NULL',
      '  WHERE NOT EXISTS (SELECT 1 FROM leader_new l WHERE l.slug = c.slug);', '',
      'DO $$', 'DECLARE n int;', 'BEGIN',
      `  SELECT count(*) INTO n FROM public.councils_leader_backup_${SQL_TAG};`,
      `  IF n <> ${out.length} THEN RAISE EXCEPTION 'expected ${out.length} rows backed up, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils WHERE leader_source_url IS NOT NULL;`,
      `  IF n <> ${ok.length} THEN RAISE EXCEPTION 'expected ${ok.length} councils with a leader source, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils WHERE leader_source_url IS NULL AND leader_name IS NULL AND leader_party IS NULL AND leader_role IS NULL;`,
      `  IF n <> ${gaps.length} THEN RAISE EXCEPTION 'expected ${gaps.length} councils with every leader field cleared, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils WHERE leader_source_url IS NOT NULL AND leader_name IS NULL;`,
      `  IF n <> ${ok.filter((r) => r.name == null).length} THEN RAISE EXCEPTION 'expected ${ok.filter((r) => r.name == null).length} vacant posts, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils WHERE leader_since_text IS NOT NULL;`,
      `  IF n <> ${ok.filter((r) => !r.since && r.sinceText).length} THEN RAISE EXCEPTION 'expected ${ok.filter((r) => !r.since && r.sinceText).length} part dates, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils WHERE leader_checked_on = ${q(CHECKED_ON)};`,
      `  IF n <> ${ok.length} THEN RAISE EXCEPTION 'expected ${ok.length} councils checked on ${CHECKED_ON}, found %', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.councils WHERE leader_second_source_url IS NOT NULL;`,
      `  IF n <> ${ok.filter((r) => r.second).length} THEN RAISE EXCEPTION 'expected ${ok.filter((r) => r.second).length} councils with a second source, found %', n; END IF;`,
      'END $$;', '',
      'SELECT leader_role, count(*) FROM public.councils GROUP BY 1 ORDER BY 2 DESC;', '', 'COMMIT;', ''];
    fs.writeFileSync(SQL, L.join('\n'));
    console.log(`\nSQL written to ${SQL} (not run).`);
  }
})();
