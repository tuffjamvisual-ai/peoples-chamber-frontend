// Find MPs with a proven interest in a story, by subject and never by party (owner's approval, 29 Oct 2026; MP section
// of scripts/mail/outreach-rules.md). Read only: it sends nothing and writes nothing to the database. It writes one
// Markdown report.
//   npx tsx scripts/outreach/find-mps.ts --terms "Wixams,Bedford Borough Council" --since 2024-07-04 \
//     --areas "Mid Bedfordshire,Bedford" --committees "Transport Committee" --depts "Department for Transport" \
//     --out "Claude outputs/outreach/<name>-mps.md"
// Sources, all free Parliament APIs with no key:
//   written questions  questions-statements-api.parliament.uk (the term must be in the question or its heading)
//   spoken             hansard-api.parliament.uk (the term must be in the MP's own contribution)
//   committees         committees-api.parliament.uk, current memberships (the live source; our table is a copy)
//   front bench        members-api.parliament.uk government posts, opposition posts and every party's spokespersons
//   constituencies     members-api.parliament.uk constituency search; a council name is resolved to its seats through
//                      our database (welfare_constituency_geography, ONS lookup), read only
// Only current Commons members are kept. Score: 3 for a question or speech on the terms, 2 for a front bench brief,
// 2 for the seat, 1 for a committee; each counts once. Sorted by score, then by the amount of evidence, then by name.
// Party is shown but plays no part in scoring or sorting. No email addresses are read or stored.
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local', quiet: true });

const UA = 'opengovt.uk outreach research (https://www.opengovt.uk; contact@opengovt.uk)';
const PAUSE_MS = 400;
const MEMBERS = 'https://members-api.parliament.uk/api';

function opt(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return (eq ? eq.slice(name.length + 3) : i >= 0 ? process.argv[i + 1] : '') ?? '';
}
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
// Committee and department names can contain commas ("Housing, Communities and Local Government Committee"), so after
// splitting on commas, neighbouring pieces are joined back where the joined name is a known one (longest match first).
function joinKnown(pieces: string[], known: string[]): string[] {
  const set = new Set(known.map((k) => k.toLowerCase()));
  const outList: string[] = [];
  for (let i = 0; i < pieces.length;) {
    let j = pieces.length;
    while (j > i + 1 && !set.has(pieces.slice(i, j).join(', ').toLowerCase())) j--;
    outList.push(pieces.slice(i, j).join(', '));
    i = j;
  }
  return outList;
}

const terms = list(opt('terms'));
const since = opt('since');
const areas = list(opt('areas'));
let committees = list(opt('committees'));
let depts = list(opt('depts'));
const out = opt('out');
if (!terms.length || !/^\d{4}-\d{2}-\d{2}$/.test(since) || !out) {
  console.error('Usage: --terms "a,b" --since YYYY-MM-DD [--areas ...] [--committees ...] [--depts ...] --out file.md');
  process.exit(1);
}

const failures: string[] = [];
const notes: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One GET with a pause first; retried at most twice on a network error, 429 or 5xx. Returns null on failure.
async function getJson<T>(url: string, what: string): Promise<T | null> {
  for (let attempt = 0; attempt <= 2; attempt++) {
    await sleep(attempt === 0 ? PAUSE_MS : 2000 * attempt);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 429 && res.status < 500) { failures.push(`${what}: HTTP ${res.status}`); return null; }
      if (attempt === 2) failures.push(`${what}: HTTP ${res.status} after 2 retries`);
    } catch (e) {
      if (attempt === 2) failures.push(`${what}: ${e instanceof Error ? e.message : String(e)} after 2 retries`);
    }
  }
  return null;
}

type Reason = { kind: 'question' | 'speech' | 'frontbench' | 'seat' | 'committee'; text: string; url: string; date?: string };
const reasons = new Map<number, Reason[]>();
const seen = new Set<string>();
function add(id: number, r: Reason) {
  const key = `${id}|${r.kind}|${r.url}|${r.text}`;
  if (!id || seen.has(key)) return;
  seen.add(key);
  if (!reasons.has(id)) reasons.set(id, []);
  reasons.get(id)!.push(r);
}
const has = (text: string | null | undefined, term: string) => (text ?? '').toLowerCase().includes(term.toLowerCase());
const day = (iso: string) => iso.slice(0, 10);
const slug = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '').slice(0, 60) || 'Debate';

