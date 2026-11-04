// "In this section" (25 Oct 2026, reports 47 and 62): on each section landing page, that section's links, with the same
// labels, order and addresses as its section page (lib/site-nav.ts sectionRow). The MPs, Parties and Departments
// pages, now groups of Parliament, show their own group and end with "All of Parliament". Under 640px (owner, 4 Nov 2026)
// it is one "More in this section" control that opens the list, so the page heading is on the first screen.
import Link from 'next/link';
import { sectionRow } from '@/lib/site-nav';

export default function SectionLinks({ section }: { section: string }) {
  const item = sectionRow(section);
  if (!item?.links.length) return null;
  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: `.sl-phone { display: none; }
@media (max-width: 639.98px) {
  .sl-wide { display: none; }
  .sl-phone { display: block; margin: 0 0 14px; font-family: var(--font-special-elite), monospace; font-size: 15px; }
  .sl-phone summary { display: flex; align-items: center; justify-content: space-between; min-height: 48px; padding: 0 12px; box-sizing: border-box; border: 1px solid #14100d; color: #14100d; font-weight: bold; cursor: pointer; list-style: none; }
  .sl-phone summary::-webkit-details-marker { display: none; }
  .sl-phone[open] .sl-mark { transform: rotate(180deg); }
  .sl-phone ul { list-style: none; margin: 0; padding: 0 12px; border: 1px solid #14100d; border-top: 0; }
  .sl-phone a { display: flex; align-items: center; min-height: 44px; color: #7a1612; text-decoration: underline; text-underline-offset: 3px; }
}` }} />
    <details className="sl-phone">
      <summary>More in this section<span className="sl-mark" aria-hidden>▾</span></summary>
      <nav aria-label={`More in this section: ${item.label}`}>
        <ul>
          {item.links.map((c) => <li key={`${c.href}-${c.label}`}><Link href={c.href} className="no-hover-scale">{c.label}</Link></li>)}
        </ul>
      </nav>
    </details>
    <nav className="sl-wide" aria-label={`In this section: ${item.label}`} style={{ margin: '0 0 18px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', lineHeight: 1.5, color: '#14100d' }}>
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '15px', marginRight: '8px' }}>In this section</span>
      {item.links.map((c, i) => (
        <span key={`${c.href}-${c.label}`} style={{ whiteSpace: 'nowrap' }}>
          {i > 0 && <span aria-hidden style={{ margin: '0 6px' }}>·</span>}
          <Link href={c.href} className="no-hover-scale" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px', display: 'inline-block', padding: '4px 0' }}>{c.label}</Link>
        </span>
      ))}
    </nav>
    </>
  );
}
