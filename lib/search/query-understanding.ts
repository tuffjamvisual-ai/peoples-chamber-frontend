// How /search reads what was typed (Cowork ENTRY 384 stage B2, ENTRY 390, 19 Nov 2026; plan: audit/search-384/PLAN.md
// layer b). Pure: no database, no Next.js, so scripts/checks/search-b2.test.ts can run it.
//   1. Word starts: a name matches a typed word only where one of its words starts with it ('hmo' no longer finds
//      Richmond, Edmonton or Mahmood).
//   2. Names inside a sentence: the longest run of typed words that is a whole known name (an MP, a peer, a special
//      adviser, a constituency, a council, or, failing those, a donor) is found, and the name groups search for it
//      ('shabana mahmood salary' finds Shabana Mahmood); the other words are kept for the pages.
//   3. Some of the words: when every word finds too little, words that say nothing on their own ('uk', 'list',
//      'how many') are dropped, then all but one word, then any word, each labelled on the page.
//   5. Area codes: an ONS code (E06000063, E14001234 ...) is read as the council or constituency it names.
import { wordsOf } from '@/lib/search/words';

// Words that do not narrow a search for a report, a release, a bill or a vote: dropped before the some-of-your-words
// search (never from the every-word search, which runs first, unchanged).
export const FILLER = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'for', 'to', 'by', 'with', 'about', 'from', 'at', 'as', 'into',
  'is', 'are', 'was', 'were', 'be', 'been', 'there', 'their', 'it', 'its', 'this', 'that', 'these', 'those',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'many', 'much', 'most', 'more', 'any', 'all',
  'do', 'does', 'did', 'can', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'show', 'find', 'get', 'list', 'lists',
  'uk', 'britain', 'british', 'latest', 'new', 'news', 'info', 'information', 'data', 'full', 'top',
]);
const isYear = (w: string) => /^(19|20)\d\d$/.test(w);

/** The typed words that narrow a search: filler words and years dropped. Empty if nothing is left. */
export function keptWords(q: string): string[] {
  return wordsOf(q).filter((w) => !FILLER.has(w) && !isYear(w)).slice(0, 8);
}

/**
 * The searches to try, in order, when the every-word search finds too little: the kept words all together (only if a
 * word was dropped), then any combination of all but one (three words or more), then any one word (two or more). Each
 * is a websearch_to_tsquery string: words side by side must all be there, 'or' between groups.
 */
export function looseStages(q: string): string[] {
  const all = wordsOf(q);
  const kept = keptWords(q);
  if (!kept.length) return [];
  const out: string[] = [];
  if (kept.length < all.length) out.push(kept.join(' '));
  if (kept.length >= 3) out.push(kept.map((_, skip) => kept.filter((__, i) => i !== skip).join(' ')).join(' or '));
  if (kept.length >= 2) out.push(kept.join(' or '));
  return out;
}

// The start of a word that its other forms share, for counting which typed words a title holds: 'bankruptcies' ->
// 'bankruptc' finds Bankruptcy; 'councils' -> 'counc' finds Council. Short words are kept whole.
export const stemPrefix = (w: string) => (w.length <= 4 ? w : w.slice(0, Math.max(4, w.length - 3)));

/** How many of the words a title and summary hold: 2 for each in the title, 1 for each only in the summary. */
export function looseScore(words: readonly string[], title: string, summary = ''): number {
  const t = wordsOf(title);
  const s = wordsOf(summary);
  let score = 0;
  for (const w of words) {
    const p = stemPrefix(w);
    if (t.some((x) => x.startsWith(p))) score += 2;
    else if (s.some((x) => x.startsWith(p))) score += 1;
  }
  return score;
}

// ---- 1. Word starts ----

/** The words of a name search, for word-start matching: letters and digits only, so no regex or filter character is
 * ever passed on. Lower case, accents kept (the database compares them as stored). */
export function nameWords(q: string, min = 1): string[] {
  return q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= min).slice(0, 6);
}

/** A Postgres regex (~*) for a word that starts with w: '\mhmo'. w holds letters and digits only (nameWords). */
export const wordStartRe = (w: string) => `\\m${w}`;

/** True when every typed word is the start of a word of the name (in memory, the same rule as the database's). */
export function startsWords(name: string, typed: readonly string[]): boolean {
  const ws = wordsOf(name);
  return typed.every((t) => {
    const f = wordsOf(t).join('');
    return !f || ws.some((w) => w.startsWith(f));
  });
}

/** True when the phrase typed starts a word of the text ('hmo' in 'The HMO Company', not in 'Richmond'). */
export function atWordStart(text: string, phrase: string): boolean {
  const p = phrase.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return !!p && ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')}`.includes(` ${p}`);
}

// ---- 2. Names inside a sentence ----

export type NameKind = 'mp' | 'peer' | 'spad' | 'constituency' | 'council' | 'donor';
export type NameEntry = { kind: NameKind; core: string };
// A person's title, dropped from the front of a name: 'Sir Keir Starmer' is found as 'keir starmer'.
const HONORIFIC = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'sir', 'dame', 'rt', 'hon', 'the', 'right', 'honourable', 'lord', 'lady', 'baroness', 'baron', 'viscount', 'earl', 'countess', 'duke', 'bishop', 'professor', 'prof']);
// Words in a council's name that are not its place: 'Wychavon District Council' is found as 'wychavon'.
const COUNCIL_WORDS = new Set(['council', 'district', 'borough', 'city', 'county', 'metropolitan', 'royal', 'of', 'the', 'corporation', 'unitary', 'authority']);
// Kinds in the order a tie is broken: a person before a place, a donor last.
const KIND_ORDER: NameKind[] = ['mp', 'peer', 'spad', 'constituency', 'council', 'donor'];

