#!/usr/bin/env node
// Ministerial directions from GOV.UK into ministerial_directions (migration 2026-10-20a-ministerial-directions.sql).
// Owner's approval and decisions, 20 Oct 2026.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. --sql=file.sql --sql-tag=<suffix> writes one guarded
// transaction that replaces every row (backing up the rows already there). Rerunnable.
//
// Source (robots.txt allows each; checked on every run, one request every 5 seconds, redirects checked first):
//   https://www.gov.uk/api/content/government/collections/ministerial-directions   the collection (57 on 20 Oct 2026)
//   https://www.gov.uk/api/content/<page>                                           each direction's page
//   its attachments: PDFs on assets.publishing.service.gov.uk (no robots.txt), HTML letters through the Content API
//   --cache=dir   keep downloads there and reuse them on the next run (default: a fresh temporary folder)
//
// Rules:
//   - Department: GOV.UK's organisation tags, mapped to our department pages (ORG_TO_DEPT). The Department for
//     Business, Energy & Industrial Strategy maps to business-trade only when no successor (DBT, DESNZ, DSIT) is also
//     tagged. Organisations without a department page are kept in organisations but give no dept_slug.
//   - Letters: each attachment is a request (the accounting officer's objection), the direction (the minister's
//     reply) or other (e.g. a later letter to the Public Accounts Committee), from its title.
//   - Date given: the first date in the direction letter's title, else the first date in its text. It is dropped
//     (NULL, with a note) when it is before the request letter's date or after GOV.UK published the page: scanned
//     letters often have handwritten dates that text recognition misreads.
//   - Minister (owner's decision, 20 Oct 2026): the name as signed on the direction letter (the last "Rt Hon <name>"
//     on it); GOV.UK's person tag only where the letter gives no name. Letters signed only "The Prime Minister" are
//     settled in OWNER_DECISIONS.
//   - Nothing is guessed: no date is filled in where the letter's date cannot be read (OneWeb included). The page
//     shows the publication date for those, with a note.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(m); process.exit(1); };
const UA = 'opengovt.uk-ministerial-directions/1.0 (https://opengovt.uk; ministerial directions; one request every 5 seconds)';
const COLLECTION = 'https://www.gov.uk/api/content/government/collections/ministerial-directions';
const CACHE = arg('cache') || fs.mkdtempSync(path.join(os.tmpdir(), 'ministerial-directions-'));
for (const d of ['pages', 'att', 'bin']) fs.mkdirSync(path.join(CACHE, d), { recursive: true });

// GOV.UK organisation tag -> /departments/<slug>. Names as tagged (old names kept), trimmed.
const ORG_TO_DEPT = {
  'Cabinet Office': 'cabinet-office',
  'HM Treasury': 'treasury',
  'Home Office': 'home-office',
  'Ministry of Justice': 'justice',
  'Department for Transport': 'transport',
  'Department for Education': 'education',
  'Department for Work and Pensions': 'work-pensions',
  'Department of Health and Social Care': 'health',
  'Department for Environment, Food & Rural Affairs': 'environment',
  'Department for Energy Security and Net Zero': 'energy',
  'Department for Business and Trade': 'business-trade',
  'Department for Business, Innovation, Science and Trade': 'business-trade',
  'Department for International Trade': 'business-trade',
  'Department for Business, Innovation & Skills': 'business-trade',
  'Department for Levelling Up, Housing and Communities': 'housing',
  'Ministry of Housing, Communities & Local Government (2018 to 2021)': 'housing',
  'UK Export Finance': 'ukef',
};
const BEIS = 'Department for Business, Energy & Industrial Strategy';
const BEIS_SUCCESSORS = ['Department for Business and Trade', 'Department for Energy Security and Net Zero', 'Department for Science, Innovation and Technology'];

