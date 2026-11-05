// Search titles for vote pages (owner, 5 Nov 2026, visibility campaign item 13): 60 characters or fewer, for example
// "Animal Welfare (Sentience) Bill: how MPs voted, 14 Mar 2022". Names are shortened by whole words and never cut mid
// word. Only the search title changes; the page's heading keeps the motion in full.
//
// Votes on the same bill on the same day (New Clause 1, New Clause 2 and so on) would all get one title in that form, so
// the day's first vote keeps it and the others name what was voted on instead of "how MPs voted".
import { shortDate, TITLE_MAX } from './seo-title';

const HOW = ': how MPs voted, ';
const LOOSE_END = /[\s,:;(&-]+$|\s+(?:and|or|of|the|for|to|in|on|at|by|with|from|a|an|as|is|that|be)$/i;

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

// A whole word limit, leaving no connecting word or open bracket at the end.
function toWords(text: string, max: number): string {
  let out = tidy(text);
  if (out.length > max) {
    const words = out.split(' ');
    while (words.length > 1 && words.join(' ').length > max) words.pop();
    out = words.join(' ');
    if (out.length > max) return '';
  }
  for (let prev = ''; prev !== out;) { prev = out; out = out.replace(LOOSE_END, ''); }
  if ((out.match(/\(/g)?.length ?? 0) > (out.match(/\)/g)?.length ?? 0)) out = out.slice(0, out.lastIndexOf('(')).trim();
  return out;
}

// The shorter forms of a name, longest first, each still a true name: the House tag, the statutory instrument number,
// common long words, the bracket, the word Bill.
function nameForms(name: string): string[] {
  const forms = [tidy(name)];
  const next = (f: (s: string) => string) => { const v = tidy(f(forms[forms.length - 1])); if (v && v !== forms[forms.length - 1]) forms.push(v); };
  next((s) => s.replace(/\s*\[(?:Lords|HL)\]/gi, ''));
  next((s) => s.replace(/\s*\(S\.?I\.?[^)]*\)/gi, ''));
  next((s) => s.replace(/^Opposition Day:\s*/i, ''));
  next((s) => s.replace(/\bUnited Kingdom\b/g, 'UK').replace(/\bEuropean Union\b/g, 'EU').replace(/\bNorthern Ireland\b/g, 'NI'));
  next((s) => s.replace(/\s*\((?!No\.?\s*\d)[^)]*\)/g, ''));
  next((s) => s.replace(/\s+Bill\b/g, ''));
  return forms;
}

function fitName(name: string, max: number): string {
  for (const f of nameForms(name)) if (f.length <= max) return f;
  return toWords(nameForms(name).pop() ?? name, max);
}

// What was voted on, in the fewest words: "motion to disagree with Lords Amendment 16" is "Lords Amendment 16".
const WHAT = /\b(?:Lords\s+(?:Amendments?|Amdts?)\s+(?:\(\w{1,3}\)|\w+)|New\s+Clauses?\s+\w+|New\s+Schedules?\s+\w+|Amendments?\s+(?:\(\w{1,3}\)|\d+\w*|\w\b)|Amdts?\s+\w+|Clauses?\s+\d+\w*|Schedules?\s+\d+\w*|NC\s*\d+|Second\s+Reading|Third\s+Reading)/i;
function shortPart(part: string): string {
  const p = tidy(part);
  return (WHAT.exec(p)?.[0] ?? p).replace(/\bAmdts?\b/gi, 'Amendment');
}

// Splits a motion into the thing voted on and the part of it: "X Bill: Report Stage: New Clause 5", "X Bill Report: NC1".
function splitMotion(motion: string): { name: string; part: string } {
  const bill = /^(.*?\bBill\b(?:\s*\[(?:Lords|HL)\])?)[\s:,]*(.*)$/i.exec(motion);
  if (bill && bill[1].length >= 8) return { name: bill[1], part: bill[2] };
  const colon = motion.lastIndexOf(': ');
  if (colon > 0 && !/^Opposition Day$/i.test(motion.slice(0, colon))) return { name: motion.slice(0, colon), part: motion.slice(colon + 2) };
  return { name: motion, part: '' };
}

// The usual form, without looking at the day's other votes.
function usual(motion: string, day: string): string {
  const whole = tidy(motion);
  const { name } = splitMotion(whole);
  const room = TITLE_MAX - HOW.length - day.length;
  return `${fitName(name, room)}${HOW}${day}`;
}

// The form naming what was voted on, for a vote that would otherwise share its title.
function specific(motion: string, day: string): string {
  const split = splitMotion(tidy(motion));
  // No separate part: look for it inside the name ("Queen's Speech, Economy and Work, Amendment e (J Corbyn)").
  const inName = split.part ? null : WHAT.exec(split.name);
  const name = inName ? split.name.slice(0, inName.index) : split.name;
  const part = inName ? inName[0] : split.part;
  const tail = `, ${day}`;
  const whole = `${toWords(name, TITLE_MAX - tail.length)}${tail}`;
  if (!part || name.trim().length < 3) return part ? `${toWords(shortPart(part), TITLE_MAX - tail.length)}${tail}` : whole;
  const what = toWords(shortPart(part), TITLE_MAX - tail.length - 12);
  if (!what) return whole;
  return `${fitName(name, TITLE_MAX - tail.length - what.length - 2)}: ${what}${tail}`;
}

// The last resort, always distinct: the division's own number.
function numbered(motion: string, day: string, number: number): string {
  const tail = `: Division ${number}, ${day}`;
  return `${fitName(splitMotion(tidy(motion)).name, TITLE_MAX - tail.length)}${tail}`;
}

// motion and number: this vote. sameDay: every vote that day, this one included. The first of the votes sharing the
// usual form keeps it; each of the others names what was voted on, or its division number when that is shared too.
export function divisionSeoTitle(motion: string, number: number, dateOnly: string, sameDay: { number: number; motion: string }[]): string {
  const day = shortDate(dateOnly) ?? dateOnly;
  const votes = [...sameDay.filter((v) => v.number !== number), { number, motion }].sort((a, b) => a.number - b.number);
  const used = new Set<string>();
  for (const v of votes) {
    let title = usual(v.motion, day);
    if (used.has(title)) title = specific(v.motion, day);
    if (used.has(title)) title = numbered(v.motion, day, v.number);
    used.add(title);
    if (v.number === number) return title;
  }
  return usual(motion, day);
}
