import type { CSSProperties, ReactNode } from 'react';

// The MP biography text (BF1, owner approved the whole career format, 8 Nov 2026). Paragraphs as stored in
// mp_biography.political_bio (split on blank lines by the page). Only three things are read from the text; nothing
// else is markdown, and no HTML in the text is ever rendered (React writes it out as text):
//   **Label.** at the very start of a paragraph   the label in bold, then the rest of the paragraph
//   a paragraph that is only **Label.**           a small subheading (h3), so commitments scan on a phone
//   [descriptive text](https://...)               a link to the source beside the claim, in the same tab; any other
//                                                 scheme (http:, javascript:, ...) shows the descriptive text alone
// The "Sources (N)" list under the biography is built from bio_sources and is not touched here.

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

export default function BioText({ paragraphs, paragraphStyle }: { paragraphs: string[]; paragraphStyle?: (index: number) => CSSProperties }) {
  return (
    <>
      {bioBlocks(paragraphs).map((b, idx): ReactNode => {
        if (b.kind === 'heading') return <h3 key={idx} style={HEADING_STYLE}>{b.text}</h3>;
        return (
          <p key={idx} style={paragraphStyle?.(idx)}>
            {b.label && <strong>{b.label}</strong>}
            {b.label && b.parts.length > 0 ? ' ' : null}
            {b.parts.map((p, j) => (p.href ? <a key={j} href={p.href} rel="noopener" style={LINK_STYLE}>{p.text}</a> : p.text))}
          </p>
        );
      })}
    </>
  );
}
