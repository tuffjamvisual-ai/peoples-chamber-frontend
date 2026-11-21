import type { Metadata } from 'next';
import { cache } from 'react';
import { wholeSentences } from '@/lib/meta-description';
import LastUpdated from '../components/LastUpdated';
import PageSources from '../components/PageSources';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';

import { expensesYearShort as yearShort, expensesYearLong as yearLong, expensesYearHref } from '@/lib/expenses-year';
import { displayMpName } from '@/lib/mp-name';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { phoneUpTo } from '@/lib/breakpoints';
import { ShowAll } from '../components/NoJsPager';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

// The page for one year (ENTRY 495, owner approved 21 Nov 2026): /expenses shows the latest year IPSA has published,
// /expenses/year/<yy_yy> any earlier one. Both are saved pages refreshed by the expenses table's tag (A16).
export async function expensesMetadata(year: string, canonical: string): Promise<Metadata> {
  const y = yearShort(year);
  // Description (owner, 7 Nov 2026, L4): the year, the ten MPs' combined total and their average, as the page shows them.
  const { top, grandTotal } = await topSpenders(year);
  const description = top.length
    ? (() => {
      const lead = `The ${top.length} MPs with the highest business costs in ${y}: ${fmtMoney(grandTotal)} between them, ${fmtMoney(grandTotal / top.length)} each on average.`;
      const long = wholeSentences([lead, 'Staffing, office, accommodation and travel, from the Independent Parliamentary Standards Authority (IPSA).']);
      return long !== lead ? long : wholeSentences([lead, 'Staffing, office, accommodation and travel, from IPSA.']);
    })()
    : PAGE_DESCRIPTIONS['/expenses'];
  return {
    // A plain title naming the data and its source (owner's brief, 3 Nov 2026).
    title: `MPs' expenses ${y}: IPSA business costs`,
    description,
    alternates: { canonical },
  };
}



// The explainer (Cowork ENTRY 495 (e), agreed 21 Nov 2026 22:23 with the 21:54 fixes) in place of the essay. Every figure
// is IPSA's: the 2025/26 budgets from the Scheme's Annex A and the reason column of 'Total spend data 2025 to 2026'; the
// rules quoted from the Scheme (2025-26) and IPSA's guide to MPs' business costs; the staff share is our sum of IPSA data.
const FEATURE_TITLE = "How MPs' business costs work";
const SCHEME = 'https://www.theipsa.org.uk/publications/the-scheme';
const GUIDE = 'https://www.theipsa.org.uk/a-guide-to-mps-business-costs';
const xa = { color: '#7a1612', textDecoration: 'underline' } as const;
const xh = { fontSize: '15px', fontWeight: 'bold', margin: '0 0 0.4em 0', breakAfter: 'avoid' } as const;
const xp = { margin: '0 0 0.9em 0' } as const;
const EXPLAINER = (
  <>
    <h3 style={xh}>What MPs&apos; business costs are</h3>
    <p style={xp}>
      MPs&apos; business costs pay for the work of an MP&apos;s office, not the MP&apos;s salary. The Independent Parliamentary Standards
      Authority (IPSA) sets the rules and the budgets, pays the claims and publishes them. Staff are about four fifths of business
      costs: 79.4 per cent in 2025/26, computed by opengovt from IPSA data.
    </p>
    <h3 style={xh}>The budgets for 2025/26</h3>
    <ul style={{ margin: '0 0 0.9em 0', paddingLeft: '1.1em' }}>
      <li style={xp}><strong>Staffing</strong>: £263,370 for an MP outside London; £281,980 for a London MP.</li>
      <li style={xp}>
        <strong>Office costs</strong>: £35,930 outside London; £39,560 in London. Newly elected MPs also get a £6,000 start up
        supplement, which <a href={SCHEME} style={xa}>IPSA&apos;s Scheme</a> says is &quot;available to new MPs for the duration of the
        financial year in which they were elected&quot;.
      </li>
      <li style={xp}>
        <strong>Accommodation</strong>, for MPs eligible to claim: for an MP from outside London renting in London, £31,840, rising to
        £39,110, £46,380 or £53,650 with one, two or three dependants; £21,680 for an MP renting in their constituency outside the London
        area, with the same £7,270 per dependant (up to three); £6,870 for an MP who owns their home and claims only the associated costs (such as utilities). Under{' '}
        <a href={SCHEME} style={xa}>IPSA&apos;s Scheme</a>, accommodation costs &quot;are not payable to MPs who: a. are London Area MPs;
        or b. by virtue of any particular office held, occupy &apos;grace and favour&apos; accommodation in London.&quot;
      </li>
      <li style={xp}><strong>Winding up</strong>: a budget for MPs who leave Parliament, to close their office.</li>
    </ul>
    <h3 style={xh}>What is not capped</h3>
    <p style={xp}>
      Travel and subsistence, and some other costs, have no fixed budget. An MP whose constituency is far from Westminster, in
      Scotland or Northern Ireland for example, travels more and so costs more.
    </p>
    <h3 style={xh}>How often IPSA publishes</h3>
    <p style={xp}>
      IPSA publishes MPs&apos; claims every two months, usually four to five months after they are made, and the year&apos;s totals
      once each year is complete. <a href={GUIDE} style={xa}>IPSA&apos;s guide</a> says: &quot;For security reasons, this doesn&apos;t
      include costs that relate to security&quot;.
    </p>
  </>
);

