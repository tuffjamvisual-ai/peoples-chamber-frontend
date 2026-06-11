import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ScrollToTopButton from '../components/ScrollToTopButton';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: "Top-Spending MPs 2024-25, IPSA Business Cost Rankings",
  description:
    "The ten UK MPs who claimed the highest IPSA business costs in 2024-25. Office, staffing, travel and accommodation broken down by category, year on year change shown.",
  alternates: { canonical: '/expenses' },
};

// Render on demand. See app/departments/page.tsx for rationale —
// Vercel's 3-worker build saturates Supabase when this, /departments,
// and /earnings all prerender concurrently.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const YEAR = '24_25';
const YEAR_LABEL = '2024 / 2025';

// Feature essay rendered below the Top 10 list. Stored as one
// blank-line-separated string and split into <p> elements so the
// renderer matches the bio/critique convention elsewhere on the
// site. Em-dashes intentionally absent (per site-wide rule).
const FEATURE_TITLE = 'The Invisible Cost of Keeping Parliament Running';
const FEATURE_BODY = `Most people know MPs cost money. What most people do not know is how much. Every Member of Parliament receives a staffing budget of around £177,000 a year. They can claim office expenses. Many claim accommodation costs. Travel between Westminster and their constituency is funded by the taxpayer, with no formal spending cap.

None of this is secret. That is the strange part. The information exists. It is published. The rules are available online. Receipts are recorded. Audits take place. Yet ask the average voter how much their MP spends each year and the answer is usually silence.

That tells us something important. Transparency is not simply about making information available. Transparency is about making information understandable.

The parliamentary expenses system was rebuilt after the 2009 expenses scandal shattered public trust. MPs were exposed claiming for everything from housing costs to furnishings and personal items. Careers ended. Reputations collapsed. The public reaction was furious because voters felt Parliament had been operating according to rules that ordinary people never knew existed.

The system that replaced it is undoubtedly stricter. The question is whether it is genuinely transparent.

Take staffing budgets. A typical MP employs several staff members to handle casework, correspondence, research and constituency issues. The work is real. Constituents expect help with benefits, housing, immigration cases, local services and government departments. Most MPs could not perform the role without staff. But how many people know how many staff their MP employs? How much those staff cost? How those costs compare with other MPs? Very few.

The same pattern appears elsewhere. Travel is funded. Accommodation is funded. Office costs are funded. Additional support can be provided under exceptional circumstances. Every category has rules. Every category has oversight. Yet the overall picture remains surprisingly difficult for ordinary voters to understand.

Parliament often points out that all this information is publicly available. Technically, that is true. So are thousands of pages of government procurement records, local authority accounts and departmental spending reports. Availability is not the same thing as accessibility. If information can only be understood by journalists, researchers, campaign groups and the small number of citizens willing to spend hours navigating official databases, then transparency exists largely in theory.

Most voters have a simple question. How much does my MP cost? The answer should be available in seconds. Instead, understanding the full picture often requires navigating multiple websites, downloading spreadsheets and interpreting categories that mean little to anyone outside Westminster. That is not openness. It is bureaucracy.

The deeper issue is trust. The public funds Parliament. Parliament operates on behalf of the public. Yet there remains a significant information gap between those paying the bills and those spending the money. Not because the information is hidden, but because it is buried.

This is not a story about corruption. It is a story about visibility. The expenses scandal of 2009 taught Parliament that secrecy destroys trust. The lesson that appears not to have been learned is that complexity can produce much the same result.

A transparent system is one that ordinary people can understand without specialist knowledge. Until voters can easily see what their MP spends, how those costs compare and why the money is necessary, Westminster will continue to mistake publication for transparency. They are not the same thing.`;

// Dossier ink-on-parchment palette
const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '£0';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

type ExpenseRow = {
  member_id: number;
  year: string;
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
};

