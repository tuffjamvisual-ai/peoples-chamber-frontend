import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ScrollToTopButton from '../components/ScrollToTopButton';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: 'Top Spenders',
  description:
    'The 10 MPs with the highest business costs in 2024–25.',
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
const FEATURE_BODY = `Every year, British taxpayers provide each MP with roughly £177,000 to pay for staff. Another £25,000 covers office costs. London-based MPs get more. Those with homes in two places get accommodation budgets. And travel between Parliament and constituency comes with no spending cap.

It sounds specific and controlled. In reality, the system offers far less visibility than most people assume.

The rules are clear. MPs can only spend money on parliamentary purposes, not party campaigns or ministerial work. They must show receipts. They cannot pocket the funds. But ask how much the average MP actually spends, which budgets get exceeded regularly, or whether these amounts are reasonable, and the answers become fuzzy.

The staffing budget illustrates the problem. £177,000 sounds substantial until you consider that each MP represents between 56,000 and 72,000 people. A typical MP employs around four staff members. These people handle constituent complaints, research parliamentary questions, prepare speeches, manage surgeries. The work is genuine. Whether the budget is adequate or excessive remains unclear.

Parliament maintains that all spending is published online. Technically true. But published data that ordinary voters cannot easily find or understand is not the same as transparency. The information exists. Accessing it requires navigating government websites and parsing expense claims. Most people never bother.

This creates a peculiar situation. MPs are subject to stricter oversight than many private sector roles. Yet the public knows less about what they spend than what happens in many businesses. The contrast between claimed transparency and actual obscurity is striking.

The real problem runs deeper. The current system exists because its predecessor failed catastrophically. In 2009, the expenses scandal revealed MPs abusing allowances for housing costs, furnishings, personal items. The public anger was justified. The system was reformed. Yet that history receives little mention in current discussions about how MPs spend money. The scandal is treated as ancient history rather than as context for understanding why skepticism persists.

Several elements of the current system invite questions that nobody adequately answers. Travel receives no budget cap. MPs can claim unlimited journeys between Westminster and constituency. The stated reason is that unlimited travel prevents restriction. To voters paying their own commute costs, uncapped parliamentary travel while other spending is limited may seem difficult to defend.

The accommodation budget creates similar tensions. MPs with homes in both London and their constituency can claim housing costs. The amounts vary based on location. London MPs receive higher allocations due to property costs. But the system allows for ambiguity. What constitutes a necessary accommodation expense? How is that determined?

The staffing budget raises different questions. How are staff hired? What qualifications matter? How much variation exists between MPs? Some employ family members. Others bring in experienced researchers. The quality and nature of parliamentary support likely varies significantly, yet public information about this remains limited.

Perhaps most revealing is the Contingency Panel. MPs who exceed their budgets can apply for additional funding if they claim exceptional circumstances. The panel can approve extra money. But how often is this used? What counts as exceptional? When do MPs routinely exceed budgets? The answers remain opaque.

The broader picture suggests a system designed to prevent the worst abuses while permitting continued opacity. Rules exist. Money is tracked. Spending is technically published. Yet the combination of limited accessibility, outdated information, and absence of meaningful comparisons means the public knows far less about MP spending than transparency claims suggest.

This is not necessarily corruption. It is something more mundane but equally problematic. A system that functions adequately for insiders while remaining effectively invisible to the people funding it. MPs are held accountable by rules most voters never read and cannot easily verify. That is not transparency. It is the appearance of transparency masking a genuine information gap between government and governed.`;

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
  constituency: string | null;
  party: string | null;
  party_colour: string | null;
  photo_url: string | null;
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
          'member_id, name, display_name, constituency, party, party_colour, photo_url, current_member'
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
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <p
          style={{
            fontSize: '11px',
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
          Ranked by total business costs claimed across staffing, office, accommodation, travel and other categories.
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

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {top.map((x, i) => (
          <Row key={x.mp.member_id} rank={i + 1} row={x.row} mp={x.mp} tilt={tiltFor(i)} />
        ))}
      </ol>

      <p style={{ marginTop: '32px', fontSize: '13px', color: INK_SOFT, lineHeight: 1.7 }}>
        Totals reflect spend recorded against budgets and uncapped categories for the {YEAR_LABEL} financial year.
        Itemised line items are visible on each MP&rsquo;s profile under Expenses.
      </p>

      {/* Feature essay — added 2026-06-03. Sits below the Top 10
          ranking and provides the broader context: where the £177k
          staff budget comes from, why travel is uncapped, what the
          2009 expenses scandal still implies. Body in Special Elite
          per the site-wide typewriter-for-body-prose rule. */}
      <section style={{ marginTop: '56px', borderTop: `2px solid ${INK_HAIRLINE}`, paddingTop: '40px' }}>
        <p
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: ACCENT,
          }}
        >
          Feature · Analysis
        </p>
        <h2
          style={{
            fontSize: 'clamp(24px, 3.4vw, 38px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginBottom: '28px',
            transform: 'rotate(-0.2deg)',
            color: INK,
          }}
        >
          {FEATURE_TITLE}
        </h2>
        <div
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: 'clamp(13px, 1.35vw, 15px)',
            lineHeight: 1.75,
            color: INK,
            maxWidth: '74ch',
          }}
        >
          {FEATURE_BODY
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, i) => (
              <p key={i} style={{ margin: '0 0 1.1em 0' }}>
                {p}
              </p>
            ))}
        </div>
      </section>

      <ScrollToTopButton />
    </DossierShell>
  );
}

