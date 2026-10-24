// Reading time for reports ("6 min read"), shown on the article pages and beside the date in report lists.
// Words are runs of non-whitespace in the headline, the standfirst and every text field of every body block (each
// block's string values are walked, nested arrays and objects included, so no block type is missed). Fields that are
// links or images (href, photoHref, src, photo, councilSlug), alt text, the block type, and strings that are
// themselves URLs or paths are skipped; inline links written as [words](/path) count their words only.
// minutes = ceil(words / 238), at least 1: 238 words a minute is the average adult silent reading speed for
// non-fiction (Brysbaert 2019).
import type { EditorialEntry } from '@/lib/editorials/types';

export const WORDS_PER_MINUTE = 238;

const SKIP_KEYS = new Set(['type', 'href', 'photoHref', 'src', 'photo', 'councilSlug', 'alt', 'photoAlt']);
const INLINE_LINK = /\[([^\]]+)\]\([^)\s]*\)/g;
const URL_OR_PATH = /^(https?:\/\/|\/)\S*$/;

export function countWords(text: string): number {
  const plain = text.replace(INLINE_LINK, '$1').trim();
  if (!plain || URL_OR_PATH.test(plain)) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

function wordsIn(value: unknown): number {
  if (typeof value === 'string') return countWords(value);
  if (Array.isArray(value)) return value.reduce((n: number, v) => n + wordsIn(v), 0);
  if (value && typeof value === 'object') {
    let n = 0;
    for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) n += wordsIn(v);
    return n;
  }
  return 0;
}

export function entryWords(entry: EditorialEntry): number {
  return countWords(entry.headline) + countWords(entry.standfirst) + wordsIn(entry.body);
}

export function minutesForWords(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function readingMinutes(entry: EditorialEntry): number {
  return minutesForWords(entryWords(entry));
}

export function readingLabel(entry: EditorialEntry): string {
  return `${readingMinutes(entry)} min read`;
}

// Database briefings (the briefings table) store a plain-text body: the same count over the headline and body.
export function textReadingLabel(...texts: Array<string | null | undefined>): string {
  return `${minutesForWords(texts.reduce((n: number, t) => n + (t ? countWords(t) : 0), 0))} min read`;
}