export default async function ExpensesPage() {
  // Fetch a few extra rows so we can drop any non-current MPs and still hit 10.
  const { data: expenseRows } = await supabase
    .from('mp_expenses_summary')
    .select(
      'member_id, year, total_spend, staffing_spend, office_spend, accommodation_spend, travel_subsistence_spend, other_costs_spend, winding_up_spend'
    )
    .eq('year', YEAR)
    .order('total_spend', { ascending: false, nullsFirst: false })
    .limit(20);

  const ids = (expenseRows || []).map((r: ExpenseRow) => r.member_id);

  const { data: mpRows } = ids.length
    ? await supabase
        .from('mps')
        .select(
          'member_id, name, display_name, current_member'
        )
        .in('member_id', ids)
    : { data: [] as MpRow[] };

  const mpById = new Map<number, MpRow>(
    ((mpRows as MpRow[]) || []).map((m) => [m.member_id, m])
  );

  const top = ((expenseRows as ExpenseRow[]) || [])
    .map((row) => ({ row, mp: mpById.get(row.member_id) }))
    .filter((x): x is { row: ExpenseRow; mp: MpRow } => Boolean(x.mp && x.mp.current_member))
    .slice(0, 10);

  const grandTotal = top.reduce((s, x) => s + (Number(x.row.total_spend) || 0), 0);

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <p
          style={{
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: ACCENT,
          }}
        >
          The People&rsquo;s Chamber · Expenses
        </p>
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
          Top 10 spenders {YEAR_LABEL}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', marginBottom: '20px' }}>
          Ranked by total business costs claimed across staffing, office, accommodation, travel and other categories.{' '}
          <Link href="/expenses/refused" style={{ color: ACCENT, textDecoration: 'underline' }}>
            Refused &amp; repaid &rarr;
          </Link>
        </p>

        <div
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
      `}</style>
      <ol
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
            key={x.mp.member_id}
            rank={i + 1}
            total={x.row.total_spend}
            memberId={x.mp.member_id}
            name={x.mp.display_name || x.mp.name || ''}
          />
        ))}
      </ol>

      <p style={{ marginTop: '32px', fontSize: '13px', color: INK_SOFT, lineHeight: 1.7 }}>
        Totals reflect spend recorded against budgets and uncapped categories for the {YEAR_LABEL} financial year.
        Itemised line items are visible on each MP&rsquo;s profile under Expenses.
      </p>

      {/* Feature essay — same compact 2-column newspaper treatment
          as the Top 10 listing above. 12px Special Elite body, two
          balanced columns with a hairline column-rule, modest 1px
          dividers — reads as a dense classified-section feature
          rather than a wide-line magazine article. Drop cap on the
          opening letter for the broadsheet feature feel. */}
      <section style={{ marginTop: '40px', borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}`, padding: '24px 0' }}>
        <p
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: ACCENT,
            textAlign: 'center',
          }}
        >
          Feature · Analysis
        </p>
        <h2
          style={{
            fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
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
        <div
          style={{
            fontFamily: 'Special Elite, monospace',
            // 14px in the essay (vs. 12px in the Top 10 listing above)
            // — the user wanted the story body slightly larger than
            // the classified list so the long-form prose breathes.
            fontSize: '14px',
            lineHeight: 1.7,
            color: INK,
            columnCount: 2,
            columnGap: '28px',
            columnRule: `1px solid ${INK_HAIRLINE}`,
            columnFill: 'balance',
            textAlign: 'justify',
            hyphens: 'none',
          }}
        >
          {FEATURE_BODY
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, i) => (
              <p
                key={i}
                style={{
                  margin: '0 0 0.9em 0',
                  breakInside: 'avoid-column',
                  pageBreakInside: 'avoid',
                }}
              >
                {p}
              </p>
            ))}
        </div>
      </section>

      <ScrollToTopButton />
    </DossierShell>
  );
}

// Newspaper-classified row — rank, small-caps name, dot-leader fill,
// amount, then a discreet 'Full breakdown' ref. Mirrors the
// births/deaths/property listings column of a broadsheet. Simplified
// 2026-06-03 per user request from the heavier card with photo +
// party badge + breakdown grid. If you want the photo/breakdown back,
// see git history at commit 3423dcd or earlier.
function SimpleRow({
  rank,
  total,
  memberId,
  name,
}: {
  rank: number;
  total: number | null;
  memberId: number;
  name: string;
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
        alignItems: 'baseline',
        gap: '6px',
        padding: '7px 4px',
        color: INK,
        fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
      }}
    >
      {/* Card-link pattern: an absolutely positioned Link covers the
          whole row so a click anywhere in the rank/name/dot-leader/
          amount/breakdown band lands on the MP's expenses section.
          The visible content stays in normal flow underneath; the
          name carries aria-text via aria-label on the link.
          Previous flex-anchor approach failed because Next.js Link
          renders inline-area in column-flow layout. 2026-06-03. */}
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
      <span
        style={{
          fontSize: '13px',
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
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          fontVariant: 'small-caps',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
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
          fontSize: '12px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {fmtMoney(total)}
      </span>
      <span
        style={{
          fontFamily: 'Special Elite, monospace',
          fontSize: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: ACCENT,
          paddingBottom: '1px',
          marginLeft: '5px',
          whiteSpace: 'nowrap',
        }}
      >
        Breakdown →
      </span>
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
          fontSize: '12px',
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
