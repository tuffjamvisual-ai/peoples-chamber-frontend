// Server-rendered "Browse all MPs" link block. Ships all 650 current
// MPs as real <a href="/mps/[id]"> tags inside collapsed <details>
// groupings, one per party. Sits below the interactive MagazineMPsClient
// on /mps.
//
// Why this exists: MagazineMPsClient is 'use client' and the listing
// inside it is gated behind Suspense + a hover-to-expand interaction.
// Static HTML from the deployed build had zero crawlable
// <a href="/mps/[id]"> tags. That left all 650 MP profile pages
// discoverable only via the sitemap, which Google treats with lower
// confidence than pages reachable via internal links.
//
// Mirrors app/bills/AllBillsIndex.tsx which closed the same gap for
// bills (1,202 → 1,202 crawlable links in static HTML, confirmed
// working). This file closes the equivalent gap for MPs.
//
// Pure server component. One Supabase fetch. Renders nothing if the
// fetch returns no rows.
//
// Added 2026-06-07 as Phase 1 SEO follow-up (Check 5 FAIL fix).

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type MpRow = {
  member_id: number;
  display_name: string | null;
  name: string | null;
  party: string | null;
  constituency: string | null;
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.18)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';

async function fetchAllCurrentMps(): Promise<MpRow[]> {
  const PAGE_SIZE = 1000;
  const out: MpRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('mps')
      .select('member_id, display_name, name, party, constituency')
      .eq('current_member', true)
      .order('display_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error('AllMpsIndex fetch error:', error);
      break;
    }
    if (!data || data.length === 0) break;
    out.push(...(data as MpRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

export default async function AllMpsIndex() {
  const rows = await fetchAllCurrentMps();
  if (rows.length === 0) return null;

  // Group by party so the rendered detail blocks read as a clean
  // index. Independents and (rare) NULL party rows roll together
  // at the bottom.
  const byParty = new Map<string, MpRow[]>();
  for (const r of rows) {
    const key = (r.party || 'Independent').trim() || 'Independent';
    if (!byParty.has(key)) byParty.set(key, []);
    byParty.get(key)!.push(r);
  }
  const sortedParties = Array.from(byParty.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );

  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    fontFamily: MONO,
    fontSize: '14px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: ACCENT,
    fontWeight: 700,
    padding: '8px 0',
  };
  const itemStyle: React.CSSProperties = {
    display: 'block',
    padding: '4px 0',
    color: INK,
    textDecoration: 'none',
    fontFamily: MONO,
    fontSize: '13px',
    lineHeight: 1.55,
    borderBottom: `1px dotted rgba(20,16,13,0.1)`,
  };
  const subStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontFamily: MONO,
    color: INK_SOFT,
    marginTop: '2px',
  };

  return (
    <section
      aria-label="All current UK MPs, full index"
      style={{ marginTop: '48px', paddingTop: '24px', borderTop: `2px solid ${INK_HAIRLINE}` }}
    >
      <h2
        style={{
          fontFamily: MONO,
          fontSize: '14px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: ACCENT,
          marginBottom: '8px',
          fontWeight: 600,
        }}
      >
        Browse all {rows.length.toLocaleString()} MPs
      </h2>
      <p
        style={{
          fontFamily: MONO,
          fontSize: '13px',
          lineHeight: 1.75,
          color: INK,
          maxWidth: '640px',
          marginBottom: '20px',
        }}
      >
        Every current Member of Parliament with a full profile on the site, grouped by party. Each line links to the full MP record: voting history, declared interests, expenses, biography.
      </p>
      {sortedParties.map(([party, members]) => (
        <details key={party} style={{ marginBottom: '12px' }}>
          <summary style={summaryStyle}>
            {party} ({members.length.toLocaleString()})
          </summary>
          <ul
            style={{
              listStyle: 'none',
              padding: '8px 0 18px',
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0 24px',
            }}
          >
            {members.map((m) => (
              <li key={m.member_id}>
                <Link href={`/mps/${m.member_id}`} style={itemStyle}>
                  {m.display_name || m.name || `MP ${m.member_id}`}
                  {m.constituency && <span style={subStyle}>{m.constituency}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