// a) Written questions whose question text or heading contains the term.
type WQ = { value: { askingMemberId: number; house: string; dateTabled: string; uin: string; questionText: string; heading: string | null; answeringBodyName: string } };
async function writtenQuestions(term: string) {
  let kept = 0, scanned = 0;
  for (let skip = 0; ; skip += 100) {
    const url = `https://questions-statements-api.parliament.uk/api/writtenquestions/questions?searchTerm=${encodeURIComponent(term)}&tabledWhenFrom=${since}&house=Commons&take=100&skip=${skip}`;
    const j = await getJson<{ totalResults: number; results: WQ[] }>(url, `written questions "${term}"`);
    if (!j) return;
    for (const { value: q } of j.results) {
      scanned++;
      if (q.house !== 'Commons' || !(has(q.questionText, term) || has(q.heading, term))) continue;
      kept++;
      add(q.askingMemberId, {
        kind: 'question', date: day(q.dateTabled),
        text: `Written question ${q.uin}${q.heading ? `, "${q.heading}"` : ''} to ${q.answeringBodyName}, tabled ${day(q.dateTabled)}`,
        url: `https://questions-statements.parliament.uk/written-questions/detail/${day(q.dateTabled)}/${q.uin}`,
      });
    }
    if (skip + 100 >= j.totalResults || j.results.length === 0) break;
  }
  notes.push(`Written questions "${term}": ${scanned} returned by the search, ${kept} with the term in the question or heading.`);
}

// b) Spoken contributions that contain the term in the MP's own words.
type Spoken = { MemberId: number; House: string; SittingDate: string; DebateSection: string; DebateSectionExtId: string; ContributionExtId: string; ContributionTextFull: string };
async function spoken(term: string) {
  let kept = 0, scanned = 0;
  for (let skip = 0; ; skip += 50) {
    const url = `https://hansard-api.parliament.uk/search/contributions/Spoken.json?queryParameters.searchTerm=${encodeURIComponent(term)}&queryParameters.startDate=${since}&queryParameters.house=Commons&queryParameters.take=50&queryParameters.skip=${skip}`;
    const j = await getJson<{ TotalResultCount: number; Results: Spoken[] }>(url, `Hansard spoken "${term}"`);
    if (!j) return;
    for (const c of j.Results) {
      scanned++;
      if (c.House !== 'Commons' || !c.MemberId || !has(c.ContributionTextFull, term)) continue;
      kept++;
      add(c.MemberId, {
        kind: 'speech', date: day(c.SittingDate),
        text: `Spoke in "${c.DebateSection.trim()}", ${day(c.SittingDate)}`,
        url: `https://hansard.parliament.uk/Commons/${day(c.SittingDate)}/debates/${c.DebateSectionExtId}/${slug(c.DebateSection)}#contribution-${c.ContributionExtId}`,
      });
    }
    if (skip + 50 >= j.TotalResultCount || j.Results.length === 0) break;
  }
  notes.push(`Hansard spoken "${term}": ${scanned} returned by the search, ${kept} with the term in the MP's own words.`);
}

// c) Current members of each named Commons committee.
type Committee = { id: number; name: string; house: string };
type CommitteeMember = { roles: { endDate: string | null; role: { name: string } }[]; memberInfo: { mnisId: number; house: string; isCurrent: boolean } };
async function committee(name: string, current: Committee[] | null) {
  const c = current?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!c) { if (current) failures.push(`committee "${name}": no current Commons committee with that exact name`); return; }
  const m = await getJson<{ items: CommitteeMember[] }>(`https://committees-api.parliament.uk/api/Committees/${c.id}/Members?MembershipStatus=Current&Take=100`, `committee members "${name}"`);
  for (const x of m?.items ?? []) {
    if (x.memberInfo?.house !== 'Commons' || !x.memberInfo.isCurrent) continue;
    const role = x.roles.filter((r) => !r.endDate).map((r) => r.role.name).includes('Chair') ? 'Chair' : 'Member';
    add(x.memberInfo.mnisId, { kind: 'committee', text: `${role}, ${c.name}`, url: `https://committees.parliament.uk/committee/${c.id}/` });
  }
  notes.push(`Committee "${c.name}" (id ${c.id}): ${m?.items.length ?? 0} current members from the committees API.`);
}

