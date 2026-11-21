// /council-areas/lowest-scores/<slug>: DRAFT (Cowork ENTRY 415 v3 ADDENDUM): one council area's explanation: its rank
// and overall score, each topic's and each measure's score and figure, the three measures pulling it down most and the
// three pulling it up most; sources only in the Sources fold (ENTRY 410). Not linked from outside the draft, noindex.
// Built for all 294 from the static JSON (dynamicParams false), so every postcode result on the main page has somewhere to
// go. noindex (ENTRY 415 LAYOUT CHANGE: indexable only if they meet the page quality rules): 294 pages built from one
// template with the same eight measures read as near duplicates and add little beyond the figures, so they stay noindex.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import PageSources from '../../../components/PageSources';
import SourceNotes from '../SourceNotes';
import { AREAS, topicHeading, RANKED, SOURCES, AREA_NOTES, AVG_TOPIC, bySlug, INK, INK_HAIRLINE, ACCENT, SERIF, MONO, h2, para, foldSummary, type Area, type Measure } from '../data';
import { explainMeasure, explainPolice, explainScore, measureRank, plainPeriod, shortFigure } from '../explain';
import { cap, plainScoreRank } from '../ranks';
import { whySentence } from '../why';
import WhyFold from '../WhyFold';
import { ALL_MEASURES_ID, OpenFoldOnHash } from '../AllMeasuresLink';

export const revalidate = false; // A16: static data, rebuilt only on a deploy
export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = bySlug.get(slug);
  if (!a) return {};
  return { title: `${a.name}: how the council area scores`, description: `How ${a.name} scores on the eleven official measures behind the council areas list: its rank of 294, its score and the measures that pull it down and up.`, robots: { index: false, follow: true } };
}

const item = { ...para, lineHeight: 1.5, margin: '0 0 8px', paddingLeft: '12px' };

function MeasureLine({ m, a, mark }: { m: Measure; a: Area; mark: string }) {
  return (
    <li style={{ ...item, borderLeft: `3px solid ${mark}` }}>
      <strong>{m.label}</strong>: {m.key === 'crime' ? cap(measureRank(m)) : <>{shortFigure(m, a)}; {measureRank(m)}</>}
    </li>
  );
}

export default async function AreaScorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = bySlug.get(slug);
  if (!a) notFound();
  return (
    <OpenGovShell pageStamp="Council areas">
      <BackLink fallbackHref="/council-areas/lowest-scores" />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            {a.type} · council area
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, lineHeight: 1.18, margin: 0 }}>{a.name}</h1>
          <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
            {cap(plainScoreRank(a.rank, RANKED))} · score {a.score.toFixed(1)} out of 100
          </div>
        </header>

        <p style={para}>{explainScore(a, RANKED)}</p>

        {/* Reader first (Cowork ENTRY 444 items 2 and 3): the why sentence and the Why fold (id why; on area pages only,
            ENTRY 444 decisions item 1: the main page links each of the ten here with #why, which opens it). */}
        <p style={para}>{whySentence(a)}</p>
        <section aria-label={`Why ${a.name} ranks here`} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, borderBottom: `1px solid ${INK_HAIRLINE}`, marginBottom: '22px' }}>
          <WhyFold a={a} />
        </section>

        <p style={para}>
          The score is the average of five topics, each the average of its measures, every measure scored 0 to 100 against all {RANKED} council areas. <Link href="/council-areas/lowest-scores" style={{ color: INK }}>See the 10 lowest and find another council area</Link> or <Link href={`/councils/${a.slug}`} style={{ color: INK }}>the council&apos;s own page</Link>. Not a ranking of how well councils are run: council performance is left out.
        </p>

        {AREA_NOTES[a.slug] && <p style={para}><strong>{AREA_NOTES[a.slug]}</strong></p>}

        <section aria-label={`Where ${a.name} ranks lowest on individual measures`} style={{ marginBottom: '22px' }}>
          <h2 style={h2}>Where {a.name} ranks lowest on individual measures</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{a.down.map((m) => <MeasureLine key={m.key} m={m} a={a} mark={ACCENT} />)}</ul>
        </section>
        <section aria-label={`Where ${a.name} ranks highest on individual measures`} style={{ marginBottom: '22px' }}>
          <h2 style={h2}>Where {a.name} ranks highest on individual measures</h2>
          {/* Only measures better than the middle of the 294 (score above 50) count as pulling it up (Cowork, 18:34). */}
          {a.up.length > 0
            ? <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{a.up.map((m) => <MeasureLine key={m.key} m={m} a={a} mark={INK_HAIRLINE} />)}</ul>
            : <p style={para}>No measure is better than the middle of the 294.</p>}
        </section>

        {/* The police recorded crime figure, shown for information and not scored (ENTRY 436 point 1). */}
        <section aria-label="Police recorded crime" style={{ marginBottom: '22px' }}>
          <h2 style={h2}>Police recorded crime (not scored)</h2>
          <p style={para}>{explainPolice(a)}</p>
        </section>

        {/* Every measure, one short paragraph each: what the figure means, England's figure (ENTRY 484) and a plain rank
            (ENTRY 436 points 2 and 3), then its score out of 100; paragraphs, not a list, so the shared phone script leaves
            them whole. In a fold, closed as the page opens, so the page keeps to the 2,500px phone limit (A3). */}
        <OpenFoldOnHash />
        <details id={ALL_MEASURES_ID} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, marginBottom: '8px', scrollMarginTop: '12px' }}>
          <summary style={foldSummary}>
            Every measure explained
            <span className="og-fold-mark" aria-hidden="true" />
          </summary>
          <p style={{ ...para, margin: '0 0 8px' }}>A topic&apos;s score is the average of its measures&apos; scores, each out of 100.</p>
          {a.topics.map((t) => (
            <div key={t.label} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, padding: '6px 0 0' }}>
              <h3 style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 4px' }}>{topicHeading(t.label)}: score {t.score.toFixed(1)} (average {(AVG_TOPIC.get(t.label) ?? 50).toFixed(1)})</h3>
              {a.all.filter((m) => m.topic === t.label).map((m) => (
                <p key={m.key} style={{ ...para, lineHeight: 1.45, margin: '0 0 8px' }}>
                  <strong>{m.label}</strong> ({plainPeriod(m.period)}), score {m.score.toFixed(1)}: {explainMeasure(m, a)}
                </p>
              ))}
            </div>
          ))}
        </details>

        <PageSources sources={SOURCES}>
          <SourceNotes />
        </PageSources>
      </article>
    </OpenGovShell>
  );
}
