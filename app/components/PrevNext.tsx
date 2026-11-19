// Previous and next links on the year and month pages (Cowork ENTRY 367 item 3): the year or month either side that
// has records, with an optional middle link (up to the year, or back to the list), on one line in the site's link style.
import Link from 'next/link';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

type Target = { href: string; text: string } | null;

export default function PrevNext({ label, previous, up, next }: { label: string; previous: Target; up?: Target; next: Target }) {
  const link = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' } as const;
  const parts = [
    previous && <Link key="p" href={previous.href} rel="prev" style={link}>← {previous.text}</Link>,
    up && <Link key="u" href={up.href} style={link}>{up.text}</Link>,
    next && <Link key="n" href={next.href} rel="next" style={link}>{next.text} →</Link>,
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <nav aria-label={label} style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '14px 0', lineHeight: 1.9 }}>
      {parts.map((p, i) => <span key={i}>{i > 0 && ' · '}{p}</span>)}
    </nav>
  );
}