// d) Front bench: government and opposition posts for the department, and every party's spokespersons whose post
// names the department's subject.
type Post = { value: { name: string; postHolders: { endDate: string | null; member: { value: { id: number; latestHouseMembership: { house: number } } } }[] } };
function holders(p: Post, text: string) {
  for (const h of p.value.postHolders) {
    if (h.endDate || h.member.value.latestHouseMembership.house !== 1) continue;
    add(h.member.value.id, { kind: 'frontbench', text, url: `https://members.parliament.uk/member/${h.member.value.id}/career` });
  }
}
async function frontBench() {
  if (!depts.length) return;
  const all = await getJson<{ id: number; name: string }[]>(`${MEMBERS}/Reference/Departments`, 'departments list');
  if (all) depts = joinKnown(depts, all.map((d) => d.name));
  const parties = await getJson<{ items: { value: { id: number; name: string } }[] }>(`${MEMBERS}/Parties/GetActive/1`, 'Commons parties');
  const spokes: Post[] = [];
  for (const p of parties?.items ?? []) spokes.push(...((await getJson<Post[]>(`${MEMBERS}/Posts/Spokespersons?partyId=${p.value.id}`, `spokespersons, party ${p.value.id}`)) ?? []));
  for (const name of depts) {
    const d = all?.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!d) { if (all) failures.push(`department "${name}": not in the Members API list`); continue; }
    for (const p of (await getJson<Post[]>(`${MEMBERS}/Posts/GovernmentPosts?departmentId=${d.id}`, `government posts "${name}"`)) ?? []) holders(p, p.value.name);
    for (const p of (await getJson<Post[]>(`${MEMBERS}/Posts/OppositionPosts?departmentId=${d.id}`, `opposition posts "${name}"`)) ?? []) holders(p, p.value.name);
    // Spokesperson posts are not tied to a department in the API, so they are matched on the department's subject.
    const subjects = d.name.replace(/^(Ministry|Department) (of|for) /i, '').split(/,\s*|\s+and\s+/i).map((s) => s.trim()).filter((s) => s.length > 3);
    let n = 0;
    for (const p of spokes) {
      if (/Lords/i.test(p.value.name) || !subjects.some((s) => has(p.value.name, s))) continue;
      n++;
      holders(p, p.value.name);
    }
    notes.push(`Front bench "${d.name}" (id ${d.id}): government and opposition posts, and ${n} spokesperson posts naming ${subjects.join(', ')}.`);
  }
}

// e) Constituency MPs. A name that is not a constituency is tried as a council through our database.
type Seat = { value: { id: number; name: string; endDate: string | null; currentRepresentation: { member: { value: { id: number } } } | null } };
async function seats() {
  const sb = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
    : null;
  for (const area of areas) {
    const s = await getJson<{ items: Seat[] }>(`${MEMBERS}/Location/Constituency/Search?searchText=${encodeURIComponent(area)}&take=20`, `constituency "${area}"`);
    const seat = s?.items.find((x) => !x.value.endDate && x.value.name.toLowerCase() === area.toLowerCase());
    if (seat) {
      const id = seat.value.currentRepresentation?.member.value.id;
      if (id) add(id, { kind: 'seat', text: `MP for ${seat.value.name}`, url: `https://members.parliament.uk/constituency/${seat.value.id}/overview` });
      else failures.push(`constituency "${area}": no current MP`);
      continue;
    }
    if (!s) continue;
    if (!sb) { failures.push(`area "${area}": not a constituency, and no database key to try it as a council`); continue; }
    const name = area.replace(/\s+council$/i, '').trim();
    const { data: cs, error } = await sb.from('councils').select('name, short_name, slug, gss_code, type').or(`name.ilike.${name},short_name.ilike.${name},name.ilike.${area}`).limit(5);
    if (error || !cs?.length) { failures.push(`area "${area}": not a constituency or a council in our data${error ? ` (${error.message})` : ''}`); continue; }
    const c = cs[0] as { name: string; slug: string; gss_code: string; type: string };
    const col = c.type === 'county' ? 'county_gss_code' : 'council_gss_code';
    const { data: geo, error: gErr } = await sb.from('welfare_constituency_geography').select('constituency_gss_code').eq(col, c.gss_code).limit(500);
    const codes = [...new Set(((geo ?? []) as { constituency_gss_code: string }[]).map((g) => g.constituency_gss_code))];
    if (gErr || !codes.length) { failures.push(`council "${c.name}": no constituencies in the ONS lookup${gErr ? ` (${gErr.message})` : ''}`); continue; }
    const { data: mps, error: mErr } = await sb.from('mps').select('member_id, constituency').in('constituency_gss_code', codes).eq('current_member', true);
    if (mErr) { failures.push(`council "${c.name}": MP lookup failed (${mErr.message})`); continue; }
    for (const m of (mps ?? []) as { member_id: number; constituency: string }[]) {
      add(m.member_id, { kind: 'seat', text: `MP for ${m.constituency}, which overlaps ${c.name}`, url: `https://www.opengovt.uk/councils/${c.slug}` });
    }
    notes.push(`Area "${area}" resolved as the council ${c.name}: ${codes.length} overlapping constituencies (ONS lookup in our database).`);
  }
}

