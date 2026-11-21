// /council-areas/lowest-scores (Cowork ENTRY 415: GO v3, v3 ADDENDUM, HEADLINE, LAYOUT CHANGE; published under the ENTRY 415 PUBLISH RULE).
// Not to be pushed until the publish rule passes (ENTRY 415 PUBLISH RULE). Not linked from any page, not in the sitemap
// (listed by hand in lib/sitemap/main.ts); indexable since the publish; the 294 explanation pages stay noindex.
//
// The 10 council areas in England with the lowest scores on the 'places' index (what residents live with, whoever is
// responsible), then 'Find your area': a postcode search through the site's existing /api/councils/lookup (postcodes.io)
// giving that council area's rank of 294, its score and a link to its explanation page
// (/council-areas/lowest-scores/<slug>, one for each of the 294). Every area is scored on exactly the same measures, from
// the same source, period and geography (the lower-tier council area); a measure not published for all 294 at that level
// is left out (v3 rule). The full list of 294 is not on the page (owner, ENTRY 415 LAYOUT CHANGE).
//
// Owner rules: 'council area', never 'town'; per cent in words; no time words; no hyphens in our text; sources only in the
// Sources fold (ENTRY 410); no outside links elsewhere; the owner's neutral caveat under the headline ('Not a ranking of how well councils are run: council performance is left out.').

import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import PageSources from '../../components/PageSources';
import SourceNotes from './SourceNotes';
import FindYourArea from './FindYourArea';
import LsMore from './LsMore';
import { AREAS, MEASURES, TOPICS, RANKED, MEASURE_COUNT, SOURCES, INK, INK_HAIRLINE, ACCENT, SERIF, MONO, h2, para, foldSummary } from './data';
import { plainScoreRank } from './ranks';
import { englandFigure } from './explain';
import { areaCovered, whySentence, weightingCheck, weightingSentence, SHARES, countWord } from './why';
import { PHONE } from '@/lib/breakpoints';

export const revalidate = false; // A16: static data, rebuilt only on a deploy

const HEADLINE = 'The 10 Least Desirable Places to Live in England, on the Official Figures';
export const metadata: Metadata = {
  title: { absolute: HEADLINE },
  description: 'Every English council area scored the same way on eleven official measures in five equal topics: the ten with the lowest scores, the measures that pull each down, and a postcode search for any area.',
  alternates: { canonical: '/council-areas/lowest-scores' },
  openGraph: { title: HEADLINE },
  twitter: { title: HEADLINE },
  robots: { index: true, follow: true },
};
const LOWEST10 = AREAS.slice(0, 10);
const CHECK = weightingCheck();

const scoreLine = (score: number, rank: number) => `${score.toFixed(1)} out of 100 · ${plainScoreRank(rank, RANKED)}`;

// Desktop: a four column table. Phones (the site's PHONE width): one card per row, the place name, the why sentence
// straight under it with the link 'Why <place> ranks here' (to the area page's Why fold, #why), then area and score (the
// .ls-meta line inside the why cell; the area and score cells hide). The Why fold is on area pages only (Cowork ENTRY 444
// decisions, 21 Nov 2026 04:12, item 1); the link runs on in the cell's text, so it adds no tap row to the phone length.
// data-pt-table="keep": the shared phone script leaves this table to these styles. The section is data-own-more, so the
// phone script adds no button of its own; LsMore shows 5 rows then 'Show 5 more' on phones (ENTRY 472 (4)).
const TABLE_CSS = `
.ls-ten { width: 100%; border-collapse: collapse; font-family: ${MONO}; font-size: 15px; color: ${INK}; }
.ls-ten th, .ls-ten td { text-align: left; vertical-align: top; padding: 10px 14px 8px 0; line-height: 1.45; font-weight: normal; }
.ls-ten thead th { text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1.5px solid ${INK}; padding-bottom: 6px; }
.ls-ten tr.ls-row > * { border-top: 1px solid ${INK_HAIRLINE}; }
.ls-ten tr.ls-row > th { font-family: ${SERIF}; font-size: 18px; font-weight: bold; width: 19%; }
.ls-ten .ls-area { width: 18%; }
.ls-ten .ls-score { width: 17%; }
.ls-ten .ls-meta { display: none; }
@media ${PHONE} {
  .ls-ten thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .ls-ten, .ls-ten tbody, .ls-ten tr, .ls-ten th, .ls-ten td { display: block; width: auto; }
  .ls-ten tr.ls-row { border-top: 1px solid ${INK_HAIRLINE}; padding-top: 8px; }
  .ls-ten tr.ls-row > * { border-top: 0; padding: 0; width: auto; }
  .ls-ten tr.ls-row > th { margin-bottom: 4px; width: auto; }
  .ls-ten .ls-area, .ls-ten .ls-score { display: none; }
  .ls-ten .ls-meta { display: block; margin-top: 4px; }
}`;

