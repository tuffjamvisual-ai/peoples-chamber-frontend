// /councils/league-table — area league table for England: an area rating (how the
// area compares on eight topics) and, beside it, a council services score, with
// dated warning flags.
// Data: lib/council-league.ts (area_ratings written by scripts/score-areas.js;
// method scripts/lib/area-scoring.js and scripts/lib/area-measures.js).
//
// Wording rule: the area rating describes the area, not how well the council is
// run. Flags are facts with dates, never folded into a score.

import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import LastUpdated from '../../components/LastUpdated';
import LeagueTable from './LeagueTable';
import type { ClientRow } from './LeagueTable';
import Link from 'next/link';
import { SHOW_LEAGUE_TABLE } from '@/lib/feature-flags';
import { getLeagueData, TOPIC_NAMES, SERVICE_PARTS } from '@/lib/council-league';
import type { MeasureDetail } from '@/lib/council-league';
import ArticleEndSignup from '../../components/ArticleEndSignup';
import { DATA_SIGNUP_LINE } from '@/lib/signup-lines';

export const revalidate = 21600;

const PAGE_METADATA: Metadata = {
  title: 'How council areas in England compare',
  description:
    'How every council area in England compares on schools, safety, health, jobs and poverty, housing, environment, connectivity and local services, with a separate score for the services councils run and warnings such as section 114 notices.',
  alternates: { canonical: '/councils/league-table' },
};
// While hidden (23 Oct 2026), the page is a short withdrawal notice: kept out of search engines but its links followed,
// and out of the sitemap (app/sitemap.ts lists the page only when SHOW_LEAGUE_TABLE is true).
const WITHDRAWN_SENTENCE = 'The council league table has been withdrawn while its measures are reviewed.';
const WITHDRAWN_METADATA: Metadata = {
  title: 'Council league table withdrawn',
  description: WITHDRAWN_SENTENCE,
  robots: { index: false, follow: true },
};
export async function generateMetadata(): Promise<Metadata> {
  return SHOW_LEAGUE_TABLE ? PAGE_METADATA : WITHDRAWN_METADATA;
}

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };

function WithdrawnNotice() {
  const link: CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };
  return (
    <OpenGovShell pageStamp="League table">
      <BackLink
        fallbackHref="/councils"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }}
      />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: '#14100d', fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Council league table withdrawn
          </h1>
        </header>
        <p style={para}>{WITHDRAWN_SENTENCE}</p>
        {/* Searchers for council rankings still land here (Search Console, 17 to 23 Oct 2026: 49 impressions); the
            investigation is what they are looking for (owner's approval, 25 Oct 2026, report 44). */}
        <p style={para}>
          Looking for the councils with the most serious failures? Read{' '}
          <Link href="/editorials/ten-worst-performing-councils-england" style={link}>England&rsquo;s 10 Worst Council Failures Since 2018</Link>.
          {' '}Or read{' '}
          <Link href="/editorials/0w7zrd55z9" style={link}>Every Council &lsquo;Bankruptcy&rsquo; Notice Since 2018, Listed</Link>.
        </p>
        <p style={para}>
          <Link href="/councils" style={link}>All councils</Link>
          {' · '}
          <Link href="/councils/search" style={link}>Search for a council</Link>
        </p>
      </article>
      {/* Newsletter sign-up at the end of the page, for readers who are not signed in (report 81). */}
      <ArticleEndSignup source="data-league-table" line={DATA_SIGNUP_LINE} />
    </OpenGovShell>
  );
}

