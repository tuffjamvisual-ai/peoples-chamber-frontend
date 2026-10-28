'use client';

// The quarterly returns on /transparency/special-advisers, one quarter at a time (owner, 28 Oct 2026: every quarter is
// kept from April to June 2026 on). The page's HTML holds every quarter; the latest is shown first, and the selector
// switches between them in the browser.
import { useMemo, useState } from 'react';
import Link from 'next/link';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

export type RosterRow = { name: string; area: string; quarter: string };
export type GiftRow = { spad_name: string; area: string; quarter: string; gift_date: string | null; gift_descr: string | null; donor: string | null; value_gbp: string | null; outcome: string | null };
export type HospRow = { spad_name: string; area: string; quarter: string; hosp_date: string | null; hosp_descr: string | null; provider: string | null; purpose: string | null };
export type MeetRow = { spad_name: string; area: string; quarter: string; meeting_date: string | null; media_org: string | null; individual: string | null; purpose: string | null };

export default function QuarterSections({ quarters, roster: allRoster, gifts: allGifts, hosps: allHosps, meets: allMeets, deptSlugs }: {
  quarters: string[]; roster: RosterRow[]; gifts: GiftRow[]; hosps: HospRow[]; meets: MeetRow[]; deptSlugs: Record<string, string>;
}) {
  const [quarter, setQuarter] = useState(quarters[0] ?? '');
  const { roster, gifts, hosps, meets } = useMemo(() => ({
    roster: allRoster.filter((r) => r.quarter === quarter), gifts: allGifts.filter((r) => r.quarter === quarter),
    hosps: allHosps.filter((r) => r.quarter === quarter), meets: allMeets.filter((r) => r.quarter === quarter),
  }), [quarter, allRoster, allGifts, allHosps, allMeets]);

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
  const allNames = new Set<string>([...gifts.map((g) => g.spad_name), ...hosps.map((h) => h.spad_name), ...meets.map((m) => m.spad_name)]);
  type ActivityRow = { name: string; gifts: number; hospitality: number; meetings: number; total: number };
  const activity: ActivityRow[] = Array.from(allNames).map((name) => {
    const g = giftCount.get(name) || 0;
    const h = hospCount.get(name) || 0;
    const m = meetCount.get(name) || 0;
    return { name, gifts: g, hospitality: h, meetings: m, total: g + h + m };
  });
  activity.sort((a, b) => b.total - a.total);

  return (
    <>
      <div style={{ margin: '0 0 20px' }}>
        <label htmlFor="spad-quarter" style={{ display: 'block', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', marginBottom: '4px' }}>Quarter</label>
        <select id="spad-quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)}
          style={{ maxWidth: '100%', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', padding: '7px 8px', border: `1px solid ${INK}`, background: '#f4e8d4', color: INK }}>
          {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        {quarters.length === 1 && <p style={{ fontSize: '15px', margin: '6px 0 0' }}>Only this quarter so far: each new quarter is added as it is published, and earlier ones stay.</p>}
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        <Tile label="Special Advisers" value={String(roster.length)} sub="on the roster this quarter" />
        <Tile label="Departments" value={String(areas.length)} sub="publishing this quarter" />
        <Tile label="Declared gifts" value={String(gifts.length)} sub="non-nil entries" />
        <Tile label="Declared hospitality" value={String(hosps.length)} sub="non-nil entries" />
        <Tile label="Media meetings" value={String(meets.length)} sub="with senior media figures" />
      </section>

      <section style={{ marginBottom: '36px' }}>
        <h2 style={sectionH2}>Roster · {roster.length} Special Advisers</h2>
        {areas.map(([area, list]) => (
          <details key={area} style={{ marginBottom: '12px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
            <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', fontWeight: 'bold', padding: '6px 0', color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {area} · {list.length}
            </summary>
            {deptSlugs[area] && (
              <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px' }}>
                <Link href={`/departments/${deptSlugs[area]}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Department page: ministers, budget and record →</Link>
              </p>
            )}
            <ul style={{ listStyle: 'none', padding: '8px 0', margin: 0, columns: '2 280px', columnGap: '24px', fontSize: '15px', fontFamily: 'var(--font-special-elite), monospace' }}>
              {list.sort((a, b) => a.name.localeCompare(b.name)).map((r) => (
                <li key={`${r.area}|${r.name}`} style={{ padding: '2px 0', breakInside: 'avoid' }}>{r.name}</li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {activity.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={sectionH2}>Most active Special Advisers in {quarter}</h2>
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
                  <td style={{ ...td }}>{i + 1}</td>
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
                  <td style={{ ...td, fontSize: '15px' }}>{g.area}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '15px' }}>{g.gift_date || 'n/a'}</td>
                  <td style={td}>{g.gift_descr || 'n/a'}</td>
                  <td style={td}>{g.donor || 'n/a'}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{g.value_gbp || 'n/a'}</td>
                  <td style={{ ...td, fontSize: '15px' }}>{g.outcome || 'n/a'}</td>
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
                  <td style={{ ...td, fontSize: '15px' }}>{h.area}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '15px' }}>{h.hosp_date || 'n/a'}</td>
                  <td style={td}>{h.hosp_descr || 'n/a'}</td>
                  <td style={td}>{h.provider || 'n/a'}</td>
                  <td style={{ ...td, fontSize: '15px' }}>{h.purpose || 'n/a'}</td>
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
                  <td style={{ ...td, fontSize: '15px' }}>{m.area}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '15px' }}>{m.meeting_date || 'n/a'}</td>
                  <td style={td}>{m.media_org || 'n/a'}</td>
                  <td style={td}>{m.individual || 'n/a'}</td>
                  <td style={{ ...td, fontSize: '15px' }}>{m.purpose || 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
      <div style={{ fontSize: '15px', marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: 'var(--font-special-elite), monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '12px',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: 'var(--font-special-elite), monospace' };
const th: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 'bold' };
const td: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', verticalAlign: 'top' };
