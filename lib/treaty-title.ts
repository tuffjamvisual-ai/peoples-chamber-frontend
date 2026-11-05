// Search titles for treaty pages (owner, 5 Nov 2026), from what the record's own title says, for example "UK and Brazil
// agreement on air services, Sep 2025". Only the search title changes; the page keeps the official title in full. Nothing
// is added: the parties, kind and subject are read from the official title and the date from the record. Returns null when
// the title does not name them, and the page then uses its usual shortened form.
import { shortDate, TITLE_MAX } from './seo-title';

const NAMES: [RegExp, string][] = [
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?United Kingdom(?: of Great Britain and Northern Ireland)?(?:\s*\(.*?\))?$/i, 'UK'],
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?United States(?: of America)?$/i, 'US'],
  [/^(?:the\s+)?European Union(?: and its Member States)?$/i, 'EU'],
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?French Republic$/i, 'France'],
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?Swiss (?:Confederation|Federal Council)$/i, 'Switzerland'],
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?Italian Republic$/i, 'Italy'],
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?Hellenic Republic$/i, 'Greece'],
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?Portuguese Republic$/i, 'Portugal'],
  [/^(?:the\s+)?(?:Government of\s+)?(?:the\s+)?Argentine Republic$/i, 'Argentina'],
];
const MONTH_YEAR = (d: string) => (shortDate(d) ?? '').replace(/^\d+ /, '');

// "the Government of the Federative Republic of Brazil" is Brazil; a name not of that shape stays as written.
function partyName(raw: string): string {
  const p = raw.replace(/\s+/g, ' ').replace(/^(?:the\s+)/i, '').trim();
  for (const [re, name] of NAMES) if (re.test(p)) return name;
  const of = /^(?:Government of\s+(?:the\s+)?)?(?:[A-Z][\w-]*\s+){0,3}?(?:Republic|Kingdom|State|Commonwealth|Principality|Grand Duchy|Sultanate|Emirate|Federation|Union)\s+of\s+(?:the\s+)?(.+)$/.exec(p);
  if (of) return of[1].trim();
  return p.replace(/^Government of\s+(?:the\s+)?/i, '').trim();
}

// Splits "A and B", "A, B and C", leaving "United Kingdom of Great Britain and Northern Ireland" and the like whole.
function parties(text: string): string[] {
  const safe = text
    .replace(/Great Britain and Northern Ireland/g, 'Great Britain\u0001Northern Ireland')
    .replace(/European Union and its Member States/g, 'European Union\u0001its Member States')
    .replace(/Trinidad and Tobago/g, 'Trinidad\u0001Tobago').replace(/Antigua and Barbuda/g, 'Antigua\u0001Barbuda')
    .replace(/Bosnia and Herzegovina/g, 'Bosnia\u0001Herzegovina').replace(/Saint Vincent and the Grenadines/g, 'Saint Vincent\u0001the Grenadines')
    .replace(/Saint Kitts and Nevis/g, 'Saint Kitts\u0001Nevis').replace(/Sao Tome and Principe/g, 'Sao Tome\u0001Principe');
  return safe.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((p) => p.replace(/\u0001/g, ' and ').trim()).filter(Boolean);
}

const CONNECTOR = /(?:^|\s|,\s*)(on|concerning|regarding|relating to|for|to amend|amending|supplementing|establishing|to|in respect of|in relation to|with respect to|in the field of)\s+/i;
const MONTHS = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/;

// A subject is kept whole, or to the end of its first clause. Never to a word in the middle of a phrase.
function subjectFit(subject: string, room: number): string | null {
  if (subject.length <= room) return subject;
  const clause = /^(.+?)(?:,\s(?=[a-z])|\s+(?:relating to|concerning|regarding|in respect of)\s)/.exec(subject);
  return clause && clause[1].length <= room ? clause[1] : null;
}