export default async function LeagueTablePage() {
  if (!SHOW_LEAGUE_TABLE) return <WithdrawnNotice />; // hidden (lib/feature-flags.ts): the notice, not the table
  const data = await getLeagueData();
  // The area's two highest- and two lowest-scoring measures (audit reassessment, 16 Oct 2026:
  // explain what is behind a position using the existing measures, with no new judgement).
  const measureExtremes = (ms: Record<string, MeasureDetail>): ClientRow['extremes'] => {
    const scored = Object.values(ms)
      .filter((m) => m.score != null)
      .map((m) => ({ label: m.label, value: m.value, period: m.period, score: m.score as number }))
      .sort((a, b) => b.score - a.score);
    const high = scored.slice(0, 2);
    const low = scored.slice(Math.max(high.length, scored.length - 2)).reverse();
    return { high, low };
  };
  const toClient = (r: (typeof data.rows)[number]): ClientRow => ({
    code: r.code, name: r.name, href: r.slug ? `/councils/${r.slug}` : null, type: r.type,
    areaScore: r.areaScore, areaRank: r.areaRank, areaBand: r.areaBand, nearBoundary: r.nearBoundary,
    bandChanges: r.bandChanges, bandVersions: r.bandVersions, topics: r.topics,
    servicesScore: r.servicesScore, servicesRank: r.servicesRank, servicesBand: r.servicesBand, services: r.services,
    flags: r.flags.map((f) => ({ label: f.label, county: f.county, kind: f.kind })),
    extremes: measureExtremes(r.measures),
  });
  const rows = data.rows.map(toClient);
  // Areas with a flag of their own, counted once; districts whose only flags belong to their
  // county are counted separately so a county's flag is not counted once per district (audit L10).
  const flagged = data.rows.filter((r) => r.flags.some((f) => !f.county)).length;
  const countyOnly = data.rows.filter((r) => r.flags.length > 0 && r.flags.every((f) => f.county)).length;
  const { stability } = data;

  const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', verticalAlign: 'bottom' };
  const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, verticalAlign: 'top' };

  return (
    <OpenGovShell pageStamp="League table">
      <BackLink
        fallbackHref="/councils"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }}
      />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: '#14100d', fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            England · {stability.ranked} council areas
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            How Council Areas Compare
          </h1>
          <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
            An area rating and a separate score for selected council services. Not a ranking of how well councils are run.
          </div>
        </header>

        <p style={para}>
          Two separate tables. The <strong>area rating</strong> shows how each area compares with the rest of England on eight topics, from schools and crime to health, housing and broadband. Much of that depends on things no council controls, such as local incomes and history, so it describes the area, not how well the council is run.
        </p>
        <p style={para}>
          The <strong>selected council services</strong> score covers four services councils run: schools, children’s services, recycling and planning. It does not cover every service, so it is not a verdict on the whole council. Each area is also placed among the 15 councils the government judges most like it, which is the fairest comparison. Warning flags show serious problems on the record, such as a section 114 notice (a council declaring it cannot balance its budget), with their dates, split into formal action and signs of financial pressure. {flagged} areas have a flag of their own{countyOnly > 0 ? `, and ${countyOnly} more districts have only a flag held by their county council` : ''}.
        </p>
        <p style={para}>
          Bands split the ranked areas into fifths: band 1 is the top fifth, band 5 the bottom. An area marked <span style={{ color: ACCENT }}>≈</span> is close to the edge of its band, so a small change in method could move it into the next one.
        </p>

        <LeagueTable rows={rows} topics={[...TOPIC_NAMES]} parts={SERVICE_PARTS} />

        {data.separate.length > 0 && (
          <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
            <h2 style={h2}>Listed separately</h2>
            {data.separate.map((r) => (
              <p key={r.code} style={para}>
                <strong>{r.slug ? <a href={`/councils/${r.slug}`} style={{ color: INK }}>{r.name}</a> : r.name}</strong>: {r.excludedReason}
                {r.areaScore != null && ` Area score ${r.areaScore.toFixed(1)}`}{r.servicesScore != null && `, council services score ${r.servicesScore.toFixed(1)}`}.
                {r.flags.length > 0 && ` Warning flags: ${r.flags.map((f) => f.label).join('; ')}.`}
              </p>
            ))}
          </section>
        )}

        <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
          <h2 style={h2}>How the scores work</h2>
          <p style={para}>
            Each measure is scored from 0 to 100 by where the area sits among all areas in England: the lowest figure scores 0, the highest 100, and areas with the same figure share a score. A topic’s score is the average of its measures, and the area score is the average of the eight topic scores, each counting the same. Topics count equally because there is no agreed way to say one matters more than another; the weight test below shows how much the order depends on that choice. An area needs figures for at least six of the eight topics to be ranked; a missing figure never counts against it. For a district, county run services (schools, children’s services) and health figures published only for the county come from its county.
          </p>
          <p style={para}>
            The council services score averages four parts: schools, children’s services, recycling and planning (major and other decisions averaged, so planning counts once). An area needs at least three of the four. Adult social care will join when the Care Quality Commission’s ratings can be added.
          </p>
          <p style={para}>
            Weight test: every area was scored {stability.versions} more ways, leaving out each topic in turn and counting each topic double. The order of areas stays broadly the same each time, but the exact band is less certain near its edges: {stability.near} of {stability.ranked} areas change band in half the versions or more (marked ≈), and {stability.never} never change band. Read the bands as broad groups, and use the topic scores to see why an area sits where it does.
          </p>
          <p style={para}>
            Warning flags: an Ofsted judgement of Inadequate for children’s services; a section 114 notice (dates from the published record); current government intervention or a best value inspection (GOV.UK list of statutory interventions); exceptional financial support from government, by financial year; and usable reserves (money a council holds that is not tied to schools or public health) below zero or down by half or more in {data.reservesYear ?? 'the latest year'}. For a district, flags marked “county” belong to its county council.
          </p>
          <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
            <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%', minWidth: '640px' }}>
              <thead>
                <tr>
                  <th style={th}>Topic</th>
                  <th style={th}>Measure</th>
                  <th style={th}>Better</th>
                  <th style={th}>Period</th>
                  <th style={th}>Mainly responsible</th>
                  <th style={th}>Source</th>
                </tr>
              </thead>
              <tbody>
                {data.measureInfo.map((m) => (
                  <tr key={m.key}>
                    <td style={td}>{m.topic}</td>
                    <td style={td}>{m.label}</td>
                    <td style={td}>{m.better === 'higher' ? 'Higher' : 'Lower'}</td>
                    <td style={td}>{m.period ?? 'n/a'}</td>
                    <td style={td}>{m.responsible}</td>
                    <td style={td}>{m.sourceUrl ? <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>{m.source}</a> : m.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={para}>
            Roads use the Department for Transport’s adjusted counts of people killed or seriously injured. Police forces record injuries in different ways, and some changed systems in recent years; the adjusted figures correct for that so areas can be compared. They are counted per billion vehicle miles on the highway authority’s roads.
          </p>
          <p style={para}>
            Crime is recorded crimes per 1,000 residents over 12 months, not counting antisocial behaviour. Greater Manchester’s published figures are incomplete, so its boroughs are not scored on crime. City of London and the Isles of Scilly are too small to compare fairly and are listed separately. Council finance: MHCLG revenue outturn 2024/25 (reserves), GOV.UK exceptional financial support and intervention pages.
          </p>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0, maxWidth: '46em' }}>
            Government sources are published under the Open Government Licence v3.0. Ofcom Connected Nations data is published by Ofcom. Police recorded crime from data.police.uk under the Open Government Licence.
          </p>
        </section>
      </article>
      <LastUpdated sourceKey="council_league_table" />
      {/* Newsletter sign-up at the end of the page, for readers who are not signed in (report 81). */}
      <ArticleEndSignup source="data-league-table" line={DATA_SIGNUP_LINE} />
    </OpenGovShell>
  );
}
