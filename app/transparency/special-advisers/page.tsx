// /transparency/special-advisers — current-quarter Special Advisers
// transparency surface.
//
// Reads the four current-only tables populated by
// /api/sync-spad-transparency on a weekly cron. Renders:
//   - current roster grouped by publishing area
//   - gifts, hospitality, and media meetings tables filtered to
//     non-empty rows (Nil Return rows are absent from these tables
//     by design)
//
// No archive view. No per-quarter history. The page always shows
// the most recent published quarter. The quarter label is read
// from the data itself.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

export const metadata: Metadata = {
  title: "UK Special Advisers transparency: who advises which minister, and what they declared | The People's Chamber",
  description:
    'Every current UK Special Adviser, the department they work for, and the gifts, hospitality and meetings with senior media figures they declared in the most recent published quarter.',
  alternates: { canonical: '/transparency/special-advisers' },
};

type RosterRow = { name: string; area: string; quarter: string };
type GiftRow = { spad_name: string; area: string; gift_date: string | null; gift_descr: string | null; donor: string | null; value_gbp: string | null; outcome: string | null };
type HospRow = { spad_name: string; area: string; hosp_date: string | null; hosp_descr: string | null; provider: string | null; purpose: string | null };
type MeetRow = { spad_name: string; area: string; meeting_date: string | null; media_org: string | null; individual: string | null; purpose: string | null };

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

