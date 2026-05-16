import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import '../components/magazine-layout.css';
import ScrollToTopButton from '../components/ScrollToTopButton';

import MagazineNav from '../components/MagazineNav';
export const metadata: Metadata = {
  title: 'Top Spenders',
  description:
    'The 10 MPs with the highest business costs in 2024–25, sourced from IPSA total-spend data.',
  alternates: { canonical: '/expenses' },
};

// Render on demand. See app/departments/page.tsx for rationale —
// Vercel's 3-worker build saturates Supabase when this, /departments,
// and /earnings all prerender concurrently.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const YEAR = '24_25';
const YEAR_LABEL = '2024 / 2025';

// Magazine palette
const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const CREAM = '#ebe5d8';
const CREAM_DEEP = '#dcd4c0';
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
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <MagazineNav />
      <div
        className="magazine-content-spacing"
        style={{
          position: 'relative',
          zIndex: 2,
          color: INK,
          fontFamily: 'Special Elite, monospace',
        }}
      >
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: INK,
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to home
        </a>

        <header style={{ marginBottom: '32px' }}>
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
              fontSize: '44px',
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
            Source:{' '}
            <a
              href="https://www.theipsa.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: ACCENT, textDecoration: 'underline' }}
            >
              IPSA total-spend data
            </a>
            .
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

        <ScrollToTopButton />
      </div>
    </div>
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
        background: CREAM,
        color: INK,
        border: `1px solid ${INK_HAIRLINE}`,
        borderLeft: `4px solid ${partyColour}`,
        padding: '20px 22px',
        transform: `rotate(${tilt}deg)`,
        boxShadow: '2px 3px 0 rgba(20,16,13,0.15)',
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
                boxShadow: '1px 2px 0 rgba(20,16,13,0.2)',
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
                background: CREAM_DEEP,
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
                color: CREAM,
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
    <div style={{ background: CREAM_DEEP, padding: '8px 10px' }}>
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
        background: CREAM_DEEP,
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