// Rank, score and name of every ranked council area by slug, for the postcode result (small: 294 short rows).
const RANKS = Object.fromEntries(AREAS.map((a) => [a.slug, [a.rank, a.score, a.name] as [number, number, string]]));

export default function LowestScoresPage() {
  return (
    <OpenGovShell pageStamp="Council areas">
      <BackLink fallbackHref="/councils" />
      {/* Small phones (Cowork ENTRY 475, owner approved 21 Nov 2026): on a first visit at 320 x 568 the cookie banner (from
          458px) covered the top of the main action (449px; daily QA A6). Under 360px only, less space above it: the
          article's top padding, the title band's padding and the gap below it, and the gap below the intro line. No words,
          figures or order change; 360px and wider are as before. */}
      <style>{`@media (max-width: 359.98px) {
  .ls-art { padding-top: 6px !important; }
  .ls-head { padding-top: 8px !important; padding-bottom: 8px !important; margin-bottom: 10px !important; }
  .ls-intro { margin-bottom: 8px !important; }
}`}</style>
      <article className="ls-art" style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <header className="ls-head" style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            England · {RANKED} council areas
          </div>
          {/* Owner's experiment (Cowork ENTRY 441): this page's headline at half its size at every width (was
              clamp(28px, 3.4vw, 44px)); same font, weight and line height ratio. To undo, drop the class and the style
              block and put fontSize 'clamp(28px, 3.4vw, 44px)' back in the h1's style. */}
          <style>{'.ls-h1-half { font-size: clamp(15px, 1.7vw, 22px); }'}</style>
          <h1 className="ls-h1-half" style={{ fontFamily: SERIF, fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {HEADLINE}
          </h1>
          <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
            Not a ranking of how well councils are run: council performance is left out.
          </div>
        </header>

        <p className="ls-intro" style={para}>
          All {RANKED} council areas in England, scored the same way on {MEASURE_COUNT} official measures in five equal topics, lowest score first.
        </p>

        {/* On phones the first 5, then 'Show 5 more' (owner, Cowork ENTRY 472 (4), 21 Nov 2026; LsMore); all 10 on wider
            screens and with JavaScript off. The phone script leaves lists inside [data-own-more] alone. Reader first
            layout (Cowork ENTRY 444): what the reader sees first is where, how it scores and why, in plain words. */}
        <section data-main-action="" data-own-more="" aria-label="The 10 lowest scores" style={{ marginBottom: '28px' }}>
          <h2 style={h2}>The 10 lowest scores</h2>
          <style>{TABLE_CSS}</style>
          <table className="ls-ten" data-pt-table="keep">
            <thead>
              <tr><th scope="col">Place</th><th scope="col">Area covered</th><th scope="col">Overall score</th><th scope="col">Why it ranks here</th></tr>
            </thead>
            <tbody>
              {LOWEST10.map((a) => (
                <tr key={a.slug} className="ls-row">
                  <th scope="row">
                    {a.rank}.{' '}
                    <Link href={`/council-areas/lowest-scores/${a.slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{a.name}</Link>
                  </th>
                  <td className="ls-area">{areaCovered(a.name, a.type)}</td>
                  <td className="ls-score">{scoreLine(a.score, a.rank)}</td>
                  <td className="ls-whyc">
                    {whySentence(a)}{' '}
                    <Link href={`/council-areas/lowest-scores/${a.slug}#why`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Why {a.name} ranks here</Link>
                    <span className="ls-meta">{areaCovered(a.name, a.type)} · {scoreLine(a.score, a.rank)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <LsMore total={LOWEST10.length} />
          {/* ENTRY 444 item 4: worked out from the page data on every build (why.ts weightingCheck). */}
          <p style={{ ...para, margin: '12px 0 0' }}>{weightingSentence(CHECK)}</p>
        </section>

        <section aria-label="Find your area" style={{ border: `1.5px solid ${INK}`, padding: '10px 12px', marginBottom: '20px' }}>
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
              Each measure is scored from 0 to 100 by where the council area sits among all {RANKED}: the best figure scores 100, the worst 0, and areas with the same figure share a score. A topic&rsquo;s score is the average of its measures; the overall score is the average of the five topics, so each topic counts a fifth. No figure is estimated and no county figure is given to a district. City of London and the Isles of Scilly are too small to compare fairly.
             Crime is the government&rsquo;s crime score for each council area, built from crimes recorded by the police from April 2018 to March 2024 (violence, stalking and harassment, burglary, theft other than shoplifting, criminal damage, public order and weapons offences) and antisocial behaviour incidents from April 2022 to March 2024. The government ranks 296 council areas on it, including City of London and the Isles of Scilly; here crime is ranked among the 294, like every other measure. This is not the <Link href="/councils/league-table" style={{ color: INK }}>council area league table</Link>, which uses more measures, including some published only for counties, so the order is different.</p>
            {/* ENTRY 444 items 2, 3(b) and 4: the rules behind the why sentences and the Why folds, and the checks. No body or
                dataset names here (ENTRY 444 decisions item 4); the deprivation check's source is in the Sources fold. */}
            <p style={para}>
              Each measure&rsquo;s share of the overall score: {SHARES.map((t) => `${t.topic.toLowerCase()} ${t.share}${t.count > 1 ? ` each (${countWord(t.count)} measures)` : ' (one measure)'}`).join('; ')}. The sentence beside each area names its two lowest scoring topics and, in each, the measure with the lowest score, with its figure. In &ldquo;Why it ranks here&rdquo; on each area&rsquo;s page, a measure&rsquo;s effect is how far its score falls below 50, the middle, times its share of the overall score: the measure with the largest effect had the biggest effect on the score, and the one furthest above 50, times its share, helped most.
            </p>
            <p style={para}>
              The {countWord(CHECK.ways)} ways of weighting the figures: the five topics counting equally (the method used here), every measure counting equally, and the five topics counting equally with each topic left out in turn.{CHECK.out.length > 0 && ` ${CHECK.out.map((o) => o.name).join(' and ')} left the bottom ${CHECK.bottom} with ${CHECK.out.map((o) => o.run).join(' and ')}.`} As checks, the order of the {RANKED} by overall score is close to their order on the government&rsquo;s overall measure of deprivation (a rank correlation of 0.92, where 1 would be the same order) and by life expectancy (0.88). Life expectancy is itself one of the {MEASURE_COUNT} measures, so the second check is not independent.
            </p>
            <p style={para}>
              Measures that are not published for every council area at council area level are left out, so that every area is judged the same way: police recorded crime rates (combined for some council areas and missing for others, so the score uses the government&rsquo;s crime score instead; each area&rsquo;s page shows its police figure for information, crimes recorded per 1,000 residents in the year to June 2026, not counting fraud, which is recorded nationally; rates are high in city centres, where many people visit but few live), temporary accommodation (not every council area reports it in any one quarter) and healthy life expectancy (published only for counties and unitary councils). Road safety counts people killed or seriously injured in collisions in the area; it is per resident. House prices against earnings, fly tipping and sewage spills are left out by choice. &ldquo;Least desirable&rdquo; here means the lowest score on these measures, nothing more. The council area average is the plain average of the {RANKED}, each counting once, so it is not the official England figure. Small differences in score change the order a lot, so areas a few places apart are much alike.
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
                      <strong>{m.label}</strong>: {m.unit}; {m.period}; {m.better === 'higher' ? 'higher is better' : 'lower is better'}.{englandFigure(m.key) ? ` ${englandFigure(m.key)}.` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        </section>

        <PageSources sources={SOURCES}>
          <SourceNotes />
        </PageSources>
      </article>
    </OpenGovShell>
  );
}
