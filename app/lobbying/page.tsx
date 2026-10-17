// /lobbying — who meets ministers, and who pays consultant lobbyists.
// Organisation rankings come from the lobbying index (lib/lobbying.ts); only names matched
// through hand-checked spellings or GOV.UK's official list are counted.

import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import LastUpdated from '../components/LastUpdated';
import LobbyRanking, { type RankingTab } from './LobbyRanking';
import ClientSearch from './ClientSearch';
import { getRankings, getSummary, getFirmsForQuarter, quarterLabel, fmtDate, type RankingRow, type OrgType } from '@/lib/lobbying';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Lobbying: who meets UK ministers and who pays lobbyists',
  description:
    "Which companies, trade bodies, unions and charities meet UK government ministers most often, from the government's own published meeting records, and which consultant lobbying firms act for which clients, from the Registrar of Consultant Lobbyists.",
  alternates: { canonical: '/lobbying' },
};

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const SERIF = 'Special Elite, monospace';
const MONO = 'Special Elite, monospace';
const TOP = 30;

// "All" leaves out public bodies (government talking to itself) and media (mostly
// interviews); both have their own tabs.
const TABS: { key: string; label: string; types: OrgType[] | null }[] = [
  { key: 'all', label: 'All', types: null },
  { key: 'company', label: 'Companies', types: ['company'] },
  { key: 'trade_body', label: 'Trade bodies', types: ['trade_body'] },
  { key: 'union', label: 'Unions', types: ['union'] },
  { key: 'charity', label: 'Charities', types: ['charity'] },
  { key: 'campaign', label: 'Campaigns', types: ['campaign'] },
  { key: 'think_tank', label: 'Think tanks', types: ['think_tank'] },
  { key: 'professional_body', label: 'Professional bodies', types: ['professional_body'] },
  { key: 'academic', label: 'Universities', types: ['academic'] },
  { key: 'public_body', label: 'Public bodies', types: ['public_body'] },
  { key: 'media', label: 'Media', types: ['media'] },
];

function topFor(rows: RankingRow[], types: OrgType[] | null, period: '12m' | 'all') {
  const pick = (r: RankingRow) => (period === '12m' ? r.meetings_12m : r.meetings_all);
  return rows
    .filter((r) => (types ? types.includes(r.org_type) : r.org_type !== 'public_body' && r.org_type !== 'media'))
    .filter((r) => pick(r) > 0)
    .sort((a, b) => pick(b) - pick(a) || a.name.localeCompare(b.name))
    .slice(0, TOP)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      orgType: r.org_type,
      meetings: pick(r),
      ministers: period === '12m' ? r.ministers_12m : r.ministers_all,
      lobbyingFirms: r.lobbying_firms,
    }));
}

