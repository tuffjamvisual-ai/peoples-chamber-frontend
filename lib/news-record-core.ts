// "What the record shows" on press release pages (Cowork ENTRY 368, owner approved 19 Nov 2026; SAMPLE, behind the
// NEWS_RECORD_BOX flag, lib/news-record.ts). Built only from data opengovt holds, each item linked to an opengovt page
// (ENTRY 369: never to outside data). No summary is written by a model: every line is a fixed sentence filled with the
// record's own fields (dates, counts, stages, figures). No time words ("recently", "now", "currently", "this year").
//
// What is matched, from the release's own text (title, summary, body), never loose keywords:
//   bills and Acts   a name ending "Bill" or "Act" (with its year), looked up by title in bill;
//   places           council and constituency names written in full (case as written, whole words), minus names that
//                    are also everyday words or people's names (AMBIGUOUS_PLACES);
//   bodies           organisations on the record with contracts or grants (organisation_index), named in full;
//   named things     proper names of two or more capitalised words ("Great British Energy", "Sizewell C") and coined
//                    single names (Ofwat, HS2), with titles, departments, people's names and generic phrases left out.
// Written questions, debates, early day motions and Commons divisions are found by those names only.
//
// This file holds no database client: lib/news-record.ts reads through supabase in the site's tagged cache, and
// scripts/news-record/sample-368.ts reads through psql in a READ ONLY transaction, with the same queries.
import { resolveOrgToDeptSlug } from './govOrgSlug';
import { departments } from './departments';
import { DEPARTMENT_BUDGETS, fmtBn, totalSpend } from './department-budgets';
import { displayMpName } from './mp-name';

export type Kind = 'spending' | 'bills' | 'divisions' | 'debates' | 'questions' | 'edms' | 'places' | 'organisations';
export const KIND_ORDER: Kind[] = ['spending', 'bills', 'divisions', 'debates', 'questions', 'edms', 'places', 'organisations'];
export const KIND_HEADING: Record<Kind, string> = {
  spending: 'Department budget',
  bills: 'Bills and Acts',
  divisions: 'Commons votes',
  debates: 'Debates',
  questions: 'Written questions',
  edms: 'Early day motions',
  places: 'Places named',
  organisations: 'Organisations named',
};

export type RecordItem = { kind: Kind; href: string; label: string; note: string; matchedOn: string };
export type NewsRecord = {
  items: RecordItem[];
  kinds: Kind[];
  words: number;
  names: Names;
  qualifies: boolean;
  why: string;
  qualifiesStrict: boolean; // the same rule with the department budget line not counted (it is the same on every release)
};

export type ReleaseInput = { id: number; title: string; description: string | null; organisation: string | null; body: string | null };

// Reference lists (small, read once and shared between pages).
export type CouncilRef = { slug: string; name: string; short_name: string | null; type_label: string | null; population: number | null; council_tax_band_d_pounds: number | null; political_control: string | null };
export type SeatRef = { slug: string; name: string; ons_code: string };
export type MpRef = { member_id: number; name: string | null; display_name: string | null; party: string | null; constituency: string | null; constituency_gss_code: string | null; current_member: boolean | null };
export type OrgRef = { slug: string; name: string; name_variants: string[] | null; contracts: number; contract_value: number; grants: number; grant_value: number };
export type Refs = { councils: CouncilRef[]; seats: SeatRef[]; mps: MpRef[]; orgs: OrgRef[] };

export type WqRow = { id: number; uin: string; house: string | null; heading: string | null; date_tabled: string; date_answered: string | null; answering_body: string | null; asking_member_id: number | null };
export type DebateRow = { hansard_ext_id: string; title: string; sitting_date: string; section: string | null; house: string | null };
export type EdmRow = { id: number; uin_with_suffix: string | null; uin: number | null; title: string; date_tabled: string; signature_count: number | null };
export type BillRow = { id: number; title: string; is_act: boolean | null; current_stage: string | null; originating_house: string | null; status: string | null };
export type DivisionRow = { date: string; number: number; title: string; ayes: number | null; noes: number | null };

export interface NewsRecordReader {
  questions(phrases: string[]): Promise<WqRow[]>;
  debates(phrases: string[]): Promise<DebateRow[]>;
  edms(phrases: string[]): Promise<EdmRow[]>;
  bills(cores: string[]): Promise<BillRow[]>;
  divisions(phrases: string[]): Promise<DivisionRow[]>;
}

