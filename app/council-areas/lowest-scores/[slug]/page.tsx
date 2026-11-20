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
import DraftBanner from '../../../components/DraftBanner';
import PageSources from '../../../components/PageSources';
import SourceNotes from '../SourceNotes';
import { AREAS, RANKED, SOURCES, AREA_NOTES, bySlug, ordinal, INK, INK_HAIRLINE, ACCENT, SERIF, MONO, h2, para, type Measure } from '../data';

export const revalidate = false; // A16: static data, rebuilt only on a deploy
export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = bySlug.get(slug);
  if (!a) return {};
  return { title: `${a.name}: how the council area scores (draft)`, description: 'Draft, not public.', robots: { index: false, follow: false } };
}

const item = { ...para, lineHeight: 1.5, margin: '0 0 8px', paddingLeft: '12px' };

function MeasureLine({ m, mark }: { m: Measure; mark: string }) {
  return (
    <li style={{ ...item, borderLeft: `3px solid ${mark}` }}>
      <strong>{m.label}</strong>: {m.key === 'crime' ? <>{m.figure}; {m.period}</> : <>{m.figure} (council area average {m.average}); {ordinal(m.rank)} of {m.of}, where 1st is the worst figure; {m.period}</>}
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
        <DraftBanner published={false} />
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            {a.type} · council area
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, lineHeight: 1.18, margin: 0 }}>{a.name}</h1>
          <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
            Rank {a.rank} of {RANKED} (1 is the lowest score) · score {a.score.toFixed(1)} out of 100
          </div>
        </header>

        <p style={para}>
          The score is the average of five topics, each the average of its measures, every measure scored 0 to 100 against all {RANKED} council areas. <Link href="/council-areas/lowest-scores" style={{ color: INK }}>See the 10 lowest and find another council area</Link> or <Link href={`/councils/${a.slug}`} style={{ color: INK }}>the council&rsquo;s own page</Link>. Not the council&rsquo;s fault: council performance is left out.
        </p>

        {AREA_NOTES[a.slug] && <p style={para}><strong>{AREA_NOTES[a.slug]}</strong></p>}

        <section aria-label="Pulling it down most" style={{ marginBottom: '22px' }}>
          <h2 style={h2}>Pulling it down most</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{a.down.map((m) => <MeasureLine key={m.key} m={m} mark={ACCENT} />)}</ul>
        </section>
        <section aria-label="Pulling it up most" style={{ marginBottom: '22px' }}>
          <h2 style={h2}>Pulling it up most</h2>
          {/* Only measures better than the middle of the 294 (score above 50) count as pulling it up (Cowork, 18:34). */}
          {a.up.length > 0
            ? <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{a.up.map((m) => <MeasureLine key={m.key} m={m} mark={INK_HAIRLINE} />)}</ul>
            : <p style={para}>No measure is better than the middle of the 294.</p>}
        </section>

        <section aria-label="Every measure" style={{ marginBottom: '22px' }}>
          <h2 style={h2}>Every measure</h2>
          {a.topics.map((t) => (
            <div key={t.label} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, padding: '8px 0 2px' }}>
              <h3 style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>{t.label}: score {t.score.toFixed(1)}</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {a.all.filter((m) => m.topic === t.label).map((m) => (
                  <li key={m.key} style={{ ...para, lineHeight: 1.5, margin: '0 0 6px' }}>
                    {m.label}: {m.figure}, score {m.score.toFixed(1)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <PageSources sources={SOURCES}>
          <SourceNotes />
        </PageSources>
      </article>
    </OpenGovShell>
  );
}
