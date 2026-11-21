// 'Why <place> ranks here' (Cowork ENTRY 444 item 3(b) and (c)): a closed fold under each of the ten on the main page and
// on every area page. The measure with the biggest effect, the second and the one that helped most (whyAccount, why.ts),
// then 'See all 12 measures'. Paragraphs, not a list, so the shared phone script leaves them whole; inside a <details>,
// which the phone script never cuts. The map outline (item 3(a)) is a separate step, not in this fold yet.
import type { Area } from './data';
import { MEASURE_COUNT, INK, MONO, para, foldSummary } from './data';
import { whyAccount } from './why';
import AllMeasuresLink from './AllMeasuresLink';

export default function WhyFold({ a, linkTo, rule }: { a: Area; linkTo?: string; rule?: boolean }) {
  return (
    <details className="ls-why">
      <summary style={foldSummary}>
        Why {a.name} ranks here
        <span className="og-fold-mark" aria-hidden="true" />
      </summary>
      {whyAccount(a).map((p) => (
        <p key={p.lead} style={{ ...para, lineHeight: 1.5, margin: '0 0 8px' }}>
          <strong>{p.lead}.</strong> {p.text}
        </p>
      ))}
      {rule && (
        <p style={{ ...para, lineHeight: 1.5, margin: '0 0 8px' }}>
          A measure&rsquo;s effect is how far its score falls below 50, the middle, times its share of the overall score; the one furthest above 50, times its share, helped most.
        </p>
      )}
      <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>
        <AllMeasuresLink href={linkTo} count={MEASURE_COUNT} />
      </div>
    </details>
  );
}
