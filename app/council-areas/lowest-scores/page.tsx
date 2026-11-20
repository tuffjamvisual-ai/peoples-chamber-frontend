// /council-areas/lowest-scores: DRAFT for pictures only (Cowork ENTRY 415: GO v3, v3 ADDENDUM, HEADLINE, LAYOUT CHANGE).
// Not to be pushed until the publish rule passes (ENTRY 415 PUBLISH RULE). Not linked from any page, not in the sitemap
// (lib/sitemap lists pages by hand), noindex.
//
// The 10 council areas in England with the lowest scores on the 'places' index (what residents live with, whoever is
// responsible), then 'Find your area': a postcode search through the site's existing /api/councils/lookup (postcodes.io)
// giving that council area's rank of 294, its score and a link to its explanation page
// (/council-areas/lowest-scores/<slug>, one for each of the 294). Every area is scored on exactly the same measures, from
// the same source, period and geography (the lower-tier council area); a measure not published for all 294 at that level
// is left out (v3 rule). The full list of 294 is not on the page (owner, ENTRY 415 LAYOUT CHANGE).
//
// Owner rules: 'council area', never 'town'; per cent in words; no time words; no hyphens in our text; sources only in the
// Sources fold (ENTRY 410); no outside links elsewhere; the 'not the council's fault' caveat.

import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import DraftBanner from '../../components/DraftBanner';
import PageSources from '../../components/PageSources';
import FoldNotes from '../../components/FoldNotes';
import FindYourArea from './FindYourArea';
import { AREAS, MEASURES, TOPICS, RANKED, MEASURE_COUNT, SOURCES, LICENCE_NOTE, INK, INK_HAIRLINE, ACCENT, SERIF, MONO, h2, para, foldSummary } from './data';

export const revalidate = false; // A16: static data, rebuilt only on a deploy

const HEADLINE = 'The 10 Least Desirable Places to Live in England, on the Official Figures';
export const metadata: Metadata = {
  title: { absolute: HEADLINE },
  description: 'Draft, not public.',
  openGraph: { title: HEADLINE },
  twitter: { title: HEADLINE },
  robots: { index: false, follow: false },
};
const LOWEST10 = AREAS.slice(0, 10);

// Rank, score and name of every ranked council area by slug, for the postcode result (small: 294 short rows).
const RANKS = Object.fromEntries(AREAS.map((a) => [a.slug, [a.rank, a.score, a.name] as [number, number, string]]));

export default function LowestScoresPage() {
  return (
    <OpenGovShell pageStamp="Council areas">
      <BackLink fallbackHref="/councils" />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <DraftBanner published={false} />
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            England · {RANKED} council areas
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {HEADLINE}
          </h1>
          <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
            Not a ranking of how well councils are run.
          </div>
        </header>

        <p style={para}>
          Every one of the {RANKED} council areas is scored on the same {MEASURE_COUNT} official measures, each published for every council area: money and work, health, housing, environment and connectivity, and crime. The five topics count the same. 1 is the lowest score. Below are the 10 lowest; find any council area by postcode to see its rank and what pulls it down or up.
        </p>
        <p style={para}>
          <strong>Not the council&rsquo;s fault.</strong> Most of this depends on the economy, government, the police, the NHS and telecoms firms more than on the council. Council performance, such as finances and road repairs, is left out.
        </p>
        <p style={para}>
          This is not the <Link href="/councils/league-table" style={{ color: INK }}>council area league table</Link>, which uses more measures, including some published only for counties, so the order is different.
        </p>

        <section data-main-action="" aria-label="The 10 lowest scores" style={{ marginBottom: '28px' }}>
          <h2 style={h2}>The 10 lowest scores</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {LOWEST10.map((a) => (
              <li key={a.slug} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, padding: '8px 0 4px' }}>
                <h3 style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px', color: INK, display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                  <span>{a.rank}.</span>
                  <Link href={`/council-areas/lowest-scores/${a.slug}`} style={{ flex: 1, color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{a.name}</Link>
                  <span style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'normal' }}>{a.score.toFixed(1)}</span>
                </h3>
                <p style={{ ...para, lineHeight: 1.5, margin: '0 0 4px', paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}` }}>
                  <span style={{ fontWeight: 'bold' }}>Pulling it down: </span>{a.down.map((m) => (m.key === 'crime' ? m.figure[0].toUpperCase() + m.figure.slice(1) : `${m.label} ${m.figure}`)).join('; ')}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Find your area" style={{ border: `1.5px solid ${INK}`, padding: '14px', marginBottom: '28px' }}>
          <h2 style={h2}>Find your area</h2>
          <FindYourArea ranks={RANKS} ranked={RANKED} />
        </section>

        <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, marginBottom: '8px' }}>
          <details>
            <summary style={foldSummary}>
              How the scores work
              <span className="og-fold-mark" aria-hidden="true" />
            </summary>
            <p style={para}>
              Each measure is scored from 0 to 100 by where the council area sits among all {RANKED}: the best figure scores 100, the worst 0, and areas with the same figure share a score. A topic&rsquo;s score is the average of its measures; the overall score is the average of the five topics, so each topic counts a fifth. Crime is the crime score from the Indices of Deprivation, which combines the risk of violence, burglary, theft and criminal damage; it is shown as a rank of the 296 council areas in England. No figure is estimated and no county figure is given to a district. City of London and the Isles of Scilly are too small to compare fairly.
            </p>
            <p style={para}>
              Measures that are not published for every council area at council area level are left out, so that every area is judged the same way: police recorded crime rates (combined for some council areas and missing for others, so crime comes from the Indices of Deprivation instead), schools and road injuries (published for counties), temporary accommodation (not every council area reports it), sewage spills (not published by council area) and healthy life expectancy (published for counties). House prices against earnings and fly tipping are left out by choice. &ldquo;Least desirable&rdquo; here means the lowest score on these measures, nothing more. The council area average is the plain average of the {RANKED}, each counting once, so it is not the official England figure. Small differences in score change the order a lot, so areas a few places apart are much alike.
            </p>
          </details>
          <details style={{ borderTop: `1px solid ${INK_HAIRLINE}` }}>
            <summary style={foldSummary}>
              The {MEASURE_COUNT} measures in {TOPICS.length} topics
              <span className="og-fold-mark" aria-hidden="true" />
            </summary>
            {TOPICS.map((t) => (
              <div key={t.key}>
                <h3 style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, margin: '10px 0 4px' }}>{t.label}</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {MEASURES.filter((m) => m.topic === t.label).map((m) => (
                    <li key={m.key} style={{ ...para, margin: '0 0 6px' }}>
                      <strong>{m.label}</strong>: {m.unit}; {m.period}; {m.better === 'higher' ? 'higher is better' : 'lower is better'}.
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        </section>

        <PageSources sources={SOURCES}>
          <FoldNotes notes={[LICENCE_NOTE]} />
        </PageSources>
      </article>
    </OpenGovShell>
  );
}
