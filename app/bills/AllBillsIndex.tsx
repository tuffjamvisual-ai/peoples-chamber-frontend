// Server-rendered "Browse all bills" link block. Ships every
// sitemap-included bill (1,202 at last count) as a real <a href>
// inside three collapsed <details> groupings. Sits below the
// existing interactive BillsGrid on /bills.
//
// Why this exists: BillsGrid is 'use client' and routes via
// router.push() onClick handlers — there are zero crawlable
// <a href="/bills/{id}"> tags in the page's static HTML otherwise.
// That left all 1,202 bill detail pages discoverable only via the
// sitemap, which Google treats with lower confidence than pages
// reachable via internal links. This component closes that gap
// without touching the interactive UI.
//
// Added 2026-06-05 as SEO Phase 1 Task 6.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type BillRow = {
  id: number;
  title: string;
  current_stage: string | null;
  is_act: boolean | null;
  bill_withdrawn: boolean | null;
  is_defeated: boolean | null;
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.18)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';
const SERIF = 'Georgia, "Times New Roman", serif';

async function fetchAllSitemapBills(): Promise<BillRow[]> {
  // Same filter as app/sitemap.ts: bills with a Commons division, or
  // Royal Assent, or a known stage. Drops the ~2,700 placeholder /
  // never-progressed bills already filtered from the sitemap.
  const PAGE_SIZE = 1000;
  const out: BillRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('bill')
      .select('id, title, current_stage, is_act, bill_withdrawn, is_defeated')
      .or('commons_division_id.not.is.null,is_act.eq.true,current_stage.not.is.null')
      .order('title', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error('AllBillsIndex fetch error:', error);
      break;
    }
    if (!data || data.length === 0) break;
    out.push(...(data as BillRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

export default async function AllBillsIndex() {
  const rows = await fetchAllSitemapBills();
  if (rows.length === 0) return null;

  const acts: BillRow[] = [];
  const inflight: BillRow[] = [];
  const closed: BillRow[] = [];

  for (const r of rows) {
    if (r.is_act) acts.push(r);
    else if (r.bill_withdrawn || r.is_defeated) closed.push(r);
    else inflight.push(r);
  }

  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    padding: '10px 0',
    fontFamily: MONO,
    fontSize: '15px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: ACCENT,
    fontWeight: 600,
    borderTop: `1px solid ${INK_HAIRLINE}`,
  };
  const itemStyle: React.CSSProperties = {
    display: 'block',
    padding: '6px 0',
    color: INK,
    textDecoration: 'none',
    // Special Elite per the typewriter-for-body site rule. SERIF stays
    // imported so the constant is still referenced by the explainer
    // paragraph below — though that's also switched.
    fontFamily: MONO,
    fontSize: '15px',
    lineHeight: 1.5,
    borderBottom: `1px dotted rgba(20,16,13,0.1)`,
  };
  const stageNoteStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '15px',
    fontFamily: MONO,
    color: INK_SOFT,
    marginTop: '2px',
  };

  const renderGroup = (label: string, items: BillRow[], showStage: boolean) => (
    <details style={{ marginBottom: '12px' }}>
      <summary style={summaryStyle}>
        {label} ({items.length.toLocaleString()})
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
        {items.map((b) => (
          <li key={b.id}>
            <Link href={`/bills/${b.id}`} style={itemStyle}>
              {b.title}
              {showStage && b.current_stage && (
                <span style={stageNoteStyle}>{b.current_stage}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );

  return (
    <section
      aria-label="All bills, full index"
      style={{ marginTop: '48px', paddingTop: '24px', borderTop: `2px solid ${INK_HAIRLINE}` }}
    >
      <h2
        style={{
          fontFamily: MONO,
          fontSize: '15px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: ACCENT,
          marginBottom: '8px',
          fontWeight: 600,
        }}
      >
        Browse all {rows.length.toLocaleString()} bills
      </h2>
      <p
        style={{
          fontFamily: MONO,
          fontSize: '15px',
          lineHeight: 1.75,
          color: INK,
          maxWidth: '640px',
          marginBottom: '20px',
        }}
      >
        Every bill in this Parliament with a recorded vote, an active stage, or
        Royal Assent. Grouped by status; each line links to the full bill
        record.
      </p>
      {acts.length > 0 && renderGroup('Acts of Parliament', acts, false)}
      {inflight.length > 0 && renderGroup('Bills currently progressing', inflight, true)}
      {closed.length > 0 && renderGroup('Defeated or withdrawn', closed, true)}
    </section>
  );
}