// The owner's decisions (20 Oct 2026) for the Prime Minister's letters, which are signed by title only.
const OWNER_DECISIONS = {
  'ministerial-direction-regarding-legal-proceedings': { minister_names: ['Boris Johnson (Prime Minister at the date of the letter)'],
    why: 'The letter of 4 March 2020 is signed "The Prime Minister"; Boris Johnson was Prime Minister on that date.' },
  'minute-from-the-prime-minister-to-the-permanent-secretary-at-the-cabinet-office': { minister_names: ['Boris Johnson (Prime Minister at the date of the letter)'],
    why: 'The minute of 28 June 2020 is from "The Prime Minister"; Boris Johnson was Prime Minister on that date.' },
  'special-advisers-severance-pay': { minister_names: ['The Prime Minister'],
    why: 'The letter of 13 July 2016 is from the Principal Private Secretary for "the Prime Minister", on the day David Cameron handed over to Theresa May, so no name is given.' },
};

// ---------- polite fetching ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const robotsCache = new Map();
async function robotsAllow(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    const r = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { 'User-Agent': UA }, redirect: 'manual' });
    robotsCache.set(u.host, r.ok ? await r.text() : r.status === 404 ? '' : 'User-agent: *\nDisallow: /');
    await sleep(5000);
  }
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
async function get(url, file, hops = 3) {
  if (fs.existsSync(file)) return fs.readFileSync(file);
  if (!(await robotsAllow(url))) fail(`robots.txt disallows ${url}`);
  const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual' });
  await sleep(5000);
  if ([301, 302, 303, 307, 308].includes(r.status) && hops) return get(new URL(r.headers.get('location'), url).href, file, hops - 1);
  if (!r.ok) fail(`HTTP ${r.status} for ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  if (/just a moment|cf-chl|captcha/i.test(b.subarray(0, 4000).toString())) fail(`bot check at ${url}; stopping`);
  fs.writeFileSync(file, b);
  return b;
}

// ---------- letter text ----------
const PDF_TEXT = path.join(CACHE, 'bin', 'pdf-text');
function pdfText(file) {
  if (!fs.existsSync(PDF_TEXT)) execFileSync('swiftc', ['-O', path.join(__dirname, 'tools', 'pdf-text.swift'), '-o', PDF_TEXT], { stdio: 'inherit' });
  const out = execFileSync(PDF_TEXT, [file], { maxBuffer: 1 << 26 }).toString();
  const nl = out.indexOf('\n');
  return { ocr: out.slice(0, nl) === 'ocr', text: out.slice(nl + 1) };
}
const htmlText = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&[a-z]+;/g, ' ');

// ---------- reading dates and names ----------
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DATE_RE = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?,?\s+(20\d\d)\b|\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/gi;
function datesIn(t) {
  const out = [];
  for (const m of (t || '').matchAll(DATE_RE)) {
    const [d, mo, y] = m[1] ? [+m[1], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, m[3]] : [+m[4], +m[5], m[6]];
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) out.push(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
}
const POST_NOMINALS = /\s+(MP|KCMG|KCB|KC|QC|CB|CBE|OBE|PC)\b\.?/gi;
const tagName = (n) => n.replace(/^(The )?Rt\.? Hon\.? /i, '').replace(POST_NOMINALS, '').trim();
const STOP = new Set(['mp', 'secretary', 'of', 'state', 'for', 'department', 'minister', 'the', 'and', 'chancellor', 'permanent', 'from', 'great', 'home', 'kcb', 'kc', 'kcmg', 'cb', 'cbe', 'obe']);
// Every "Rt Hon <name>" on a letter, in order, as written (case tidied). A name cut short by the scan (last word
// under 3 letters, e.g. "Alok S") is skipped.
function rtHonNames(text) {
  const names = [];
  const flat = (text || '').replace(/\s+/g, ' ');
  for (const m of flat.matchAll(/\brt\.? ?hon\.? ((?:(?:dr|sir|lord|dame|baroness)\.? )?[a-zà-ÿ’'-]+(?: [a-zà-ÿ’'-]+){1,2})/gi)) {
    const words = [];
    for (const w of m[1].split(' ')) { if (STOP.has(w.toLowerCase().replace(/\.$/, ''))) break; words.push(w); }
    if (words.length < 2) continue;
    while (words.length > 2 && /^[A-Z]\.?$/.test(words[words.length - 1])) words.pop(); // a stray letter from "M P"
    if (words[words.length - 1].replace(/[^a-zà-ÿ]/gi, '').length < 3) continue;
    const cased = words.map((w) => w.split('-').map((p) => {
      if (/^Mc[A-Z]{2,}$/.test(p)) return 'Mc' + p[2] + p.slice(3).toLowerCase(); // McLOUGHLIN
      return p.length > 1 && p === p.toUpperCase() ? p[0] + p.slice(1).toLowerCase() : p;
    }).join('-'));
    names.push(cased.join(' ').replace(/\bMc([a-z])/g, (_, c) => 'Mc' + c.toUpperCase()).replace(/^Dr\b\.?/i, 'Dr'));
  }
  return names;
}
const plain = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const surname = (n) => plain(n).split(' ').pop();
// The minister(s) as signed: the last "Rt Hon" name on the direction letter (its signature). Where GOV.UK tags more
// than one minister and the letter names each of them (a jointly signed letter), every one, as the letter writes
// them. A name that differs from the tag only by accents takes the tag's spelling (e.g. Thérèse Coffey).
function signedMinisters(text, tagged) {
  const names = rtHonNames(text);
  if (!names.length) return null;
  let out = [names[names.length - 1]];
  if (tagged.length > 1) {
    const joint = tagged.map((t) => names.find((n) => surname(n) === surname(t))).filter(Boolean);
    if (joint.length === tagged.length) out = [...new Set(joint)];
  }
  return out.map((n) => tagged.find((t) => plain(t).replace(/^(sir|lord|dame|dr|baroness) /, '') === plain(n).replace(/^(sir|lord|dame|dr|baroness) /, '') && t.replace(/^(Sir|Lord|Dame|Dr|Baroness) /, '') !== n.replace(/^(Sir|Lord|Dame|Dr|Baroness) /, '') && plain(t) !== t.toLowerCase() ? t : null) || n);
}
const isOther = (t) => /public accounts committee/i.test(t);
const isDirection = (t) => /^\s*(ministerial direction from|direction from|letter 2|response from|confirmation|minute from the prime minister|letter from matt hancock)|letter from (the )?(dit )?(secretary of state|prime minister|home secretary|chancellor)|confirming|[-:] ministerial direction\s*(,|$|\()|setting out (the|his) (ministerial )?direction|ministerial direction confirmation|manston airport letter/i.test(t);
// "X: ministerial direction" -> "X"; "Coronavirus (COVID-19): ministerial direction for the Y" -> "Coronavirus: Y"
function subjectOf(title) {
  let s = title.replace(/\s*[:\-–]\s*(a )?ministerial direction( request)?\s*$/i, '').replace(/^ministerial direction:\s*/i, '');
  s = s.replace(/^(coronavirus \(covid-19\):?\s*)?(a )?ministerial direction (for|on|regarding) (the )?/i, (m, cv) => (cv ? 'Coronavirus: ' : ''));
  s = s.replace(/^Coronavirus: coronavirus /i, 'Coronavirus: ').replace(/: ministerial direction (on|for) /i, ': ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- main ----------
(async () => {
  const coll = JSON.parse(await get(COLLECTION, path.join(CACHE, 'collection.json')));
  const docs = coll.links.documents || [];
  if (docs.length < 50) fail(`the collection lists only ${docs.length} documents; expected about 57`);
  const rows = [];
  for (const d of docs) {
    const slug = d.base_path.split('/').pop();
    const j = JSON.parse(await get(`https://www.gov.uk/api/content${d.base_path}`, path.join(CACHE, 'pages', `${slug}.json`)));
    const letters = [];
    for (const [k, a] of (j.details.attachments || []).entries()) {
      const isPdf = a.content_type === 'application/pdf' || /\.pdf$/i.test(a.url || '');
      const url = a.url.startsWith('/') ? `https://www.gov.uk${a.url}` : a.url;
      let text = ''; let ocr = false;
      if (isPdf) {
        const f = path.join(CACHE, 'att', `${slug}__${k}.pdf`);
        await get(url, f);
        ({ text, ocr } = pdfText(f));
      } else {
        const p = url.replace('https://www.gov.uk', '');
        text = htmlText(JSON.parse(await get(`https://www.gov.uk/api/content${p}`, path.join(CACHE, 'att', `${slug}__${k}.json`))).details.body || '');
      }
      const title = (a.title || '').trim();
      letters.push({ title, url, format: isPdf ? 'pdf' : 'html', kind: isOther(title) ? 'other' : isDirection(title) ? 'direction' : 'request', ocr, text });
    }
    const published = j.first_published_at.slice(0, 10);
    const dir = letters.filter((l) => l.kind === 'direction');
    const req = letters.filter((l) => l.kind === 'request');
    const reqDate = req.map((l) => datesIn(l.title)[0] || datesIn(l.text)[0]).find(Boolean) || null;
    let date = null; let dateSource = null; const notes = [];
    const fromTitle = dir.map((l) => datesIn(l.title)[0]).find(Boolean);
    const fromText = dir.map((l) => datesIn(l.text)[0]).find(Boolean);
    const read = fromTitle || fromText;
    if (!dir.length) notes.push('GOV.UK publishes only the request letter, not the direction.');
    else if (!read) notes.push(`No date could be read from the direction letter${dir.some((l) => l.ocr) ? ' (a scan)' : ''}.`);
    else if (reqDate && read < reqDate) notes.push(`The date read from the direction letter (${read}) is before the request letter (${reqDate}), so it was not used.`);
    else if (read > published) notes.push(`The date read from the direction letter (${read}) is after publication (${published}), so it was not used.`);
    else { date = read; dateSource = fromTitle ? 'letter title' : 'letter text'; }

    const people = (j.links.people || []).map((p) => tagName(p.title));
    const sig = dir.map((l) => signedMinisters(l.text, people)).find(Boolean);
    let ministers = sig || (people.length ? people : null);
    let ministerSource = sig ? 'letter text' : people.length ? 'GOV.UK tag' : null;
    const o = OWNER_DECISIONS[slug];
    if (o) { ministers = o.minister_names; ministerSource = 'owner decision'; notes.push(o.why); }
    else if (!ministers) notes.push('The direction letter does not name the minister.');
    const _tag = people; // kept for the report: where the letter's name and GOV.UK's tag differ

    const orgs = (j.links.organisations || []).map((x) => x.title.trim());
    const hasSuccessor = orgs.some((x) => BEIS_SUCCESSORS.includes(x));
    const deptSlugs = [...new Set(orgs.map((x) => (x === BEIS ? (hasSuccessor ? null : 'business-trade') : ORG_TO_DEPT[x] || null)).filter(Boolean))];
    rows.push({
      id: j.content_id, slug, title: j.title.trim(), subject: subjectOf(j.title.trim()), summary: j.description || null,
      govuk_url: `https://www.gov.uk${j.base_path}`, published_on: published, updated_on: j.public_updated_at.slice(0, 10),
      direction_date: date, direction_date_source: dateSource, minister_names: ministers, minister_source: ministerSource,
      minister_roles: (j.links.roles || []).map((r) => r.title.trim()), organisations: orgs, dept_slugs: deptSlugs,
      letters: letters.map(({ title, url, format, kind }) => ({ title, url, format, kind })),
      check_notes: notes.join(' ') || null, _tag,
      _orgsUnmapped: orgs.filter((x) => !ORG_TO_DEPT[x] && x !== BEIS),
    });
  }

  // ---------- report ----------
  rows.sort((a, b) => (b.direction_date || b.published_on).localeCompare(a.direction_date || a.published_on));
  const pubs = rows.map((r) => r.published_on).sort();
  console.log(`${rows.length} directions, published ${pubs[0]} to ${pubs[pubs.length - 1]}; ${rows.reduce((n, r) => n + r.letters.length, 0)} letters`);
  console.log(`date given read: ${rows.filter((r) => r.direction_date).length}; minister: ${rows.filter((r) => r.minister_names).length} (tag ${rows.filter((r) => r.minister_source === 'GOV.UK tag').length}, letter ${rows.filter((r) => r.minister_source === 'letter text').length})`);
  const perDept = {};
  for (const r of rows) for (const s of r.dept_slugs) perDept[s] = (perDept[s] || 0) + 1;
  console.log('per department page:', Object.entries(perDept).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log('no department page:', rows.filter((r) => !r.dept_slugs.length).map((r) => r.slug).join(', ') || 'none');
  console.log('organisations with no department page:', [...new Set(rows.flatMap((r) => r._orgsUnmapped))].join('; '));
  for (const r of rows) {
    console.log(`\n${r.direction_date || '(date given not found)'}  ${r.subject}  [${r.dept_slugs.join(', ') || 'no dept page'}]`);
    console.log(`  minister: ${r.minister_names ? r.minister_names.join(' and ') + ` (${r.minister_source})` : 'not found'}; published ${r.published_on}; ${r.letters.length} letters`);
    if (r.check_notes) console.log(`  NOTE: ${r.check_notes}`);
  }
  console.log('\nletter name differs from the GOV.UK tag:');
  for (const r of rows) if (r.minister_source === 'letter text' && r._tag.length && r._tag.join('|') !== r.minister_names.join('|')) console.log(`  ${r.slug}: letter "${r.minister_names.join(' and ')}", tag "${r._tag.join(' and ')}"`);
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(rows.map(({ _orgsUnmapped, _tag, ...r }) => r), null, 1));

  // ---------- SQL ----------
  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql --sql-tag=<suffix> to write the transaction.'); return; }
  const tag = arg('sql-tag');
  if (!/^[a-z0-9_]+$/.test(tag)) fail('give --sql-tag=<backup table suffix>, e.g. 20261020a');
  const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
  const arr = (a) => (a == null ? 'NULL' : `ARRAY[${a.map(q).join(', ')}]::text[]`);
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', '',
    `CREATE TABLE public.ministerial_directions_backup_${tag} AS SELECT * FROM public.ministerial_directions;`,
    'DELETE FROM public.ministerial_directions;'];
  for (const r of rows) {
    L.push(`INSERT INTO public.ministerial_directions (id, slug, title, subject, summary, govuk_url, published_on, updated_on, direction_date, direction_date_source, minister_names, minister_source, minister_roles, organisations, dept_slugs, letters, check_notes) VALUES (${[
      q(r.id), q(r.slug), q(r.title), q(r.subject), q(r.summary), q(r.govuk_url), q(r.published_on), q(r.updated_on), q(r.direction_date), q(r.direction_date_source),
      arr(r.minister_names), q(r.minister_source), arr(r.minister_roles), arr(r.organisations), arr(r.dept_slugs), `${q(JSON.stringify(r.letters))}::jsonb`, q(r.check_notes)].join(', ')});`);
  }
  L.push('', 'DO $$', 'DECLARE n int;', 'BEGIN',
    '  SELECT count(*) INTO n FROM public.ministerial_directions;',
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    '  SELECT count(*) INTO n FROM public.ministerial_directions WHERE direction_date IS NOT NULL;',
    `  IF n <> ${rows.filter((r) => r.direction_date).length} THEN RAISE EXCEPTION 'expected ${rows.filter((r) => r.direction_date).length} dates, found %', n; END IF;`,
    'END $$;', '', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${rows.length} rows). Not run.`);
})().catch((e) => fail(e.stack || String(e)));