export default async function SpecialAdvisersPage() {
  const [roster, gifts, hosps, meets] = await Promise.all([
    fetchAll<RosterRow>('special_advisers', 'name, area, quarter'),
    fetchAll<GiftRow>('spad_gifts', 'spad_name, area, gift_date, gift_descr, donor, value_gbp, outcome'),
    fetchAll<HospRow>('spad_hospitality', 'spad_name, area, hosp_date, hosp_descr, provider, purpose'),
    fetchAll<MeetRow>('spad_media_meetings', 'spad_name, area, meeting_date, media_org, individual, purpose'),
  ]);

  const quarter = roster[0]?.quarter || '(no data yet)';

  // Roster grouped by area
  const byArea = new Map<string, RosterRow[]>();
  for (const r of roster) {
    if (!byArea.has(r.area)) byArea.set(r.area, []);
    byArea.get(r.area)!.push(r);
  }
  const areas = Array.from(byArea.entries()).sort((a, b) => b[1].length - a[1].length);

  // Activity by SpAd
  const giftCount = new Map<string, number>();
  for (const g of gifts) giftCount.set(g.spad_name, (giftCount.get(g.spad_name) || 0) + 1);
  const hospCount = new Map<string, number>();
  for (const h of hosps) hospCount.set(h.spad_name, (hospCount.get(h.spad_name) || 0) + 1);
  const meetCount = new Map<string, number>();
  for (const m of meets) meetCount.set(m.spad_name, (meetCount.get(m.spad_name) || 0) + 1);

  // Most active SpAds (any stream)
  const allNames = new Set<string>([
    ...gifts.map((g) => g.spad_name),
    ...hosps.map((h) => h.spad_name),
    ...meets.map((m) => m.spad_name),
  ]);
  type ActivityRow = { name: string; gifts: number; hospitality: number; meetings: number; total: number };
  const activity: ActivityRow[] = Array.from(allNames).map((name) => {
    const g = giftCount.get(name) || 0;
    const h = hospCount.get(name) || 0;
    const m = meetCount.get(name) || 0;
    return { name, gifts: g, hospitality: h, meetings: m, total: g + h + m };
  });
  activity.sort((a, b) => b.total - a.total);

  return (
    <DossierShell>
      <BackLink fallbackHref="/transparency" label="← Transparency" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Transparency · Special Advisers
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', lineHeight: 1.15 }}>
          Who advises Whitehall, and what they declared
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch' }}>
          Special Advisers are political appointees paid out of public funds. They are not civil servants, not ministers and not elected. They write speeches, brief ministers, set tone, and often drive policy. Their conduct sits outside the MPs&rsquo; Register of Interests and outside the standard civil service rules.
        </p>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', marginTop: '12px' }}>
          The Cabinet Office and the major Whitehall departments publish a quarterly return of each Special Adviser&rsquo;s gifts, hospitality, and meetings with senior media figures. This page is the consolidated view across every publishing department for the most recent quarter only. Older quarters are not retained.
        </p>
        <p style={{ marginTop: '14px', fontFamily: '"Special Elite", monospace', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT }}>
          Quarter shown: {quarter}
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        <Tile label="Special Advisers" value={String(roster.length)} sub="on the current roster" />
        <Tile label="Departments" value={String(areas.length)} sub="publishing this quarter" />
        <Tile label="Declared gifts" value={String(gifts.length)} sub="non-nil entries" />
        <Tile label="Declared hospitality" value={String(hosps.length)} sub="non-nil entries" />
        <Tile label="Media meetings" value={String(meets.length)} sub="with senior media figures" />
      </section>

      <section style={{ marginBottom: '36px' }}>
        <h2 style={sectionH2}>Current roster · {roster.length} Special Advisers</h2>
        {areas.map(([area, list]) => (
          <details key={area} style={{ marginBottom: '12px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
            <summary style={{ cursor: 'pointer', fontFamily: '"Special Elite", monospace', fontSize: '14px', fontWeight: 'bold', padding: '6px 0', color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {area} · {list.length}
            </summary>
            <ul style={{ listStyle: 'none', padding: '8px 0', margin: 0, columns: '2 280px', columnGap: '24px', fontSize: '13px', fontFamily: '"Special Elite", monospace' }}>
              {list.sort((a, b) => a.name.localeCompare(b.name)).map((r) => (
                <li key={`${r.area}|${r.name}`} style={{ padding: '2px 0', breakInside: 'avoid' }}>{r.name}</li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {activity.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={sectionH2}>Most active Special Advisers this quarter</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
                <th style={th}>#</th>
                <th style={th}>Special Adviser</th>
                <th style={{ ...th, textAlign: 'right' }}>Gifts</th>
                <th style={{ ...th, textAlign: 'right' }}>Hospitality</th>
                <th style={{ ...th, textAlign: 'right' }}>Media meetings</th>
                <th style={{ ...th, textAlign: 'right' }}>Total declared</th>
              </tr>
            </thead>
            <tbody>
              {activity.slice(0, 30).map((r, i) => (
                <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ ...td, opacity: 0.6 }}>{i + 1}</td>
                  <td style={td}>{r.name}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.gifts}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.hospitality}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.meetings}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {gifts.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={sectionH2}>Gifts</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
                <th style={th}>Special Adviser</th>
                <th style={th}>Area</th>
                <th style={th}>Date</th>
                <th style={th}>Gift</th>
                <th style={th}>From</th>
                <th style={{ ...th, textAlign: 'right' }}>Value (£)</th>
                <th style={th}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {gifts.map((g, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={td}>{g.spad_name}</td>
                  <td style={{ ...td, fontSize: '13px', opacity: 0.75 }}>{g.area}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '13px', opacity: 0.7 }}>{g.gift_date || 'n/a'}</td>
                  <td style={td}>{g.gift_descr || 'n/a'}</td>
                  <td style={td}>{g.donor || 'n/a'}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{g.value_gbp || 'n/a'}</td>
                  <td style={{ ...td, fontSize: '12px', opacity: 0.85 }}>{g.outcome || 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {hosps.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={sectionH2}>Hospitality</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
                <th style={th}>Special Adviser</th>
                <th style={th}>Area</th>
                <th style={th}>Date</th>
                <th style={th}>Hospitality</th>
                <th style={th}>Provider</th>
                <th style={th}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {hosps.map((h, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={td}>{h.spad_name}</td>
                  <td style={{ ...td, fontSize: '13px', opacity: 0.75 }}>{h.area}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '13px', opacity: 0.7 }}>{h.hosp_date || 'n/a'}</td>
                  <td style={td}>{h.hosp_descr || 'n/a'}</td>
                  <td style={td}>{h.provider || 'n/a'}</td>
                  <td style={{ ...td, fontSize: '12px', opacity: 0.85 }}>{h.purpose || 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {meets.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={sectionH2}>Meetings with senior media figures</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
                <th style={th}>Special Adviser</th>
                <th style={th}>Area</th>
                <th style={th}>Date</th>
                <th style={th}>Media organisation</th>
                <th style={th}>Individual</th>
                <th style={th}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {meets.map((m, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={td}>{m.spad_name}</td>
                  <td style={{ ...td, fontSize: '13px', opacity: 0.75 }}>{m.area}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '13px', opacity: 0.7 }}>{m.meeting_date || 'n/a'}</td>
                  <td style={td}>{m.media_org || 'n/a'}</td>
                  <td style={td}>{m.individual || 'n/a'}</td>
                  <td style={{ ...td, fontSize: '12px', opacity: 0.85 }}>{m.purpose || 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

<ScrollToTopButton />
    </DossierShell>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
      <div style={{ fontSize: '13px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: '"Special Elite", monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '12px',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"Special Elite", monospace' };
const th: React.CSSProperties = { padding: '8px 6px', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 'bold' };
const td: React.CSSProperties = { padding: '8px 6px', fontSize: '13px', verticalAlign: 'top' };
