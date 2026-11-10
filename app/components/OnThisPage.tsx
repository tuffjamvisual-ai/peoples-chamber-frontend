import { phoneUpTo } from '@/lib/breakpoints';

// "On this page" for long articles on phones (owner, 9 Nov 2026; step 5, 10 Nov 2026): the article text stays whole, the
// parts around it fold, and this list at the top links to each part. Under 640px only; plain links, so it works with
// JavaScript off. A link to a folded part's <details> id lands on its summary.
const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';

// The links share a row on phones (UX3b, 10 Nov 2026), each still 44px tall, so the text starts higher (A6).
export default function OnThisPage({ items }: { items: { href: string; label: string }[] }) {
  return (
    <>
      <style>{`.art-otp { display: none; } @media ${phoneUpTo(639.98)} { .art-otp { display: block; margin: 0 0 14px; padding: 8px 0; border-top: 1px solid ${HAIRLINE}; border-bottom: 1px solid ${HAIRLINE}; } .art-otp { display: flex !important; flex-wrap: wrap; align-items: center; column-gap: 16px; } .art-otp > p { margin: 0 !important; } .art-otp ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; column-gap: 16px; } .art-otp a { display: flex; align-items: center; min-height: 44px; font-size: 15px; color: ${INK}; text-decoration: underline; text-underline-offset: 3px; } }`}</style>
      <nav className="art-otp" aria-label="On this page">
        <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 2px', color: INK }}>On this page</p>
        <ul>
          {items.map((i) => <li key={i.href}><a href={i.href}>{i.label}</a></li>)}
        </ul>
      </nav>
    </>
  );
}
