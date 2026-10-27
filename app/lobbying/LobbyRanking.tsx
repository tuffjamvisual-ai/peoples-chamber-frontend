'use client';

// Ranking of organisations by ministers' meetings, with a type tab and a period switch.
// All data arrives from the server (the top 30 per tab and period), so switching is instant.

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ORG_TYPE_LABEL, type OrgType } from '@/lib/lobbying-types';

export type RankedOrg = {
  slug: string;
  name: string;
  orgType: OrgType;
  meetings: number;
  ministers: number;
  lobbyingFirms: number;
};

export type RankingTab = { key: string; label: string; last12: RankedOrg[]; sinceStart: RankedOrg[] };

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';

export default function LobbyRanking({ tabs, sinceLabel }: { tabs: RankingTab[]; sinceLabel: string }) {
  const [tabKey, setTabKey] = useState(tabs[0]?.key || 'all');
  const [period, setPeriod] = useState<'12m' | 'all'>('12m');
  const tab = tabs.find((t) => t.key === tabKey) || tabs[0];
  if (!tab) return null;
  const rows = period === '12m' ? tab.last12 : tab.sinceStart;
  const showType = tab.key === 'all';

  const btn = (active: boolean): CSSProperties => ({
    fontFamily: FONT, fontSize: '14px', padding: '6px 10px', margin: '0 6px 6px 0', cursor: 'pointer',
    border: `1px solid ${active ? INK : INK_HAIRLINE}`, background: active ? INK : 'transparent', color: active ? '#f4ecd8' : INK,
  });

  return (
    <div>
      <style>{`
        .lb-table { width: 100%; border-collapse: collapse; font-family: ${FONT}; color: ${INK}; font-size: 16px; }
        .lb-table th { text-align: left; font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: bold; padding: 8px 6px; border-bottom: 1.5px solid ${INK}; }
        .lb-table td { padding: 9px 6px; border-bottom: 1px solid ${INK_HAIRLINE}; vertical-align: top; }
        .lb-table .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .lb-table a { color: ${INK}; text-decoration: none; overflow-wrap: anywhere; }
        .lb-table a:hover { color: ${ACCENT}; text-decoration: underline; }
        .lb-sub { display: block; font-size: 14px; margin-top: 2px; }
        @media (max-width: 640px) {
          .lb-table { font-size: 15px; }
          .lb-wide { display: none; }
        }
      `}</style>

      <div role="tablist" aria-label="Type of organisation" style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '6px' }}>
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === tab.key} onClick={() => setTabKey(t.key)} style={btn(t.key === tab.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Period" style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button type="button" aria-pressed={period === '12m'} onClick={() => setPeriod('12m')} style={btn(period === '12m')}>Last 12 months</button>
        <button type="button" aria-pressed={period === 'all'} onClick={() => setPeriod('all')} style={btn(period === 'all')}>{sinceLabel}</button>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '15px', color: INK }}>No meetings recorded for this group in this period.</p>
      ) : (
        <table className="lb-table">
          <thead>
            <tr>
              <th style={{ width: '2.5em' }}>#</th>
              <th>Organisation</th>
              <th className="num">Meetings</th>
              <th className="num lb-wide">Ministers</th>
              <th className="num lb-wide">Lobbying firms</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.slug}>
                <td className="num" style={{ textAlign: 'left' }}>{i + 1}</td>
                <td>
                  <Link href={`/lobbying/${r.slug}`} className="no-hover-scale">{r.name}</Link>
                  {showType && <span className="lb-sub">{ORG_TYPE_LABEL[r.orgType]}</span>}
                </td>
                <td className="num" style={{ fontWeight: 700 }}>{r.meetings}</td>
                <td className="num lb-wide">{r.ministers}</td>
                <td className="num lb-wide">{r.lobbyingFirms > 0 ? r.lobbyingFirms : 'n/a'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