function tiltFor(i: number) {
  const cycle = [-0.3, 0.2, -0.15, 0.35, -0.25];
  return cycle[i % cycle.length];
}

function Row({
  rank,
  row,
  mp,
  tilt,
}: {
  rank: number;
  row: ExpenseRow;
  mp: MpRow;
  tilt: number;
}) {
  const partyColour = mp.party_colour ? '#' + mp.party_colour.replace('#', '') : '#7697a2';
  const name = mp.display_name || mp.name || '';
  return (
    <li
      style={{
        color: INK,
        border: `1px solid ${INK_HAIRLINE}`,
        borderLeft: `4px solid ${partyColour}`,
        padding: '20px 22px',
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto 1fr auto',
          gap: '16px',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '34px',
            fontWeight: 'bold',
            fontVariantNumeric: 'tabular-nums',
            width: '40px',
            textAlign: 'center',
            color: INK_SOFT,
            lineHeight: 1,
          }}
        >
          {rank}
        </div>

        <div style={{ flexShrink: 0 }}>
          {mp.photo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mp.photo_url}
              alt={name}
              width={72}
              height={72}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `3px solid ${partyColour}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                color: INK,
                border: `3px solid ${partyColour}`,
              }}
            >
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <Link
            href={`/mps/${mp.member_id}`}
            style={{
              color: INK,
              fontSize: '20px',
              fontWeight: 'bold',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </Link>
          {mp.constituency && (
            <p
              style={{
                fontSize: '13px',
                color: INK_SOFT,
                margin: '2px 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {mp.constituency}
            </p>
          )}
          {mp.party && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#ffffff',
                background: partyColour,
              }}
            >
              {mp.party}
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p
            style={{
              fontSize: '26px',
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: INK,
              margin: 0,
            }}
          >
            {fmtMoney(row.total_spend)}
          </p>
          <p
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              marginTop: '6px',
              color: INK_SOFT,
            }}
          >
            Total {YEAR_LABEL}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '1px',
          background: INK_HAIRLINE,
          border: `1px solid ${INK_HAIRLINE}`,
        }}
      >
        <Cell label="Staffing" v={row.staffing_spend} />
        <Cell label="Office" v={row.office_spend} />
        <Cell label="Accommodation" v={row.accommodation_spend} />
        <Cell label="Travel" v={row.travel_subsistence_spend} />
        <Cell label="Other" v={row.other_costs_spend} />
        <Cell label="Winding-up" v={row.winding_up_spend} />
      </div>
    </li>
  );
}

function Cell({ label, v }: { label: string; v: number | null | undefined }) {
  return (
    <div style={{ padding: '8px 10px' }}>
      <p
        style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: INK_SOFT,
          margin: '0 0 4px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '13px',
          fontWeight: 'bold',
          color: INK,
          fontVariantNumeric: 'tabular-nums',
          margin: 0,
          lineHeight: 1,
        }}
      >
        {fmtMoney(v)}
      </p>
    </div>
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
          fontSize: '10px',
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