export const LIST_MAX = 13; // 3 shown on phones, then Show 10 more (owner's list rule)
export const FETCH_MAX = 40; // rows read per kind, so one common name cannot fill a list on its own (spread() below)
export const MAX_PHRASES = 5;

// ---------- Text ----------
export const plainText = (html: string) => html
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<\/(p|li|h[1-6]|div|tr|blockquote)>/gi, '. ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;/g, '’').replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Whole words, case as written ("Reading" the town, not "reading").
const named = (text: string, name: string) => new RegExp(`(^|[^A-Za-z0-9’'-])${esc(name)}($|[^A-Za-z0-9-])`).test(text);
const countNamed = (text: string, name: string) => (text.match(new RegExp(`(^|[^A-Za-z0-9’'-])${esc(name)}(?=$|[^A-Za-z0-9-])`, 'g')) || []).length;
// Only letters, digits, spaces, hyphens and apostrophes reach a query (PostgREST filters and tsquery syntax).
export const safePhrase = (s: string) => s.replace(/[^A-Za-z0-9 ’'-]/g, ' ').replace(/\s+/g, ' ').trim();
export const words = (s: string) => (s.match(/[A-Za-z0-9£][A-Za-z0-9£.,’'%-]*/g) || []).length;

const dateLong = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
};
const n0 = (n: number) => n.toLocaleString('en-GB');
const money = (n: number) => (n >= 1e9 ? `£${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `£${(n / 1e6).toFixed(1)}m` : n >= 1e3 ? `£${Math.round(n / 1e3)}k` : `£${Math.round(n)}`);

// ---------- Names in the release ----------
// Place names that are also everyday words, people's names, other places or titles ("Chancellor of the Duchy of
// Lancaster", "Westminster" for Parliament): never matched as places on their own.
const AMBIGUOUS_PLACES = new Set(['Reading', 'Hart', 'Rother', 'Westminster', 'Bury', 'Sutton', 'Boston', 'Lancaster', 'Windsor', 'Highland', 'Wyre', 'Swale', 'Bath', 'Gower', 'Rugby', 'Stafford', 'Bedford', 'Selby', 'Halifax', 'Livingston', 'Christchurch', 'Newark', 'Telford', 'Poole', 'Barking', 'Angus', 'Moray', 'Lincoln', 'Preston', 'Warwick', 'Merton', 'Brent', 'Harrow', 'Stroud', 'Derby', 'Durham', 'Kent', 'Devon', 'Essex', 'Cornwall', 'Dover', 'Newport', 'Sandwell', 'Tatton', 'Hendon', 'Witham', 'Foyle', 'Strangford', 'Huntingdon', 'Chorley', 'Fylde', 'Halton', 'Carlisle', 'Cumberland', 'Maldon', 'Melton', 'Blaby', 'Arun', 'Adur', 'Boston', 'Hastings', 'Ashford', 'Dudley', 'Bolton', 'Wigan', 'Stockport', 'Chester', 'Cambridge', 'Oxford', 'Manchester', 'Birmingham', 'Liverpool', 'Glasgow', 'Cardiff', 'Belfast', 'Edinburgh', 'London']);
// Big cities are left out above as single words because they are named in passing so often ("a Manchester firm");
// their councils still match by the council's full name ("Manchester City Council").

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const DAYS = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
// Whole phrases that are titles, institutions named on almost every release, report furniture or countries: never a
// subject on their own.
const GENERIC = new Set(['rt hon', 'right honourable', 'prime minister', 'deputy prime minister', 'secretary of state', 'his majesty', 'her majesty', 'king', 'queen', 'government', 'uk government', 'hm government', 'british government', 'notes to editors', 'press office', 'media enquiries', 'further information', 'find out more', 'read more', 'united kingdom', 'great britain', 'northern ireland', 'england', 'scotland', 'wales', 'britain', 'uk', 'house of commons', 'house of lords', 'parliament', 'members of parliament', 'labour', 'conservative', 'liberal democrats', 'reform uk', 'european union', 'united states', 'united nations', 'plan for change', 'spending review', 'autumn budget', 'spring statement', 'budget', 'armed forces', 'royal navy', 'british army', 'royal air force', 'civil service', 'nhs', 'nhs england', 'special report', 'final report', 'government response', 'first report', 'second report', 'third report', 'fourth report', 'fifth report', 'sixth report', 'call for evidence', 'impact assessment', 'royal assent', 'white paper', 'green paper', 'press release', 'gov.uk', 'gov uk', 'official warning', 'england and wales', 'crown dependencies', 'isle of man', 'the king', 'crown court', 'court of appeal', 'high court', 'supreme court', 'public bodies', 'local authorities', 'local government', 'combined authority', 'mayoral strategic authorities', 'national nature reserve', 'annual report', 'annual progress report', 'terms of reference', 'q and a', 'in and out',
  // English regions and nations' parts: named in passing on many releases, and every MP for a seat in them matches.
  'north east', 'north west', 'south east', 'south west', 'east midlands', 'west midlands', 'east of england', 'yorkshire and the humber', 'yorkshire and humber', 'greater london', 'north of england', 'south of england', 'north wales', 'south wales', 'mid wales', 'west wales', 'highlands and islands', 'central belt',
  // Countries of two words or more (a country is not the subject of a release about one agreement with it).
  'saudi arabia', 'united arab emirates', 'new zealand', 'south africa', 'south korea', 'north korea', 'sri lanka', 'sierra leone', 'republic of ireland', 'czech republic', 'hong kong', 'costa rica', 'el salvador', 'papua new guinea', 'ivory coast', 'burkina faso', 'bosnia and herzegovina', 'trinidad and tobago', 'democratic republic of the congo', 'republic of mali', 'government of ireland', 'united states of america', 'united kingdom of great britain', 'european commission', 'middle east', 'south sudan', 'dominican republic', 'cape verde', 'san marino', 'solomon islands', 'marshall islands', 'falkland islands', 'british virgin islands', 'cayman islands', 'channel islands', 'washington dc']);
// Words that start a sentence or a heading but are not part of a name ("If the CMA", "According to", "Today 18").
const LEAD = new Set(['The', 'This', 'These', 'That', 'Those', 'Our', 'We', 'It', 'Its', 'Today', 'Yesterday', 'Tomorrow', 'In', 'On', 'At', 'For', 'From', 'By', 'With', 'As', 'And', 'But', 'If', 'When', 'Where', 'While', 'Whilst', 'New', 'More', 'Over', 'Under', 'Up', 'Down', 'After', 'Before', 'Since', 'Now', 'Latest', 'First', 'Second', 'Third', 'All', 'Every', 'Each', 'Some', 'Many', 'Most', 'Other', 'Such', 'Both', 'Also', 'Read', 'Find', 'See', 'Visit', 'Contact', 'Follow', 'Sign', 'According', 'Within', 'Existing', 'Top', 'Your', 'My', 'His', 'Her', 'Their', 'A', 'An', 'Major', 'Historic', 'Landmark', 'Further', 'Under', 'Through', 'Across', 'Following', 'Phone', 'Telephone', 'Email', 'Tel', 'Join', 'Help', 'Get', 'Apply', 'Have', 'Has', 'Will', 'Can', 'Should', 'Must', 'May', 'There', 'Here', 'Why', 'How', 'What', 'Who', 'Which', 'Whether', 'Once', 'Until', 'During', 'Between', 'About', 'Around', 'Last', 'Next', 'Previous', 'Including', 'Ahead', 'Together', 'Every', 'Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Sir', 'Dame', 'Lord', 'Baroness', 'Lady', 'Professor', 'Prof', 'Cllr', 'Councillor', 'Rt', 'Hon', 'Minister', 'Ministers', 'Secretary', 'Chancellor', 'Mayor', 'Commander', 'Chief', 'Director', 'Chair', 'Chairman', 'Deputy', 'Executive', 'Head', 'Leader']);
// A name with a role or honour in it is a person or a post, not a subject.
const ROLE = /\b(?:Secretary|Minister|Ministers|Chancellor|Director|Directors|Chief|Chair|Chairman|Chairwoman|Officer|Manager|Mayor|Commander|Founder|Co-Founder|CEO|CFO|Executive|Head|Lead|Spokesperson|Spokesman|President|Vice|Deputy|Commissioner|Inspector|Ambassador|Envoy|Councillor|Cllr|MP|MPs|KC|QC|OBE|CBE|MBE|TD|MEP|MSP|MS|MLA|Professor|Dr|Sir|Dame|Lord|Baroness|Lady|Mr|Mrs|Ms|Rt|Hon|Marshal|General|Admiral|Colonel|Captain|Owner|Partner|Trustee|Trustees|Committee|Session|House|Report|Response|Reports)\b/;
const ROLE_AFTER = /^[’']?s?,?\s*(?:the\s+|a\s+)?(?:Minister|Secretary|Chief|Director|Chair|Chairman|Head|Leader|Commissioner|MP|President|Managing|Founder|CEO|said|says|added|commented|explained|told|who\b)/;
const ROLE_BEFORE = /(?:Minister|Secretary|Chancellor|Director|Chair|Chief Executive|MP|Lord|Baroness|Dr|Sir|Dame|Professor|Mr|Mrs|Ms|Councillor|Cllr|said|says|by|from)\s*,?\s*$/;
// Places named as part of another name: "Southwark Crown Court", "Newcastle University", "HMP Leeds".
const PLACE_NOT_AFTER = /^[’']?s?\s+(?:Crown|Magistrates|County Court|Court|University|College|Airport|Station|Hospital|Cathedral|FC|Football|Rugby|Cricket|United|Rovers|Wanderers|Prison|Port|Harbour|Docks|Building Society|Arena|Stadium|Agreement|Declaration|Accord|Convention|Treaty|Summit|Framework|Principles)\b/;
const PLACE_NOT_BEFORE = /(?:HMP|HMYOI|RAF|HMS|Lord|Baroness|Bishop of|Duke of|Duchess of|Earl of|Archbishop of)\s+$/;

export type Names = { bills: string[]; phrases: string[]; councils: CouncilRef[]; seats: SeatRef[]; orgs: OrgRef[] };

const titleWord = (w: string) => /^(?:[A-Z][A-Za-z’'.-]*[A-Za-z]|[A-Z]|[A-Z0-9]{2,}[a-z]?|[A-Z][A-Za-z]*\d+[A-Za-z]*)$/.test(w) && !/^\d+$/.test(w);
// The regulators named Of-something (Ofwat, Ofgem ...): single words that are names.
const OF_BODY = /^Of(?:wat|gem|sted|com|qual|reg|rail|fsted)$/;
const CONNECT = new Set(['of', 'for', 'the', 'upon', 'under', 'de', 'on']);

// Every place a name is written, whole words, case as written.
function placeAt(text: string, name: string): boolean {
  const re = new RegExp(`(^|[^A-Za-z0-9’'-])${esc(name)}(?=$|[^A-Za-z0-9-])`, 'g');
  for (const m of text.matchAll(re)) {
    const end = (m.index ?? 0) + m[0].length;
    const before = text.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + m[1].length);
    if (PLACE_NOT_AFTER.test(text.slice(end, end + 40)) || PLACE_NOT_BEFORE.test(before)) continue;
    return true;
  }
  return false;
}

export function extractNames(r: ReleaseInput, refs: Refs): Names {
  const text = plainText(`${r.title}. ${r.description || ''}. ${r.body || ''}`);
  const bare = (n: string) => n.replace(/^(?:The\s+)?(?:(?:Rt\.?\s+Hon\.?|Sir|Dame|Dr|Mr|Mrs|Ms|Miss)\s+)+/i, '').replace(/\s+(?:MP|KC|CBE|OBE|MBE)\b.*$/, '').trim();
  const mpNames = new Set(refs.mps.map((m) => bare(m.name || '')).filter(Boolean));
  const firstNames = new Set([...mpNames].map((n) => n.split(/\s+/)[0]).filter((f) => f.length >= 2));
  // The issuer's own name (and its initials) is not a subject: every release it issues names it.
  const issuer = (r.organisation || '').replace(/\s+/g, ' ').trim();
  const issuerInitials = issuer.split(/[\s,&]+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('');
  const ownNames = new Set([...departments.map((d) => d.name), issuer, issuer.replace(/^The /, '')].filter(Boolean).map((s) => s.toLowerCase().replace(/&/g, 'and')));
  const isOwn = (p: string) => { const l = p.toLowerCase().replace(/&/g, 'and'); return ownNames.has(l) || [...ownNames].some((o) => o.length > 6 && (o.includes(l) || l.includes(o))) || (issuerInitials.length >= 2 && p === issuerInitials); };

  // Bills and Acts: "<Name> Bill" (a name of two words or more) and "<Name> Act <year>".
  const bills = new Set<string>();
  for (const m of text.matchAll(/((?:(?:[A-Z][A-Za-z’'-]*|of|and|for|the|on|in|to|\(No\. ?\d\)|&)\s+){1,10})(Bill|Act)\b(\s+\d{4})?/g)) {
    let name = m[1].trim();
    // From the last word that cannot start a bill's name ("Guide to the Commonhold..." -> "Commonhold...").
    name = name.replace(/^.*\b(?:Guide|guide|to the|through the|of the|on the|the|The|This|A|An|New|Government’s|Government's|Our|Their|Draft|draft|Parliament’s|Parliament's)\s+(?=[A-Z])/, '');
    name = name.replace(/^(?:(?:of|and|for|on|in|to|&)\s+)+/, '').replace(/\s+(?:of|and|for|the|on|in|to|&)$/, '').trim();
    const wordsIn = name.split(/\s+/).filter(Boolean);
    const year = (m[3] || '').trim();
    if (!/^[A-Z]/.test(name) || name.length < 4) continue;
    if (m[2] === 'Bill' && wordsIn.length < 2) continue;
    if (m[2] === 'Act' && !year && wordsIn.length < 2) continue;
    if (/^(?:Private Members|Government|Royal Assent|Royal Assent of)$/i.test(name)) continue;
    bills.add(m[2] === 'Act' && year ? `${name} Act ${year}` : name);
  }

  // Places: council and constituency names in full, not as part of another name.
  const councils = refs.councils.filter((c) => {
    if (placeAt(text, c.name)) return true;
    const s = c.short_name;
    return !!s && s.length >= 4 && !AMBIGUOUS_PLACES.has(s) && !/^(?:City|County|Borough|District)\b/.test(s) && placeAt(text, s);
  });
  const seats = refs.seats.filter((s) => !AMBIGUOUS_PLACES.has(s.name) && placeAt(text, s.name));

  // Organisations on the record with contracts or grants, named in full (two words or more, or one long name).
  const orgs: OrgRef[] = [];
  const seenOrg = new Set<string>();
  for (const o of refs.orgs) {
    if (!o.contracts && !o.grants) continue;
    const forms = [o.name, ...(o.name_variants || [])].map((n) => n.replace(/\s+(?:Limited|Ltd\.?|PLC|plc|LLP|LP|Inc\.?)$/i, '').trim())
      .filter((n) => n.length >= 6 && (n.includes(' ') || n.length >= 8) && !GENERIC.has(n.toLowerCase()) && !isOwn(n));
    // Company names are often stored in capitals: matched in the case the release writes them, or in capitals.
    const titled = (f: string) => f.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, x, y) => x + y.toUpperCase());
    const hit = forms.some((f) => named(text, f) || (f === f.toUpperCase() && f.includes(' ') && named(text, titled(f))));
    if (hit && !seenOrg.has(o.slug)) { seenOrg.add(o.slug); orgs.push(o); }
  }

  // Proper names: runs of capitalised words (with "of", "for", "the" inside), split at "and", brackets and punctuation.
  const counts = new Map<string, { n: number; at: number }>();
  const tokens = text.split(/\s+/);
  const clean = (w: string) => w.replace(/^[("“‘']+|[)"”’',.;:!?]+$/g, '').replace(/[’']s$/, '');
  const stops = (w: string) => /^\(/.test(w) || /[,.;:!?)"”]$/.test(w) || /[’']s[,.;:!?]?$/.test(w);
  let pos = 0;
  for (let i = 0; i < tokens.length; i++) {
    const at = text.indexOf(tokens[i], pos);
    if (at >= 0) pos = at;
    const first = clean(tokens[i]);
    if (!titleWord(first) || LEAD.has(first)) continue;
    const run: string[] = [first];
    let j = i + 1;
    let end = stops(tokens[i]);
    while (!end && j < tokens.length && run.length < 7) {
      if (/^\(/.test(tokens[j])) break;
      const w = clean(tokens[j]);
      if (titleWord(w) && !/^\d/.test(w)) { run.push(w); end = stops(tokens[j]); j++; continue; }
      if (CONNECT.has(w) && j + 1 < tokens.length && titleWord(clean(tokens[j + 1]))) { run.push(w); j++; continue; }
      break;
    }
    while (run.length && (CONNECT.has(run[run.length - 1]) || /^[A-Z]{1}$/.test(run[run.length - 1]) && run.length > 2)) run.pop();
    const phrase = run.join(' ');
    const multi = run.length >= 2;
    const coined = run.length === 1 && (OF_BODY.test(phrase) || /^(?=.*\d)(?=.*[A-Z])[A-Z][A-Z0-9]{1,6}$/.test(phrase));
    const keep = (multi || coined) && !GENERIC.has(phrase.toLowerCase()) && !isOwn(phrase) && !mpNames.has(phrase) && !ROLE.test(phrase)
      && !new RegExp(`\\b(?:${MONTHS}|${DAYS})\\b`).test(phrase) && !/\b(?:Bill|Act)$/.test(phrase) && !/\b(?:Department|Ministry) (?:for|of)\b/.test(phrase)
      && !/^(?:HC|HL)\s?\d/.test(phrase) && !(run.length <= 3 && firstNames.has(run[0]) && run.slice(1).every((w) => /^[A-Z][a-z’'-]+$/.test(w)));
    if (keep) {
      const before = text.slice(Math.max(0, pos - 40), pos);
      const after = text.slice(pos + phrase.length, pos + phrase.length + 40);
      const person = run.length <= 3 && (ROLE_AFTER.test(after) || ROLE_BEFORE.test(before));
      if (!person) { const c = counts.get(phrase) ?? { n: 0, at: pos }; c.n++; counts.set(phrase, c); }
    }
    i = Math.max(i, j - 1);
  }
  // A two word name seen once is often a person or a heading: kept if seen twice, or three words or more, or coined.
  const kept = [...counts.entries()]
    .filter(([p, c]) => c.n >= 2 || p.split(' ').length >= 3 || /\d/.test(p) || OF_BODY.test(p))
    .filter(([p]) => !refs.councils.some((c) => c.name === p || c.short_name === p) && !refs.seats.some((s) => s.name === p))
    .sort((a, b) => b[1].n - a[1].n || a[1].at - b[1].at)
    .map(([p]) => p);
  // Names inside a longer kept name are dropped ("British Energy" inside "Great British Energy").
  const phrases = kept.filter((p, i) => !kept.some((q, k) => k !== i && q.length > p.length && q.includes(p)))
    .filter((p) => p.includes(' ') || /\d/.test(p) || OF_BODY.test(p));
  return { bills: [...bills], phrases, councils, seats, orgs };
}

// The names a search uses: bills first, then the proper names most often written; at most MAX_PHRASES. Places are not
// searched on (a town's name finds every question about the town, not this announcement's subject): they give the
// council and MP items instead.
export function searchPhrases(n: Names): string[] {
  const out: string[] = [];
  const add = (p: string) => { const s = safePhrase(p); if (s.length >= 4 && !out.some((o) => o.toLowerCase() === s.toLowerCase()) && out.length < MAX_PHRASES) out.push(s); };
  for (const b of n.bills) add(b);
  for (const p of n.phrases) add(p);
  return out;
}

// ILIKE patterns (shared by the page and the sample script): a name anywhere, either apostrophe; a bill by its title,
// as a Bill or as the Act it became.
export const containsPattern = (p: string) => `%${p.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[’']/g, '_')}%`;
export const billPatterns = (cores: string[]) => cores.flatMap((c) => (/ Act \d{4}$/.test(c) ? [c] : [`${c} Bill`, `${c} Act`]).map((x) => `${x.replace(/[%_\\]/g, (ch) => `\\${ch}`).replace(/[’']/g, '_')}%`));

// A websearch query: quoted names joined by OR (each name must appear as a phrase).
export const websearchOr = (phrases: string[]) => phrases.map((p) => `"${p.replace(/"/g, '')}"`).join(' OR ');

// ---------- The box ----------
const which = (phrases: string[], ...fields: (string | null | undefined)[]) => {
  const hay = fields.filter(Boolean).join(' ').toLowerCase();
  return phrases.find((p) => hay.includes(p.toLowerCase())) || phrases.join(' / ');
};

// Up to LIST_MAX rows taking each name in turn (newest first within a name), so a release naming "Universal Credit"
// and "Youth Guarantee" lists both rather than 13 rows of the commoner one.
function spread<T>(rows: T[], title: (r: T) => string | null | undefined, phrases: string[]): T[] {
  const groups = phrases.map(() => [] as T[]);
  const other: T[] = [];
  for (const r of rows) {
    const t = (title(r) || '').toLowerCase().replace(/[’']/g, "'");
    const k = phrases.findIndex((p) => t.includes(p.toLowerCase().replace(/[’']/g, "'")));
    (k >= 0 ? groups[k] : other).push(r);
  }
  const out: T[] = [];
  for (let i = 0; out.length < LIST_MAX; i++) {
    let any = false;
    for (const g of groups) if (i < g.length && out.length < LIST_MAX) { out.push(g[i]); any = true; }
    if (!any) break;
  }
  for (const r of other) if (out.length < LIST_MAX) out.push(r);
  return out;
}

export async function buildNewsRecord(r: ReleaseInput, refs: Refs, reader: NewsRecordReader): Promise<NewsRecord> {
  const names = extractNames(r, refs);
  const phrases = searchPhrases(names);
  const billCores = names.bills.map(safePhrase).filter((b) => b.length >= 4).slice(0, 4);
  const items: RecordItem[] = [];
  const mpById = new Map(refs.mps.map((m) => [m.member_id, m]));

  // 1. The issuing department's budget line, as the department page shows it (its Budget tab).
  const deptSlug = r.organisation ? resolveOrgToDeptSlug(r.organisation) : null;
  const budget = deptSlug ? DEPARTMENT_BUDGETS[deptSlug] : null;
  const dept = deptSlug ? departments.find((d) => d.slug === deptSlug) : null;
  if (budget && dept) {
    items.push({
      kind: 'spending', href: `/departments/${deptSlug}#budget`, label: `${dept.name}: budget ${budget.year}`, matchedOn: `issuing organisation (${r.organisation})`,
      note: `Total ${fmtBn(totalSpend(budget))} in ${budget.year}: resource spending (Resource DEL) ${fmtBn(budget.resourceDel)} and capital spending (Capital DEL) ${fmtBn(budget.capitalDel)}${budget.ame !== undefined ? `, with ${fmtBn(budget.ame)} of demand led spending (AME)` : ''}.`,
    });
  }

  const [bills, divisions, debates, questions, edms] = await Promise.all([
    billCores.length ? reader.bills(billCores) : Promise.resolve([] as BillRow[]),
    phrases.length ? reader.divisions(phrases) : Promise.resolve([] as DivisionRow[]),
    phrases.length ? reader.debates(phrases) : Promise.resolve([] as DebateRow[]),
    phrases.length ? reader.questions(phrases) : Promise.resolve([] as WqRow[]),
    phrases.length ? reader.edms(phrases) : Promise.resolve([] as EdmRow[]),
  ]);

  for (const b of bills.slice(0, LIST_MAX)) {
    const stage = b.current_stage ? `Stage reached: ${b.current_stage}.` : '';
    items.push({
      kind: 'bills', href: `/bills/${b.id}`, label: b.title, matchedOn: which(billCores, b.title),
      note: `${b.is_act ? 'Act of Parliament' : 'Bill'}${b.originating_house ? `, introduced in the ${b.originating_house === 'Lords' ? 'House of Lords' : 'House of Commons'}` : ''}. ${stage}`.trim(),
    });
  }
  for (const d of spread(divisions, (x) => x.title, phrases)) {
    const counts = d.ayes != null && d.noes != null ? ` ${n0(d.ayes)} MPs voted aye and ${n0(d.noes)} no.` : '';
    items.push({ kind: 'divisions', href: `/divisions/pw-${d.date.slice(0, 10)}-${d.number}-commons`, label: d.title, matchedOn: which(phrases, d.title), note: `Commons division ${d.number} on ${dateLong(d.date)}.${counts}` });
  }
  for (const d of spread(debates, (x) => x.title, phrases)) {
    const where = d.section ? `${d.section}` : d.house === 'Lords' ? 'House of Lords' : 'House of Commons';
    items.push({ kind: 'debates', href: `/debates/${d.hansard_ext_id.toUpperCase()}`, label: d.title, matchedOn: which(phrases, d.title), note: `${where}, ${dateLong(d.sitting_date)}.` });
  }
  for (const q of spread(questions, (x) => x.heading, phrases)) {
    const asker = q.asking_member_id ? mpById.get(q.asking_member_id) : undefined;
    const who = asker ? `${displayMpName(asker.display_name || asker.name)}${asker.constituency ? ` (${asker.constituency})` : ''}` : `a member of the ${q.house === 'Lords' ? 'House of Lords' : 'House of Commons'}`;
    const answered = q.date_answered ? `answered on ${dateLong(q.date_answered)}${q.answering_body ? ` by the ${q.answering_body.replace(/^the /i, '')}` : ''}` : `not answered${q.answering_body ? `; put to the ${q.answering_body.replace(/^the /i, '')}` : ''}`;
    items.push({ kind: 'questions', href: `/questions/${q.id}`, label: q.heading || `Written question ${q.uin}`, matchedOn: which(phrases, q.heading), note: `Asked by ${who} on ${dateLong(q.date_tabled)}, ${answered}.` });
  }
  for (const e of spread(edms, (x) => x.title, phrases)) {
    const sig = e.signature_count != null ? ` Signed by ${n0(e.signature_count)} ${e.signature_count === 1 ? 'MP' : 'MPs'}.` : '';
    items.push({ kind: 'edms', href: `/edms/${e.id}`, label: e.title, matchedOn: which(phrases, e.title), note: `Early day motion ${e.uin_with_suffix || e.uin || ''}, tabled on ${dateLong(e.date_tabled)}.${sig}` });
  }

  // Places named: the council page, and the MP for a constituency named.
  const places: RecordItem[] = [];
  for (const c of names.councils) {
    const bits = [c.type_label, c.population ? `population ${n0(c.population)}` : null, c.council_tax_band_d_pounds ? `Band D council tax £${n0(c.council_tax_band_d_pounds)}` : null, c.political_control ? `control: ${c.political_control}` : null].filter(Boolean);
    places.push({ kind: 'places', href: `/councils/${c.slug}`, label: c.name, matchedOn: c.name, note: bits.length ? `${bits.join('; ')}.`.replace(/^./, (x) => x.toUpperCase()) : 'The council for the area named.' });
  }
  for (const s of names.seats) {
    const mp = refs.mps.find((m) => m.current_member && m.constituency_gss_code === s.ons_code);
    if (mp) places.push({ kind: 'places', href: `/mps/${mp.member_id}`, label: `${displayMpName(mp.display_name || mp.name)}`, matchedOn: s.name, note: `${mp.party ? `${mp.party} ` : ''}MP for ${s.name}.` });
    else places.push({ kind: 'places', href: `/constituencies/${s.slug}`, label: s.name, matchedOn: s.name, note: 'The constituency named.' });
  }
  items.push(...places.slice(0, LIST_MAX));

  for (const o of names.orgs.slice(0, LIST_MAX)) {
    const bits = [o.contracts ? `${n0(o.contracts)} government ${o.contracts === 1 ? 'contract' : 'contracts'}${o.contract_value ? ` worth ${money(Number(o.contract_value))}` : ''}` : null, o.grants ? `${n0(o.grants)} ${o.grants === 1 ? 'grant' : 'grants'}${o.grant_value ? ` worth ${money(Number(o.grant_value))}` : ''}` : null].filter(Boolean);
    items.push({ kind: 'organisations', href: `/organisations/${o.slug}`, label: o.name, matchedOn: o.name, note: `${bits.join(' and ')} on opengovt’s record.`.replace(/^./, (x) => x.toUpperCase()) });
  }

  // Distinct links only.
  const seen = new Set<string>();
  const uniq = items.filter((i) => (seen.has(i.href) ? false : (seen.add(i.href), true)));
  return { ...judge(uniq), names };
}

// The proposed index rule (ENTRY 368 item 2; reported, not switched on): at least 3 distinct linked items, of at least
// two kinds, and about 150 words of the box's own text (the items' titles and lines; the heading is the same on every
// page and is not counted).
export const RULE = { minItems: 3, minKinds: 2, minWords: 150 };
export function judge(items: RecordItem[]): Omit<NewsRecord, 'names'> {
  const kinds = KIND_ORDER.filter((k) => items.some((i) => i.kind === k));
  const w = items.reduce((s, i) => s + words(i.label) + words(i.note), 0);
  const test = (list: RecordItem[], ks: Kind[], wc: number) => {
    const fails: string[] = [];
    if (list.length < RULE.minItems) fails.push(`${list.length} ${list.length === 1 ? 'item' : 'items'} (needs ${RULE.minItems})`);
    if (ks.length < RULE.minKinds) fails.push(`${ks.length} ${ks.length === 1 ? 'kind' : 'kinds'} (needs ${RULE.minKinds})`);
    if (wc < RULE.minWords) fails.push(`${wc} words (needs ${RULE.minWords})`);
    return fails;
  };
  const fails = test(items, kinds, w);
  const rest = items.filter((i) => i.kind !== 'spending');
  const restKinds = kinds.filter((k) => k !== 'spending');
  const strictFails = test(rest, restKinds, rest.reduce((s, i) => s + words(i.label) + words(i.note), 0));
  return {
    items, kinds, words: w,
    qualifies: fails.length === 0,
    why: fails.length ? `no: ${fails.join('; ')}` : `yes: ${items.length} items, ${kinds.length} kinds, ${w} words`,
    qualifiesStrict: strictFails.length === 0,
  };
}