type Member = { value: { id: number; nameDisplayAs: string; latestParty: { name: string } | null; latestHouseMembership: { house: number; membershipFrom: string; membershipEndDate: string | null; membershipStatus: { statusIsActive: boolean } | null } } };
const SCORE: Record<Reason['kind'], number> = { question: 3, speech: 3, frontbench: 2, seat: 2, committee: 1 };
const LABEL: Record<Reason['kind'], string> = { question: 'Question', speech: 'Speech', frontbench: 'Front bench', seat: 'Seat', committee: 'Committee' };

async function main() {
  for (const t of terms) { await writtenQuestions(t); await spoken(t); }
  if (committees.length) {
    const current = (await getJson<{ items: Committee[] }>('https://committees-api.parliament.uk/api/Committees?CommitteeStatus=Current&House=Commons&Take=300', 'current Commons committees'))?.items ?? null;
    if (current) committees = joinKnown(committees, current.map((c) => c.name));
    for (const c of committees) await committee(c, current);
  }
  await frontBench();
  await seats();

  const rows: { id: number; name: string; party: string; seat: string; score: number; rs: Reason[] }[] = [];
  for (const [id, rs] of reasons) {
    const m = await getJson<Member>(`${MEMBERS}/Members/${id}`, `member ${id}`);
    const h = m?.value.latestHouseMembership;
    if (!m || !h || h.house !== 1 || h.membershipEndDate || h.membershipStatus?.statusIsActive === false) continue;
    // Each kind of reason counts once; a question and a speech are the same kind of evidence.
    const kinds = new Set(rs.map((r) => (r.kind === 'speech' ? 'question' : r.kind)));
    const score = [...kinds].reduce((s, k) => s + SCORE[k as Reason['kind']], 0);
    rows.push({ id, name: m.value.nameDisplayAs, party: m.value.latestParty?.name ?? '', seat: h.membershipFrom, score, rs });
  }
  rows.sort((a, b) => b.score - a.score || b.rs.length - a.rs.length || a.name.localeCompare(b.name));

  const md: string[] = [
    `# MPs with a proven interest`, '',
    `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by scripts/outreach/find-mps.ts. Read only; no email addresses.`, '',
    `Terms: ${terms.join('; ')}. Questions and speeches from ${since}.`,
    `Areas: ${areas.join('; ') || 'none'}. Committees: ${committees.join('; ') || 'none'}. Departments: ${depts.join('; ') || 'none'}.`, '',
    `Score: 3 question or speech on the terms, 2 front bench brief, 2 seat, 1 committee (each once). Party plays no part in scoring or sorting.`, '',
    `${rows.length} current Commons members found.`, '',
    `| # | MP | Party | Constituency | Score | Reasons |`, `|---|---|---|---|---|---|`,
    ...rows.map((r, i) => `| ${i + 1} | [${r.name}](https://www.opengovt.uk/mps/${r.id}) (${r.id}) | ${r.party} | ${r.seat} | ${r.score} | ${[...new Set(r.rs.map((x) => LABEL[x.kind]))].join(', ')} |`),
    '', '## Evidence', '',
  ];
  for (const r of rows) {
    md.push(`### ${r.name}, ${r.seat} (score ${r.score})`, '', `Open Govt profile: https://www.opengovt.uk/mps/${r.id}`, '');
    for (const x of [...r.rs].sort((a, b) => SCORE[b.kind] - SCORE[a.kind] || (b.date ?? '').localeCompare(a.date ?? ''))) md.push(`- ${LABEL[x.kind]}: [${x.text}](${x.url})`);
    md.push('');
  }
  md.push('## Sources', '', ...notes.map((n) => `- ${n}`), '', '## Failures', '', ...(failures.length ? failures.map((f) => `- ${f}`) : ['- None.']), '');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, md.join('\n'));
  console.log(`${rows.length} MPs written to ${out}`);
  for (const [i, r] of rows.slice(0, 10).entries()) console.log(`${i + 1}. ${r.name} (${r.party}, ${r.seat}) score ${r.score}: ${[...new Set(r.rs.map((x) => LABEL[x.kind]))].join(', ')}`);
  console.log(failures.length ? `Failures:\n${failures.map((f) => `  ${f}`).join('\n')}` : 'No source failed.');
}

main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
