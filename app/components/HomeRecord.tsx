import Link from 'next/link';

const INK = '#14100d';

// The homepage's "The record, going back decades" (owner, 6 Nov 2026). Owner, 11 Nov 2026: the seven items are gone; the
// section is its heading and one link, "Search the archives", at every width (on phones no fold, just the two lines).
// Each archive the items linked to is still linked from the menu, the directory or its section page (/pmqs and
// /pmqs/1945-to-1961, /petitions, /constituencies, /edms, /mps, /divisions with every year from 2004, /register-history,
// /questions). The link goes to plain /search: search has no filter for these historic records yet. The wrapper keeps the
// homepage's phone order (app/page.tsx .og-record-f). The same rule and gap below the link as above the heading (Cowork,
// 11 Nov 2026), phone and desktop.
export default function HomeRecord() {
  return (
    <div className="og-record-f">
      <section className="og-record" aria-labelledby="og-record-head" style={{ margin: '20px 0', padding: '14px 0', borderTop: '2px solid rgba(20,16,13,0.18)', borderBottom: '2px solid rgba(20,16,13,0.18)' }}>
        <h2 id="og-record-head" style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: INK, margin: '0 0 10px' }}>The record, going back decades</h2>
        <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
          <Link href="/search" prefetch={false} className="og-tap" style={{ color: INK, textDecoration: 'underline' }}>Search the archives &rarr;</Link>
        </p>
      </section>
    </div>
  );
}
