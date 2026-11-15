// The homepage's "State of the nation" band (T1-SOTN, layout change approved by the owner 15 Nov 2026, COWORK-TO-T1
// ENTRY 105): four headline figures (inflation, unemployment, borrowing this year, and the NHS waiting list, or the
// Crown Court backlog until the NHS figure is checked) and "See all the figures", all one link to /state-of-the-nation. Not shown on tablets (600 to 1,023px; ENTRY 108: the homepage was already over the 3,000px tablet length, so
// the band adds nothing there); phones and desktop as described. Server rendered; a figure not yet published is left out rather than shown empty.
import Link from 'next/link';
import { headlineFour, stateOfTheNation } from '@/lib/state-of-the-nation';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

export default async function SotnBand() {
  const four = headlineFour((await stateOfTheNation()).figures).filter((f) => f.value);
  if (!four.length) return null;
  return (
    <section aria-labelledby="sotn-band-h" className="og-sotn" style={{ margin: '0 0 28px', borderTop: `2px solid ${INK}`, paddingTop: '12px', fontFamily: MONO, color: INK }}>
      <style>{`.og-sotn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .og-sotn-fig { display: block; color: inherit; text-decoration: none; border: 1px solid ${HAIRLINE}; padding: 10px 12px; min-height: 44px; }
        .og-sotn-link:hover .og-sotn-v, .og-sotn-link:focus-visible .og-sotn-v { text-decoration: underline; } .og-sotn-link:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
        .og-sotn-all { display: inline-block; min-height: 44px; line-height: 44px; color: ${ACCENT}; text-decoration: underline; text-underline-offset: 3px; font-size: 15px; }
        @media (min-width: 600px) and (max-width: 1023.98px) { .og-sotn { display: none !important; } }
        @media (max-width: 599.98px) { .og-sotn-grid { grid-template-columns: 1fr 1fr; gap: 8px; } .og-sotn-all { display: block; min-height: 44px; line-height: 44px; } }`}</style>
      <h2 id="sotn-band-h" style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', margin: '0 0 10px' }}>State of the nation</h2>
      {/* One link for the whole band (the site's rule: a page is linked once in the body): every figure and "See all the
          figures" lead to /state-of-the-nation. */}
      <Link href="/state-of-the-nation" className="og-sotn-link" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
        <span className="og-sotn-grid">
          {four.map((f) => (
            <span key={f.id} className="og-sotn-fig">
              <span className="og-sotn-v" style={{ display: 'block', fontSize: '26px', fontWeight: 'bold', lineHeight: 1.15 }}>{f.value}</span>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.35, marginTop: '4px' }}>{f.label}</span>
              {f.period && <span className="og-sotn-p" style={{ display: 'block', fontSize: '15px', lineHeight: 1.35, marginTop: '2px' }}>{f.period}</span>}
            </span>
          ))}
        </span>
        <span className="og-sotn-all">See all the figures</span>
      </Link>
    </section>
  );
}