// Dossier ink-on-parchment palette
const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '£0';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

type ExpenseRow = {
  member_id: number;
  year: string;
  mp_name: string | null;
  total_spend: number | null;
  staffing_spend: number | null;
  office_spend: number | null;
  accommodation_spend: number | null;
  travel_subsistence_spend: number | null;
  other_costs_spend: number | null;
  winding_up_spend: number | null;
};

type MpRow = {
  member_id: number;
  name: string | null;
  display_name: string | null;
  current_member: boolean | null;
  end_date: string | null;
};
export type TopRow = { row: ExpenseRow; mp: MpRow | undefined; name: string; note: string | null };

// The year's ten highest business costs, and their total (owner, 7 Nov 2026, L4: one read, shared by the page and its
// description through React's request cache). Every MP in IPSA's data for the year is ranked, including those who have
// since left Parliament (Cowork 22:52, ENTRY 495: the ranking follows IPSA's data; it used to keep current MPs only, which
// dropped Josh Simons and Stephen Gethins, who served all of 2025/26 and left in May 2026). The name is our MP record's
// where we hold one, else IPSA's (mp_name); a left MP is marked so on the row.
const topSpenders = cache(async (YEAR: string) => {
  const { data: expenseRows, error: expenseRowsErr } = await cachedQuery(['q:app/expenses/top-v2', JSON.stringify([YEAR])], tableTags('mp_expenses_summary'), () => supabase
    .from('mp_expenses_summary')
    .select(
      'member_id, year, mp_name, total_spend, staffing_spend, office_spend, accommodation_spend, travel_subsistence_spend, other_costs_spend, winding_up_spend'
    )
    .eq('year', YEAR)
    .order('total_spend', { ascending: false, nullsFirst: false })
    .limit(10));
  if (expenseRowsErr && expenseRowsErr.code !== 'PGRST116') throw new Error(`/expenses mp_expenses_summary: ${expenseRowsErr.message}`);

  const ids = (expenseRows || []).map((r: ExpenseRow) => r.member_id);

  const { data: mpRows } = ids.length
    ? await cachedQuery(['q:app/expenses/mps-v2', JSON.stringify([ids])], tableTags('mps'), () => supabase
        .from('mps')
        .select(
          'member_id, name, display_name, current_member, end_date'
        )
        .in('member_id', ids))
    : { data: [] as MpRow[] };

  const mpById = new Map<number, MpRow>(
    ((mpRows as MpRow[]) || []).map((m) => [m.member_id, m])
  );

  const top: TopRow[] = ((expenseRows as ExpenseRow[]) || []).map((row) => {
    const mp = mpById.get(row.member_id);
    const name = displayMpName(mp?.display_name || mp?.name || row.mp_name || '');
    const left = mp && !mp.current_member
      ? (mp.end_date ? `left Parliament ${new Date(`${mp.end_date}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}` : 'has left Parliament')
      : !mp ? 'former MP' : null;
    return { row, mp, name, note: left };
  });

  const grandTotal = top.reduce((s, x) => s + (Number(x.row.total_spend) || 0), 0);
  return { top, grandTotal };
});

// Staffing's share of every MP's business costs in the year (ENTRY 495 (c)): our own sum of IPSA's year totals.
const staffingShare = cache(async (YEAR: string): Promise<number | null> => {
  const { data, error } = await cachedQuery(['q:app/expenses:staffing-share', YEAR], tableTags('mp_expenses_summary'), () => supabase
    .from('mp_expenses_summary').select('staffing_spend, total_spend').eq('year', YEAR).limit(2000));
  if (error) throw new Error(`/expenses staffing share: ${error.message}`);
  const rows = (data || []) as { staffing_spend: number | null; total_spend: number | null }[];
  const total = rows.reduce((s, r) => s + (Number(r.total_spend) || 0), 0);
  return total > 0 ? rows.reduce((s, r) => s + (Number(r.staffing_spend) || 0), 0) / total : null;
});
// When this year's totals were last written (the newest updated_at of its rows; one row read).
const loadedAt = cache(async (YEAR: string): Promise<string | null> => {
  const { data, error } = await cachedQuery(['q:app/expenses:loaded-at', YEAR], tableTags('mp_expenses_summary'), () => supabase
    .from('mp_expenses_summary').select('updated_at').eq('year', YEAR).order('updated_at', { ascending: false }).limit(1));
  if (error) throw new Error(`/expenses loaded at: ${error.message}`);
  return ((data || [])[0] as { updated_at: string | null } | undefined)?.updated_at ?? null;
});
// IPSA's own figure for 2024/25 ('Supporting democracy, understanding our 2024-25 data', 20 Nov 2025); later years are our sum.
const IPSA_STAFF_SHARE: Record<string, number> = { '24_25': 79 };

export async function ExpensesView({ year: YEAR, years }: { year: string; years: string[] }) {
  const YEAR_LABEL = yearLong(YEAR);
  const { top, grandTotal } = await topSpenders(YEAR);
  // IPSA's own figure where it has one; otherwise our sum (one year's rows, at most about 700, under any row cap).
  const share = IPSA_STAFF_SHARE[YEAR] != null ? null : await staffingShare(YEAR);

  return (
    <OpenGovShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        {/* T1-DECLUT item 2 (owner, 12 Nov 2026): no eyebrow line repeating the section under the folder stamp. */}
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
          }}
        >
          MPs&apos; expenses {YEAR_LABEL}: the ten highest business costs
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', marginBottom: '20px' }}>
          Ranked by total business costs claimed across staffing, office, accommodation, travel and other categories. Every MP in IPSA&apos;s figures for the year is ranked, including MPs who have since left Parliament.{' '}
          <Link href="/expenses/refused" style={{ color: ACCENT, textDecoration: 'underline' }}>
            Refused &amp; repaid &rarr;
          </Link>
        </p>

        {/* ENTRY 495: every published year, the shown one marked; links are saved pages, no query string (A16). */}
        {years.length > 1 && (
          <p style={{ fontSize: '16px', margin: '0 0 12px' }}>
            {years.map((y, i) => (
              <span key={y}>
                {i > 0 && ' · '}
                {y === YEAR ? <strong>{yearShort(y)}</strong> : <Link href={expensesYearHref(y, years[0])} style={{ color: ACCENT, textDecoration: 'underline' }}>{yearShort(y)}</Link>}
              </span>
            ))}
          </p>
        )}
        {/* ENTRY 495 (c): what drives the totals. */}
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '720px', margin: '0 0 12px' }}>
          {IPSA_STAFF_SHARE[YEAR] != null
            ? `Staff are about four fifths of MPs' business costs: ${IPSA_STAFF_SHARE[YEAR]} per cent in ${yearShort(YEAR)}, according to IPSA.`
            : share != null ? `Staff are about four fifths of MPs' business costs: ${(share * 100).toFixed(1)} per cent in ${yearShort(YEAR)}, by our sum of IPSA's figures.` : ''}{' '}
          Travel distance (MPs from Scotland and Northern Ireland travel furthest) and whether an MP can claim for accommodation (MPs for London Area seats cannot) explain much of the difference between MPs.
        </p>
        {/* Phones (UX3b, 10 Nov 2026): the three figures follow the ten MPs (the copy after the list), so the list starts on
            the first screen (A6). From 640px up, here as before. */}
        <style>{`.ex-stats-p { display: none; } @media ${phoneUpTo(767.98)} { .ex-stats-w { display: none !important; } .ex-stats-p { display: grid; } }`}</style>
        <div
          className="ex-stats-w"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          <Stat label="Top 10 combined" value={fmtMoney(grandTotal)} />
          <Stat label="Average" value={top.length ? fmtMoney(grandTotal / top.length) : '£0'} />
          <Stat label="Year" value={YEAR_LABEL} />
        </div>
      </header>

      {/* Newspaper-classified listing in two columns. Ruled top +
          bottom borders, vertical column rule between the two halves.
          break-inside:avoid keeps each row whole when the browser
          balances the columns; column-fill:balance gives 5+5 not 9+1.
          Whole-row hover lit by .pca-row:hover so the user sees the
          entire band is clickable, not just the name. */}
      <style>{`
        .pca-row { transition: background-color 140ms ease; }
        .pca-row:hover { background: rgba(122,22,18,0.08); }
        .pca-row:hover [data-pca-leader] { border-bottom-color: rgba(122,22,18,0.55); }
        /* Mobile: collapse both two-column blocks (leaderboard + article body)
           to a single column so columns don't render microscopically.
           !important overrides the inline columnCount:2. */
        @media ${phoneUpTo(767)} {
          /* column-count: auto, not 1 (MOB-LISTS follow up, Cowork ENTRY 281, 18 Nov 2026): a one-column multi-column box
             kept 25px of empty space under the folded leaderboard (3 of 10 rows shown); a plain block has none. */
          .pca-cols { column-count: auto !important; column-rule: none !important; }
        }
      `}</style>
      {/* UX5 (T1-6, 11 Nov 2026): on phones the first five, then "Show all" (a native fold); from 640px up, as before. */}
      <ShowAll id="ex-top" count={top.length} rows="> li">
      <ol
        data-main-action
        className="pca-cols"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          borderTop: `2px solid ${INK}`,
          borderBottom: `2px solid ${INK}`,
          columnCount: 2,
          columnGap: '32px',
          columnRule: `1px solid ${INK_HAIRLINE}`,
          columnFill: 'balance',
        }}
      >
        {top.map((x, i) => (
          <SimpleRow
            key={x.row.member_id}
            rank={i + 1}
            total={x.row.total_spend}
            memberId={x.mp ? x.row.member_id : null}
            name={x.name}
            note={x.note}
            split={splitOf(x.row)}
          />
        ))}
      </ol>
      </ShowAll>
      <div className="ex-stats-p" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', margin: '16px 0 0' }}>
          <Stat label="Top 10 combined" value={fmtMoney(grandTotal)} />
          <Stat label="Average" value={top.length ? fmtMoney(grandTotal / top.length) : '£0'} />
          <Stat label="Year" value={YEAR_LABEL} />
      </div>

      <p style={{ marginTop: '32px', fontSize: '15px', color: INK_SOFT, lineHeight: 1.7 }}>
        Totals reflect spend recorded against budgets and uncapped categories for the {YEAR_LABEL} financial year.
        Itemised line items are visible on each MP&apos;s profile under Expenses.
      </p>

      {/* Feature essay — same compact 2-column newspaper treatment
          as the Top 10 listing above. 12px Special Elite body, two
          balanced columns with a hairline column-rule, modest 1px
          dividers — reads as a dense classified-section feature
          rather than a wide-line magazine article. Drop cap on the
          opening letter for the broadsheet feature feel. */}
      {/* The feature is article text: never folded, and not counted in the phone length (QA2d; T1-6, 11 Nov 2026). */}
      <section data-article-body="" style={{ marginTop: '40px', borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}`, padding: '24px 0' }}>
        <p
          style={{
            fontSize: '15px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: ACCENT,
            textAlign: 'center',
          }}
        >
          Explainer
        </p>
        {/* The essay (owner, 15 Nov 2026, ENTRY 135 H3): on phones and tablets a closed fold with its title as the label
            (globals.css .rf-d, .rf-b, .rf-h, up to 1,023px); from 1,024px up the title and the essay as before. */}
        <div className="rf-h">
        <h2
          style={{
            fontFamily: 'var(--font-special-elite), monospace',
            fontSize: 'clamp(20px, 2.4vw, 28px)',
            fontWeight: 'bold',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            marginBottom: '20px',
            textAlign: 'center',
            color: INK,
          }}
        >
          {FEATURE_TITLE}
        </h2>
        </div>
        <details className="rf-d"><summary>{FEATURE_TITLE}</summary></details>
        <div className="rf-b">
        <div
          className="pca-cols"
          style={{
            fontFamily: 'var(--font-special-elite), monospace',
            // 14px in the essay (vs. 12px in the Top 10 listing above)
            // — the user wanted the story body slightly larger than
            // the classified list so the long-form prose breathes.
            fontSize: '15px',
            lineHeight: 1.7,
            color: INK,
            columnCount: 2,
            columnGap: '28px',
            columnRule: `1px solid ${INK_HAIRLINE}`,
            columnFill: 'balance',
            hyphens: 'none',
          }}
        >
          {EXPLAINER}
        </div>
        </div>
      </section>

      {/* Cowork ENTRY 410 (owner, 20 Nov 2026): the source the date line named, in a Sources fold. */}
      <PageSources sources={[{ label: 'Independent Parliamentary Standards Authority (IPSA), MP costs', href: 'https://www.theipsa.org.uk/mp-costs/' }, { label: 'IPSA, The Scheme of MPs\' Staffing and Business Costs 2025-26 (budgets, accommodation rule, start up supplement)', href: SCHEME }, { label: 'IPSA, A guide to MPs\' business costs (publication timing, security costs)', href: GUIDE }, { label: 'IPSA, annual publications: total spend data by year (the staffing share for 2025/26 is our sum of these figures)', href: 'https://www.theipsa.org.uk/mp-staffing-business-costs/annual-publications' }]} />
      {/* The date this year's totals were loaded (Cowork 22:52), not the itemised claims' date the source key reads by default. */}
      <LastUpdated sourceKey="mp_expenses" at={await loadedAt(YEAR)} />
    </OpenGovShell>
  );
}

// Newspaper-classified row — rank, small-caps name, dot-leader fill,
// amount, then a discreet 'Full breakdown' ref. Mirrors the
// births/deaths/property listings column of a broadsheet. Simplified
// 2026-06-03 per user request from the heavier card with photo +
// party badge + breakdown grid. If you want the photo/breakdown back,
// see git history at commit 3423dcd or earlier.
// ENTRY 495 (d): the five parts of the total, in pounds, from the same row; winding up counts with other costs, so the
// parts add up to the total shown.
function splitOf(r: ExpenseRow): string {
  const n = (v: number | null) => Number(v) || 0;
  return [
    `staffing ${fmtMoney(n(r.staffing_spend))}`,
    `travel ${fmtMoney(n(r.travel_subsistence_spend))}`,
    `accommodation ${fmtMoney(n(r.accommodation_spend))}`,
    `office ${fmtMoney(n(r.office_spend))}`,
    `other ${fmtMoney(n(r.other_costs_spend) + n(r.winding_up_spend))}`,
  ].join(' · ');
}

function SimpleRow({
  rank,
  total,
  memberId,
  name,
  note,
  split,
}: {
  rank: number;
  total: number | null;
  memberId: number | null;
  note: string | null;
  name: string;
  split: string;
}) {
  return (
    <li
      className="pca-row"
      style={{
        listStyle: 'none',
        borderBottom: `1px solid ${INK_HAIRLINE}`,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '6px',
        padding: '7px 4px',
        color: INK,
        fontFamily: 'var(--font-special-elite), monospace',
      }}
    >
      {/* Card-link pattern: an absolutely positioned Link covers the
          whole row so a click anywhere in the rank/name/dot-leader/
          amount/breakdown band lands on the MP's expenses section.
          The visible content stays in normal flow underneath; the
          name carries aria-text via aria-label on the link.
          Previous flex-anchor approach failed because Next.js Link
          renders inline-area in column-flow layout. 2026-06-03. */}
      {/* Only MPs we hold a record for link to their page (Cowork 22:52: former MPs without one are named from IPSA's data). */}
      {memberId != null && (
      <Link
        href={`/mps/${memberId}#expenses`}
        aria-label={`${name} expenses breakdown`}
        className="no-hover-scale"
        style={{
          position: 'absolute',
          // Explicit corners — `inset: 0` shorthand was being ignored
          // by something in the column-flow layout, leaving the anchor
          // collapsed to 0×0 so only its inline name-text was hittable.
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          display: 'block',
          cursor: 'pointer',
          zIndex: 2,
          textDecoration: 'none',
          // Empty content — aria-label carries semantics.
        }}
      >
        <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
          {name} expenses breakdown
        </span>
      </Link>
      )}
      <span
        style={{
          fontSize: '15px',
          fontVariantNumeric: 'tabular-nums',
          color: INK_SOFT,
          width: '18px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {rank}.
      </span>
      <span
        style={{
          fontSize: '15px',
          fontWeight: 600,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          fontVariant: 'small-caps',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
        {note && <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}> ({note})</span>}
      </span>
      {/* Dot-leader fill — the broadsheet classified hallmark. */}
      <span
        aria-hidden
        data-pca-leader
        style={{
          flex: '1 1 auto',
          alignSelf: 'flex-end',
          height: '1px',
          borderBottom: `1px dotted ${INK_SOFT}`,
          transform: 'translateY(-4px)',
          minWidth: '10px',
        }}
      />
      <span
        style={{
          fontSize: '15px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {fmtMoney(total)}
      </span>
      {/* No "Breakdown →" label (T1-5x S5): the row is one link, its name. */}
      {/* ENTRY 495 (d): the five parts on their own line under the name and total. */}
      <span style={{ flexBasis: '100%', fontSize: '15px', lineHeight: 1.5, color: INK_SOFT, paddingLeft: '24px' }}>{split}</span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${INK_HAIRLINE}`,
        padding: '14px 16px',
      }}
    >
      <p
        style={{
          fontSize: '15px',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: INK_SOFT,
          margin: '0 0 6px',
          fontWeight: 'bold',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '-0.01em',
          color: INK,
          fontVariantNumeric: 'tabular-nums',
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}
