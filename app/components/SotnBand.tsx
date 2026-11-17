// The homepage's "State of the nation" band (T1-SOTN, layout change approved by the owner 15 Nov 2026, COWORK-TO-T1
// ENTRY 105): four headline figures (inflation, unemployment, borrowing this year, and the NHS waiting list, or the
// Crown Court backlog until the NHS figure is checked). Server rendered; a figure not yet published is left out rather
// than shown empty.
// Two forms (ENTRY 233 MOB-HOME, owner approved 17 Nov 2026):
// - 'band', desktop (1,024px up): under the finders, every figure and "See all the figures" one link, as before.
// - 'strip', phones and tablets (up to 1,023.98px): straight after the lead story, compact: each figure and its label
//   as plain text (no link), then a separate "See all the figures" link. Each form is display: none at the other's
//   widths, so a screen reader meets only the one shown, in the order it is shown.
import Link from 'next/link';
import { headlineFour, stateOfTheNation } from '@/lib/state-of-the-nation';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

export const SOTN_ALL_HREF = '/state-of-the-nation';

export default async function SotnBand({ variant = 'band' }: { variant?: 'band' | 'strip' }) {
  const four = headlineFour((await stateOfTheNation()).figures).filter((f) => f.value);
  if (!four.length) return null;
  if (variant === 'strip') return <SotnStrip four={four} />;
  return (
    <section aria-labelledby="sotn-band-h" className="og-sotn og-desk" style={{ margin: '0 0 28px', borderTop: `2px solid ${INK}`, paddingTop: '12px', fontFamily: MONO, color: INK }}>
      <style>{`.og-sotn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .og-sotn-fig { display: block; color: inherit; text-decoration: none; border: 1px solid ${HAIRLINE}; padding: 10px 12px; min-height: 44px; }
        .og-sotn-link:hover .og-sotn-v, .og-sotn-link:focus-visible .og-sotn-v { text-decoration: underline; } .og-sotn-link:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
        .og-sotn-all { display: inline-block; min-height: 44px; line-height: 44px; color: ${ACCENT}; text-decoration: underline; text-underline-offset: 3px; font-size: 15px; }
`}</style>
      <h2 id="sotn-band-h" style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', margin: '0 0 10px' }}>State of the nation</h2>
      {/* One link for the whole band (the site's rule: a page is linked once in the body): every figure and "See all the
          figures" lead to /state-of-the-nation. */}
      <Link href={SOTN_ALL_HREF} className="og-sotn-link" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
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

type Fig = ReturnType<typeof headlineFour>[number];

// The period follows the label after a comma, so its first word is lower case unless it is a month or an abbreviation
// ("End of June 2026" -> "end of June 2026"; "September 2026" and "Q2 2026" unchanged). T2's review of e1f9ec14.
const MONTH = /^(January|February|March|April|May|June|July|August|September|October|November|December)\b/;
const midSentence = (period: string) => (MONTH.test(period) || !/^[A-Z][a-z]/.test(period) ? period : period[0].toLowerCase() + period.slice(1));

function SotnStrip({ four }: { four: Fig[] }) {
  return (
    <section aria-labelledby="sotn-strip-h" className="og-sotn-strip og-mob" style={{ margin: '18px 0 0', borderTop: `2px solid ${INK}`, paddingTop: '10px', fontFamily: MONO, color: INK }}>
      <style>{`.og-sotn-sl { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
        .og-sotn-sl li { border-top: 1px solid ${HAIRLINE}; padding-top: 6px; }
        .og-sotn-sv { display: block; font-size: 20px; font-weight: bold; line-height: 1.2; }
        .og-sotn-sk { display: block; font-size: 15px; line-height: 1.35; }
        .og-page a.og-sotn-sa { display: inline-block; min-height: 44px; line-height: 44px; color: ${ACCENT}; text-decoration: underline; text-underline-offset: 3px; font-size: 16px; }
        @media (min-width: 600px) { .og-sotn-sl { grid-template-columns: repeat(4, 1fr); } }`}</style>
      <h2 id="sotn-strip-h" style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', margin: '0 0 8px' }}>State of the nation</h2>
      <ul className="og-sotn-sl">
        {four.slice(0, 4).map((f) => (
          <li key={f.id}>
            <span className="og-sotn-sv">{f.value}</span>
            <span className="og-sotn-sk">{f.label}{f.period ? `, ${midSentence(f.period)}` : ''}</span>
          </li>
        ))}
      </ul>
      <Link href={SOTN_ALL_HREF} className="og-sotn-sa">See all the figures &rarr;</Link>
    </section>
  );
}
