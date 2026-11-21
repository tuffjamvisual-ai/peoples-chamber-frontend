// 'Why <place> ranks here' (Cowork ENTRY 444 item 3(b) and (c); decisions 21 Nov 2026 04:12 item 1): a closed fold on each
// area page only (id why; the main page links each of the ten here, to #why, which opens it). The measure with the
// biggest effect, the second and the one that helped most (whyAccount, why.ts), the rule in one sentence, then 'See all
// N measures' (11 since ENTRY 482 REVISED). Paragraphs, not a list, so the shared phone script leaves them whole; inside a <details>, which the phone
// script never cuts. The map outline (item 3(a)) is a separate step, not in this fold yet.
import type { Area } from './data';
import { MEASURE_COUNT, INK, MONO, para, foldSummary } from './data';
import { whyAccount, WHY_RULE } from './why';
import AllMeasuresLink, { WHY_ID } from './AllMeasuresLink';

export default function WhyFold({ a }: { a: Area }) {
  return (
    <details id={WHY_ID} className="ls-why" style={{ scrollMarginTop: '12px' }}>
      <summary style={foldSummary}>
        Why {a.name} ranks here
        <span className="og-fold-mark" aria-hidden="true" />
      </summary>
      {whyAccount(a).map((p) => (
        <p key={p.lead} style={{ ...para, lineHeight: 1.5, margin: '0 0 8px' }}>
          <strong>{p.lead}.</strong> {p.text}
        </p>
      ))}
      <p style={{ ...para, lineHeight: 1.5, margin: '0 0 8px' }}>{WHY_RULE}</p>
      <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>
        <AllMeasuresLink count={MEASURE_COUNT} />
      </div>
    </details>
  );
}
