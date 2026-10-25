// "In this section" (25 Oct 2026, reports 47 and 62): on each section landing page, that section's links, with the same
// labels, order and addresses as its section page (lib/site-nav.ts sectionRow). The MPs, Parties and Departments
// pages, now groups of Parliament, show their own group and end with "All of Parliament". It shows at every screen size.
import Link from 'next/link';
import { sectionRow } from '@/lib/site-nav';

export default function SectionLinks({ section }: { section: string }) {
  const item = sectionRow(section);
  if (!item?.links.length) return null;
  return (
    <nav aria-label={`In this section: ${item.label}`} style={{ margin: '0 0 18px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', lineHeight: 1.5, color: '#14100d' }}>
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '14px', opacity: 0.75, marginRight: '8px' }}>In this section</span>
      {item.links.map((c, i) => (
        <span key={`${c.href}-${c.label}`} style={{ whiteSpace: 'nowrap' }}>
          {i > 0 && <span aria-hidden style={{ opacity: 0.45, margin: '0 6px' }}>·</span>}
          <Link href={c.href} className="no-hover-scale" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px', display: 'inline-block', padding: '4px 0' }}>{c.label}</Link>
        </span>
      ))}
    </nav>
  );
}