export function treatySeoTitle(title: string, date: string | null): string | null {
  const t = title.replace(/\s+/g, ' ').trim();
  const inTitle = MONTHS.exec(t);
  const when = inTitle ? `${inTitle[1].slice(0, 3)} ${inTitle[2]}` : date ? MONTH_YEAR(date) : '';
  const tail = when ? `, ${when}` : '';
  const fit = (...c: string[]) => c.find((x) => x.length <= TITLE_MAX) ?? null;

  // "Decision No. 1/2026 of the United Kingdom-Morocco Association Council"
  const decision = /^Decision No\.? ?(\S+) of the United Kingdom[-–]((?:[A-Z][\w-]*\s)*?[A-Z][\w-]*) (?:Association|Partnership|Trade|Joint|Continuity|Committee|Council|Stabilisation)/.exec(t);
  if (decision) return fit(`UK and ${decision[2]} decision ${decision[1]}${tail}`, `UK and ${decision[2]} decision ${decision[1]}`);

  const head = /^(.+?),\s+(?:done|adopted|signed|concluded|agreed|exchanged|made)\b(.*)$/i.exec(t) ?? /^(.+?)()(?=\s+between\s)/.exec(t);
  if (!head) return null;
  const kind = head[1].trim();
  const body = t.slice(kind.length).replace(/^,?\s*/, '');
  const between = /\bbetween\s+(.+)$/i.exec(body);
  // What comes after the place and date, up to "between": a connecting word and the subject.
  const beforeBetween = (between ? body.slice(0, between.index) : body).replace(/^(?:done|adopted|signed|concluded|agreed|exchanged|made)\b[^,]*(?:,\s*|$)/i, '').replace(/[,\s]+$/, '');

  let who = '', connector = '', subject = '';
  const take = (text: string) => { const m = CONNECTOR.exec(text); if (m && m.index < 3) { connector = m[1].toLowerCase(); subject = text.slice(m.index + m[0].length).trim(); } };
  take(beforeBetween);
  if (between) {
    // The parties run to the first connecting word that is not inside a name ("Republic of", "Government of").
    const rest = between[1].replace(/\b(Government|Republic|Kingdom|State|Commonwealth|Principality|Duchy|Sultanate|Emirate|Federation|Union|Organi[sz]ation|Agency|Council|Commission|Committee|Secretariat|Office) of\b/g, '$1\u0002of').replace(/\b(Organi[sz]ation|Agency|Institute) for\b/g, '$1\u0002for');
    const split = CONNECTOR.exec(rest);
    const list = (split ? rest.slice(0, split.index) : rest).replace(/\u0002/g, ' ').replace(/,?\s+of the (?:one|other) part,?/gi, '');
    const names = parties(list).map(partyName);
    if (names.length < 2 || names.some((n) => n.length > 40)) return null;
    who = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    if (split && !subject) take(rest.slice(split.index).replace(/\u0002/g, ' '));
  }
  subject = subject.replace(/United Kingdom of Great Britain and Northern Ireland/g, 'UK').replace(/\bthe the\b/g, 'the');

  if (!who) {
    // A treaty with no two named parties keeps its own name: "Convention on Road Traffic", "International Agreement on Coffee".
    const own = subject ? `${kind} ${connector}` : kind;
    if (!subject) return /\s(?:on|concerning)\s/.test(kind) ? fit(`${kind}${tail}`, kind) : null;
    const room = TITLE_MAX - own.length - 1 - tail.length;
    const fitted = subjectFit(subject, room);
    return fitted ? `${own} ${fitted}${tail}` : null;
  }
  const lower = kind.toLowerCase();
  const lead = `${who} ${lower}`;
  const word = /(agreement|treaty|convention|protocol|exchange of notes|memorandum|arrangement|amendment)/.exec(lower)?.[1] ?? 'agreement';
  const leads = [lead, `${who} ${word}`];
  for (const l of leads) {
    if (subject) {
      const room = TITLE_MAX - l.length - connector.length - 2 - tail.length;
      const fitted = room > 3 ? subjectFit(subject, room) : null;
      if (fitted) return `${l} ${connector} ${fitted}${tail}`;
      // The subject says more than the date: keep it whole if it fits without the date.
      const whole = `${l} ${connector} ${subject}`;
      if (whole.length <= TITLE_MAX) return whole;
    }
  }
  return fit(`${lead}${tail}`, lead, `${who} ${word}${tail}`, `${who} ${word}`);
}

// The official title without its place and date, for the page's usual shortened form when the title above is not possible:
// "Third Additional Protocol, done at Valletta on 19 September 2025, to the European Convention" reads on without them.
export function treatyPlainName(title: string): string {
  return title.replace(/\s+/g, ' ').trim().replace(/,\s+(?:done|adopted|signed|concluded|agreed|exchanged|made)\b[^,]*\d{4}\s*,?\s*/i, ' ').trim();
}
