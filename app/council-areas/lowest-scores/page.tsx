// /council-areas/lowest-scores: DRAFT for pictures only (Cowork ENTRY 415 and its ADDENDUM; backlog job 3 of ENTRY 429).
// Not to be pushed until the owner says yes. Not linked from any page, not in the sitemap (lib/sitemap lists pages by
// hand), noindex.
//
// The 20 council areas with the lowest scores on the 'places' index: what residents live with, whoever is responsible
// (14 official measures; council performance measures such as road maintenance are kept for a separate councils list).
// Data: lowest-scores.json, written from the audit's scores (audit/worst-places-415/scores.csv, v2) by the draft's
// scratch script; no database read. Each area's three 'why' measures are those with its lowest scores.
//
// Owner rules: 'council area', never 'town'; per cent in words; no time words; figures' sources only in the Sources fold
// (ENTRY 410); no outside links elsewhere; the 'not the council's fault' caveat.

import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import DraftBanner from '../../components/DraftBanner';
import PageSources from '../../components/PageSources';
import FoldNotes from '../../components/FoldNotes';
import { ShowAll } from '../../components/NoJsPager';
import { OGL_URL } from '@/lib/fold-notes';
import data from './lowest-scores.json';

export const revalidate = false; // A16: static data, rebuilt only on a deploy

export const metadata: Metadata = {
  title: 'Council areas with the lowest scores (draft)',
  description: 'Draft, not public.',
  robots: { index: false, follow: false },
};

type Why = { key: string; label: string; figure: string; average: string; rank: number; of: number; period: string; county: boolean };
type Area = { position: number; name: string; slug: string; type: string; score: number; counted: number; missing: string[]; why: Why[] };
type Measure = { key: string; label: string; unit: string; period: string; better: string; county: boolean; source: string; href: string };
const AREAS = data.areas as Area[];
const MEASURES = data.measures as Measure[];
// One line per source address: measures from the same source (Ofcom) share it.
const SOURCES = [...MEASURES.reduce((m, x) => {
  const prev = m.get(x.href);
  m.set(x.href, prev ? { ...prev, labels: [...prev.labels, x.label] } : { labels: [x.label], source: x.source });
  return m;
}, new Map<string, { labels: string[]; source: string }>())].map(([href, v]) => ({ label: `${v.labels.join(' and ')}: ${v.source}`, href }));

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };
const foldSummary: CSSProperties = { cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, fontSize: '15px', color: INK };

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
};

function AreaCard({ a }: { a: Area }) {
  return (
    <li style={{ borderTop: `1px solid ${INK_HAIRLINE}`, padding: '10px 0 0' }}>
      <h3 style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 'bold', margin: '0 0 2px', color: INK }}>
        {a.position}. <Link href={`/councils/${a.slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{a.name}</Link>
      </h3>
      <p style={{ ...para, lineHeight: 1.5, margin: '0 0 8px' }}>
        {a.type} · score {a.score.toFixed(1)}
        {a.missing.length > 0 && ` · no ${a.missing.join(', ').toLowerCase()} figure`}
      </p>
      <ul aria-label="What pulls it down" style={{ listStyle: 'none', margin: '0 0 6px', padding: 0 }}>
        {a.why.map((w) => (
          <li key={w.key} style={{ ...para, lineHeight: 1.5, margin: '0 0 6px', paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}` }}>
            <strong>{w.label}{w.county ? ' (county figure)' : ''}</strong>: {w.figure} (average {w.average}); {ordinal(w.rank)} of {w.of}; {w.period}
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function LowestScoresPage() {
  return (
    <OpenGovShell pageStamp="Council areas">
      <BackLink fallbackHref="/councils" />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <DraftBanner published={false} />
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            England · {data.ranked} council areas
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Council Areas with the Lowest Scores
          </h1>
          <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
            Not a ranking of how well councils are run.
          </div>
        </header>

        <p style={para}>
          The 20 council areas with the lowest scores on {data.measureCount} official measures of what residents live with, from crime and poverty to health, housing and broadband. Each measure is scored 0 to 100 by rank; an area&rsquo;s score is the average. Below each: the three measures that pull it down most, the council area average and its rank (1st is best).
        </p>
        <p style={para}>
          <strong>Not the council&rsquo;s fault.</strong> Most of this depends on the economy, government, police, water and telecoms firms more than on the council. Council performance, such as finances and road repairs, is left out.
        </p>

        <section data-main-action="" aria-label="The 20 council areas" style={{ marginBottom: '28px' }}>
          <h2 style={h2}>The 20 lowest scores</h2>
          <ShowAll id="ls-areas" count={AREAS.length} rows="> li" noun={{ one: 'council area', many: 'council areas' }}>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {AREAS.map((a) => <AreaCard key={a.slug} a={a} />)}
            </ol>
          </ShowAll>
        </section>

        <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, marginBottom: '8px' }}>
          <details>
            <summary style={foldSummary}>
              How the scores work
              <span className="og-fold-mark" aria-hidden="true" />
            </summary>
          <p style={para}>
            Each measure is scored from 0 to 100 by where the council area sits among all {data.ranked} ranked council areas: the best figure scores 100, the worst 0, and areas with the same figure share a score. An area&rsquo;s score is the average of its measure scores, each counting the same. An area missing more than two measures would be left out; none is. A missing figure is never estimated. City of London and the Isles of Scilly are too small to compare fairly.
          </p>
          <p style={para}>
            The council area average is the plain average of the ranked council areas, each counting once, so it is not the official England figure. Schools and road injuries are published only for counties and unitary councils, so a district takes its county&rsquo;s figure (marked &ldquo;county figure&rdquo;). The order changes when the measures are weighted differently, so read the list as a group, not as an exact ranking.
          </p>
          </details>
          <details style={{ borderTop: `1px solid ${INK_HAIRLINE}` }}>
            <summary style={foldSummary}>
              The {data.measureCount} measures
              <span className="og-fold-mark" aria-hidden="true" />
            </summary>
            <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
              {MEASURES.map((m) => (
                <li key={m.key} style={{ ...para, margin: '0 0 6px' }}>
                  <strong>{m.label}</strong>: {m.unit}; {m.period}; {m.better === 'higher' ? 'higher is better' : 'lower is better'}{m.county ? '; county figure for districts' : ''}.
                </li>
              ))}
            </ul>
          </details>
        </section>

        <PageSources sources={[
          ...SOURCES,
          { label: 'Population (for crime per 1,000 residents): ONS mid-2025 population estimates', href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates' },
        ]}>
          <FoldNotes notes={[{ text: 'Government sources are published under the Open Government Licence v3.0. Ofcom Connected Nations data is published by Ofcom. Police recorded crime from data.police.uk under the Open Government Licence.', href: OGL_URL }]} />
        </PageSources>
      </article>
    </OpenGovShell>
  );
}