/** The words a name is found by, as one string: titles taken off the front of a person's name, council words off a council's. */
export function nameCore(label: string, kind: NameKind): string {
  let ws = wordsOf(label);
  if (kind === 'council') ws = ws.filter((w) => !COUNCIL_WORDS.has(w));
  else if (kind !== 'constituency') { while (ws.length > 1 && HONORIFIC.has(ws[0])) ws = ws.slice(1); }
  return ws.join(' ');
}

/** The names a peer is found by: 'Lord Hague of Richmond' by 'hague of richmond' and by 'lord hague'. */
export function peerCores(label: string): string[] {
  const ws = wordsOf(label);
  const of = ws.indexOf('of');
  const out = [nameCore(label, 'peer')];
  if (of > 1) out.push(ws.slice(0, of).join(' '));
  return out.filter((c) => c.includes(' '));
}

// A place found by one word is only taken from a word of 4 letters or more that is not a common word on its own.
const PLACE_WORD_TOO_COMMON = new Set(['council', 'county', 'city', 'central', 'north', 'south', 'east', 'west', 'mid', 'upper', 'lower', 'great', 'little', 'new', 'royal', 'park', 'down', 'wells', 'reading', 'worth', 'pay', 'tax']);

export type NameRun = { start: number; length: number; kind: NameKind; name: string; rest: string };

/**
 * The longest run of the typed words that is a whole known name, when it is not the whole query (a whole name is
 * already found by the name searches). Names of people need two words or more; a place may be one distinctive word.
 * Ties: the earlier run, then a person before a place. Null if none.
 */
export function findNameRun(q: string, byCore: ReadonlyMap<string, NameKind[]>): NameRun | null {
  const ws = wordsOf(q).slice(0, 12);
  if (ws.length < 2) return null;
  for (let len = Math.min(ws.length - 1, 6); len >= 1; len--) {
    let best: NameRun | null = null;
    for (let i = 0; i + len <= ws.length; i++) {
      const name = ws.slice(i, i + len).join(' ');
      const kinds = byCore.get(name);
      if (!kinds?.length) continue;
      const usable = len >= 2 ? kinds : kinds.filter((k) => (k === 'council' || k === 'constituency') && name.length >= 4 && !PLACE_WORD_TOO_COMMON.has(name));
      if (!usable.length) continue;
      const kind = usable.slice().sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b))[0];
      const run: NameRun = { start: i, length: len, kind, name, rest: [...ws.slice(0, i), ...ws.slice(i + len)].join(' ') };
      if (!best || KIND_ORDER.indexOf(run.kind) < KIND_ORDER.indexOf(best.kind)) best = run;
      if (best && best.start === i) break; // the earliest run of this length wins, a person before a place there
    }
    if (best) return best;
  }
  return null;
}

/** Adds names to a core -> kinds map (one name may be several kinds: a constituency and a council). */
export function addCores(map: Map<string, NameKind[]>, cores: Iterable<string>, kind: NameKind): void {
  for (const c of cores) {
    if (!c) continue;
    const ks = map.get(c);
    if (!ks) map.set(c, [kind]);
    else if (!ks.includes(kind)) ks.push(kind);
  }
}

// ---- 5. Area codes ----

/** An ONS area code typed on its own (E06000063, w07000081 ...), upper case, or null. */
export function areaCode(q: string): string | null {
  const t = q.trim().toUpperCase();
  return /^[ENSWK]\d{8}$/.test(t) ? t : null;
}

// ---- 4. Spelling ----

/**
 * Which 'Did you mean' leads when there is both a corrected search (the typed words with a spelling fixed) and a close
 * name: the name, when it holds a corrected word ('badnoch' -> Kemi Badenoch, the MP); otherwise the corrected search
 * ('sewige' -> sewage, before 'Sewing Together' the donor).
 */
export function nameLeads(q: string, corrected: string | null, closestName: string | null): boolean {
  if (!closestName) return false;
  if (!corrected) return true;
  const typed = new Set(wordsOf(q));
  const fixed = wordsOf(corrected).filter((w) => !typed.has(w));
  const nameWs = wordsOf(closestName);
  return fixed.length > 0 && fixed.every((w) => nameWs.includes(w));
}

/**
 * Close names, best first: equal scores (to 2 places) put an MP before a constituency, a council, then a donor. An MP
 * whose name, without a title, is also a donor's name takes that donor's score, so the MP comes first ('Mrs Kemi
 * Badenoch' scores 0.30 for 'badnoch', the donor 'Kemi Badenoch' 0.375).
 */
export function orderCloseNames<T extends { kind: string; name: string; score?: number | null }>(rows: readonly T[]): T[] {
  const rank: Record<string, number> = { mp: 0, constituency: 1, council: 2, donor: 3 };
  const donorScore = new Map<string, number>();
  for (const r of rows) if (r.kind === 'donor') { const k = nameCore(r.name, 'donor'); donorScore.set(k, Math.max(donorScore.get(k) ?? 0, r.score ?? 0)); }
  const score = (r: T) => (r.kind === 'mp' ? Math.max(r.score ?? 0, donorScore.get(nameCore(r.name, 'mp')) ?? 0) : r.score ?? 0);
  return rows
    .map((r, i) => ({ r, i, s: Math.round(score(r) * 100) }))
    .sort((a, b) => b.s - a.s || (rank[a.r.kind] ?? 9) - (rank[b.r.kind] ?? 9) || a.i - b.i)
    .map((x) => x.r);
}
