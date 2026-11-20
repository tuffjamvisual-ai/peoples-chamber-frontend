import type { CSSProperties, ReactNode } from 'react';

// The MP biography text (BF1, owner approved the whole career format, 8 Nov 2026). Paragraphs as stored in
// mp_biography.political_bio (split on blank lines by the page). Only three things are read from the text; nothing
// else is markdown, and no HTML in the text is ever rendered (React writes it out as text):
//   **Label.** at the very start of a paragraph   the label in bold, then the rest of the paragraph
//   a paragraph that is only **Label.**           a small subheading (h3), so commitments scan on a phone
//   [descriptive text](https://...)               a link to the source beside the claim, in the same tab; any other
//                                                 scheme (http:, javascript:, ...) shows the descriptive text alone
// The "Sources (N)" fold under the biography (MagazineProfileSections.tsx, PageSources; ENTRY 180) is built from
// mp_biography.bio_sources and is not touched here.

// "**Label.**" then the rest: the label is any text without asterisks or line breaks, ending in a full stop.
export const BIO_LABEL = /^\*\*([^*\n]+\.)\*\*(?:\s+([\s\S]*))?$/;
// The address may hold one level of brackets, as some do ("..._(constituency)").
const LINK = /\[([^\]\n]+)\]\(((?:[^\s()]|\([^\s()]*\))+)\)/g;

export type BioBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; label: string | null; parts: BioPart[] };
export type BioPart = { text: string; href?: string };

// https only, and a real address; anything else is shown as its descriptive text.
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

// One paragraph's text as plain runs and links.
export function bioParts(text: string): BioPart[] {
  const parts: BioPart[] = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    const i = m.index ?? 0;
    if (text[i - 1] === '!') continue; // image markdown is not read: it stays as written
    if (i > at) parts.push({ text: text.slice(at, i) });
    const href = safeHref(m[2]);
    parts.push(href ? { text: m[1], href } : { text: m[1] });
    at = i + m[0].length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  // Neighbouring plain runs as one, so a refused link reads as ordinary text.
  return parts.reduce<BioPart[]>((out, p) => {
    const last = out[out.length - 1];
    if (last && !last.href && !p.href) last.text += p.text;
    else out.push({ ...p });
    return out;
  }, []);
}

export function bioBlocks(paragraphs: string[]): BioBlock[] {
  return paragraphs.map((para) => {
    const m = BIO_LABEL.exec(para);
    if (m && !m[2]?.trim()) return { kind: 'heading', text: m[1] };
    return { kind: 'paragraph', label: m ? m[1] : null, parts: bioParts(m ? (m[2] ?? '') : para) };
  });
}

// Links: the site's dark red with an underline, inside 16px text at line height 1.8 (about 29px a line), so links on
// neighbouring lines sit at least 24px apart.
const LINK_STYLE: CSSProperties = { color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '2px' };
const HEADING_STYLE: CSSProperties = { fontFamily: 'inherit', fontSize: '17px', fontWeight: 'bold', lineHeight: 1.4, color: 'inherit', margin: '22px 0 8px' };

// One block of the biography, as BioText draws it; idx is its place in the whole biography (paragraphStyle's tilt).
export function BioBlockView({ block: b, idx, paragraphStyle }: { block: BioBlock; idx: number; paragraphStyle?: (index: number) => CSSProperties }) {
  if (b.kind === 'heading') return <h3 style={HEADING_STYLE}>{b.text}</h3>;
  return (
    <p style={paragraphStyle?.(idx)}>
      {b.label && <strong>{b.label}</strong>}
      {b.label && b.parts.length > 0 ? ' ' : null}
      {b.parts.map((p, j) => (p.href ? <a key={j} href={p.href} rel="noopener" style={LINK_STYLE}>{p.text}</a> : p.text))}
    </p>
  );
}

export default function BioText({ paragraphs, paragraphStyle }: { paragraphs: string[]; paragraphStyle?: (index: number) => CSSProperties }) {
  return (
    <>
      {bioBlocks(paragraphs).map((b, idx): ReactNode => <BioBlockView key={idx} block={b} idx={idx} paragraphStyle={paragraphStyle} />)}
    </>
  );
}

// Phone pages (owner approved 20 Nov 2026, Cowork ENTRY 445 B; BioPager.tsx): under 768px a biography of more than 200
// words is shown in pages of about 150 to 200 words, split only where a paragraph ends. A paragraph of more than 200
// words is a page of its own and is never split. A label only paragraph (a subheading) always starts the page of the
// paragraph after it, so no page ends on a heading.
export const BIO_PAGE_MAX = 200;
const BIO_PAGE_AIM = 175;

// The words a reader sees in a block: the label and the links' descriptive text count, the link addresses do not.
export function bioWords(b: BioBlock): number {
  const t = b.kind === 'heading' ? b.text : `${b.label ?? ''} ${b.parts.map((p) => p.text).join('')}`;
  return t.split(/\s+/).filter(Boolean).length;
}

// The pages, as lists of block indexes in order. One page (no pager) when the whole is 200 words or fewer. Otherwise the
// split that keeps every page of two or more paragraphs at 200 words or fewer and brings the pages closest to 175 words
// each (the least sum of squared differences; between equals, fewer pages).
export function bioPages(blocks: BioBlock[]): number[][] {
  const units: number[][] = [];
  let held: number[] = [];
  blocks.forEach((b, i) => {
    held.push(i);
    if (b.kind !== 'heading') { units.push(held); held = []; }
  });
  if (held.length) { if (units.length) units[units.length - 1].push(...held); else units.push(held); }
  const words = units.map((u) => u.reduce((n, i) => n + bioWords(blocks[i]), 0));
  const total = words.reduce((a, b) => a + b, 0);
  if (units.length <= 1 || total <= BIO_PAGE_MAX) return [units.flat()];
  // best[i]: the least cost of paging the first i units; from[i]: where its last page starts.
  const best = [0], from = [0];
  for (let i = 1; i <= units.length; i++) {
    best[i] = Infinity; from[i] = i - 1;
    let sum = 0;
    for (let j = i - 1; j >= 0; j--) {
      sum += words[j];
      if (sum > BIO_PAGE_MAX && j < i - 1) break;
      const cost = best[j] + (sum - BIO_PAGE_AIM) ** 2 + 1;
      if (cost < best[i]) { best[i] = cost; from[i] = j; }
    }
  }
  const pages: number[][] = [];
  for (let i = units.length; i > 0; i = from[i]) pages.unshift(units.slice(from[i], i).flat());
  return pages;
}