export default async function LobbyingPage() {
  const [rankings, summary] = await Promise.all([getRankings(), getSummary()]);
  const latestQuarter = summary?.orcl_last_quarter || null;
  const firms = latestQuarter ? await getFirmsForQuarter(latestQuarter) : [];

  const tabs: RankingTab[] = TABS.map((t) => ({
    key: t.key,
    label: t.label,
    last12: topFor(rankings, t.types, '12m'),
    sinceStart: topFor(rankings, t.types, 'all'),
  })).filter((t) => t.sinceStart.length > 0);

  const ranked = rankings.filter((r) => r.meetings_all > 0).length;
  const both = rankings.filter((r) => r.meetings_all > 0 && r.lobbying_firms > 0).length;
  const matchedShare = summary && summary.mentions - summary.mentions_excluded > 0
    ? Math.round((100 * summary.mentions_matched) / (summary.mentions - summary.mentions_excluded))
    : 0;
  const since = fmtDate(summary?.first_meeting || null);

  return (
    <OpenGovShell pageStamp="Lobbying">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <article style={{ padding: 'clamp(8px, 2vw, 24px) 0', color: '#1a140e', fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            Ministers’ meetings · Register of Consultant Lobbyists
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Lobbying
          </h1>
        </header>

        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, margin: '0 auto 28px', maxWidth: '46em', color: INK }}>
          Who gets in the room with government ministers, and who pays professional lobbyists to
          speak for them. Meetings come from the returns each department publishes; lobbying firms
          and their clients come from the statutory Register of Consultant Lobbyists. Choose an
          organisation to see every meeting and every lobbying firm it used.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          <Stat label="Ministers’ meeting entries" value={(summary?.meeting_entries || 0).toLocaleString('en-GB')} />
          <Stat label="Organisations ranked" value={ranked.toLocaleString('en-GB')} />
          <Stat label="Lobbying firms on the register" value={(summary?.orcl_firms || 0).toLocaleString('en-GB')} />
        </div>

        <h2 style={sectionHead}>Who meets ministers most</h2>
        <LobbyRanking tabs={tabs} sinceLabel={since ? `Since ${since}` : 'All'} />
        {both > 0 && (
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '14px 0 0', maxWidth: '46em' }}>
            {both.toLocaleString('en-GB')} of the ranked organisations also appear as a client of a consultant lobbying firm.
          </p>
        )}

        <h2 style={{ ...sectionHead, marginTop: '44px' }}>Consultant lobbyists</h2>
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 16px', maxWidth: '46em' }}>
          Firms that lobby ministers or permanent secretaries for a paying client must register and
          name their clients every quarter. Lobbyists employed directly by the organisation they
          lobby for, do not have to register.
        </p>
        {latestQuarter && firms.length > 0 && (
          <>
            <h3 style={{ fontFamily: MONO, fontSize: '14px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK, margin: '0 0 8px', fontWeight: 'bold' }}>
              Firms with the most clients, {quarterLabel(latestQuarter)}
            </h3>
            <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', borderTop: `1px solid ${INK_HAIRLINE}`, maxWidth: '46em' }}>
              {firms.slice(0, 15).map((f, i) => (
                <li key={f.firm} style={{ display: 'flex', gap: '12px', alignItems: 'baseline', padding: '8px 2px', borderBottom: `1px solid ${INK_HAIRLINE}`, fontFamily: SERIF, fontSize: '16px', color: INK }}>
                  <span style={{ width: '2em', flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                  <span style={{ flex: '1 1 auto', minWidth: 0, overflowWrap: 'anywhere' }}>{f.firm}</span>
                  <span style={{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{f.clients} client{f.clients === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        <ClientSearch />

        <section style={{ marginTop: '40px', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.7, maxWidth: '46em' }}>
          <strong>How this is counted.</strong> A meeting is one entry in a minister’s published
          return, so a meeting with two ministers counts once for each, as the government publishes
          it. Organisations are counted only when their name matches a spelling checked by hand or
          GOV.UK’s official list of public bodies; job titles, people’s names and names that could
          mean more than one organisation are left out of the rankings but kept in the meeting
          records.{summary ? ` So far ${matchedShare}% of the ${(summary.mentions - summary.mentions_excluded).toLocaleString('en-GB')} organisation names in the meeting returns are matched; the rest are still to be checked, so less frequent visitors may be missing from the rankings.` : ''}{' '}
          Departments publish their returns months after the meetings, so the most recent months
          are incomplete. The lobbyist register covers {summary ? registerSpan(summary.orcl_first_quarter, summary.orcl_last_quarter) : 'recent quarters'}.
          Sources: GOV.UK ministers’ meetings transparency returns and the Registrar of Consultant
          Lobbyists quarterly returns, both under the Open Government Licence v3.0.
        </section>
        <LastUpdated sourceKey="lobbying_meetings" />
        <LastUpdated sourceKey="consultant_lobbyists" />
      </article>
    </OpenGovShell>
  );
}

// "2024-04-01", "2026-04-01" -> "April 2024 to June 2026".
function registerSpan(first: string | null, last: string | null): string {
  const a = quarterLabel(first).split(' to ');
  const b = quarterLabel(last).split(' to ');
  if (a.length < 2 || b.length < 2) return 'recent quarters';
  return `${a[0]} ${a[1].split(' ').pop()} to ${b[1]}`;
}

const sectionHead: CSSProperties = {
  fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderTop: `2px solid ${INK}`, padding: '10px 0 4px' }}>
      <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.22em', color: INK_SOFT, margin: '0 0 6px', fontWeight: 'bold', fontFamily: MONO }}>{label}</p>
      <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 700, letterSpacing: '-0.01em', color: INK, fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1.1, fontFamily: SERIF }}>{value}</p>
    </div>
  );
}
