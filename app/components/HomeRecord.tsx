import Link from 'next/link';

const INK = '#14100d';

// The homepage's "The record, going back decades" (owner, 6 Nov 2026). Owner, 11 Nov 2026: the seven items are gone; the
// section is its heading and one link, "Search the archives", at every width (on phones no fold, just the two lines).
// Each archive the items linked to is still linked from the menu, the directory or its section page (/pmqs and
// /pmqs/1945-to-1961, /petitions, /constituencies, /edms, /mps, /divisions with every year from 2004, /register-history,
// /questions). The link goes to plain /search: search has no filter for these historic records yet. The wrapper keeps the
// homepage's phone order (app/page.tsx .og-record-f). The same rule and gap below the link as above the heading (Cowork,
// 11 Nov 2026), phone and desktop.
// ENTRY 233 MOB-HOME (owner approved 17 Nov 2026): on desktop it opens the main column, above the lead story; on phones and
// tablets it follows the lead story, the figures strip and "This week in Parliament". The page renders it in both places,
// each display: none at the other's widths (only = 'desk' or 'mob'), so the reading order is the order shown.
export default function HomeRecord({ only }: { only: 'desk' | 'mob' }) {
  const head = `og-record-head-${only}`;
  return (
    <div className={`og-record-f og-${only}`}>
      <section className="og-record" aria-labelledby={head} style={{ margin: '20px 0', padding: '14px 0', borderTop: '2px solid rgba(20,16,13,0.18)', borderBottom: '2px solid rgba(20,16,13,0.18)' }}>
        <h2 id={head} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: INK, margin: '0 0 10px' }}>The record, going back decades</h2>
        <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
          <Link href="/search" prefetch={false} className="og-tap" style={{ color: INK, textDecoration: 'underline' }}>Search the archives &rarr;</Link>
        </p>
      </section>
      {/* HMOs (owner, 19 Nov 2026, Cowork ENTRY 372 addendum: "separate notification on the landing page under search the
          archives"): its own short notice in the same style, under the record block, to the HMO page's lookup box. */}
      <section className="og-hmo-note" aria-labelledby={`og-hmo-head-${only}`} style={{ margin: '-20px 0 20px', padding: '14px 0', borderBottom: '2px solid rgba(20,16,13,0.18)' }}>
        <h2 id={`og-hmo-head-${only}`} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: INK, margin: '0 0 6px' }}>Houses in multiple occupation</h2>
        <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '16px', lineHeight: 1.6, margin: '0 0 6px', color: INK }}>How many HMOs your council reports, and how many are licensed.</p>
        <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
          <Link href="/councils/hmos#find" prefetch={false} className="og-tap" style={{ color: INK, textDecoration: 'underline' }}>Search HMOs in your area &rarr;</Link>
        </p>
      </section>
    </div>
  );
}
