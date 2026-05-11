import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from '../components/Navigation';

export const metadata: Metadata = {
  title: 'Top Spenders',
  description: 'The 10 MPs with the highest business costs in 2024–25, sourced from IPSA total-spend data.',
  alternates: { canonical: '/expenses' },
};

export const revalidate = 3600;

const YEAR = '24_25';
const YEAR_LABEL = '2024 / 2025';
const ACCENT = '#ffffff';
const BORDER = '#333333';
const MUTED = '#9a9a9a';

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
    .select('member_id, year, total_spend, staffing_spend, office_spend, accommodation_spend, travel_subsistence_spend, other_costs_spend, winding_up_spend')
    .eq('year', YEAR)
    .order('total_spend', { ascending: false, nullsFirst: false })
    .limit(20);

  const ids = (expenseRows || []).map((r: ExpenseRow) => r.member_id);

  const { data: mpRows } = ids.length
    ? await supabase
        .from('mps')
        .select('member_id, name, display_name, constituency, party, party_colour, photo_url, current_member')
        .in('member_id', ids)
    : { data: [] as MpRow[] };

  const mpById = new Map<number, MpRow>(
    ((mpRows as MpRow[]) || []).map((m) => [m.member_id, m]),
  );

  const top = ((expenseRows as ExpenseRow[]) || [])
    .map((row) => ({ row, mp: mpById.get(row.member_id) }))
    .filter((x): x is { row: ExpenseRow; mp: MpRow } => Boolean(x.mp && x.mp.current_member))
    .slice(0, 10);

  const grandTotal = top.reduce((s, x) => s + (Number(x.row.total_spend) || 0), 0);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <header className="border-b border-[#333333] pb-8 mb-8">
          <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: ACCENT }}>
            The People&apos;s Chamber · Expenses
          </p>
          <h1
            className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight text-white mb-3"
            style={{ fontFamily: '"Georgia", "Charter", "Times New Roman", serif' }}
          >
            Top 10 spenders {YEAR_LABEL}
          </h1>
          <p className="text-white text-[14px] leading-[1.7] max-w-2xl mb-5">
            Ranked by total business costs claimed across staffing, office, accommodation, travel and other categories.
            Source: <a href="https://www.theipsa.org.uk" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">IPSA total-spend data</a>.
          </p>
          <div className="grid grid-cols-3 gap-px border border-[#333333]">
            <Stat label="Top 10 combined" value={fmtMoney(grandTotal)} />
            <Stat label="Average" value={top.length ? fmtMoney(grandTotal / top.length) : '£0'} />
            <Stat label="Year" value={YEAR_LABEL} />
          </div>
        </header>

        {/* Ranked list */}
        <ol className="space-y-px border border-[#333333]">
          {top.map((x, i) => (
            <Row key={x.mp.member_id} rank={i + 1} row={x.row} mp={x.mp} />
          ))}
        </ol>

        <p className="mt-8 text-[12px] text-white opacity-70 leading-[1.7]">
          Totals reflect spend recorded against budgets and uncapped categories for the {YEAR_LABEL} financial year. Itemised line items are visible on each MP&apos;s profile under Expenses.
        </p>
      </main>
    </div>
  );
}

function Row({ rank, row, mp }: { rank: number; row: ExpenseRow; mp: MpRow }) {
  const partyColour = mp.party_colour ? '#' + mp.party_colour.replace('#', '') : '#7697a2';
  const name = mp.display_name || mp.name || '';
  return (
    <li className="bg-[#1a1a1a] p-5 border-l-2 hover:bg-[#0e0e0e] transition-colors" style={{ borderLeftColor: partyColour }}>
      <div className="grid grid-cols-[auto_auto_1fr_auto] gap-4 sm:gap-5 items-center mb-4">
        <div
          className="text-3xl sm:text-4xl font-bold tabular-nums w-10 text-center"
          style={{ fontFamily: '"Georgia", "Charter", "Times New Roman", serif', color: MUTED }}
        >
          {rank}
        </div>

        <div className="flex-shrink-0">
          {mp.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mp.photo_url}
              alt={name}
              className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full object-cover"
              style={{ border: `2px solid ${partyColour}` }}
            />
          ) : (
            <div
              className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ border: `2px solid ${partyColour}`, background: partyColour + '33' }}
            >
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Link
            href={`/mps/${mp.member_id}`}
            className="text-white text-lg sm:text-xl font-bold hover:underline leading-tight block truncate"
            style={{ fontFamily: '"Georgia", "Charter", "Times New Roman", serif' }}
          >
            {name}
          </Link>
          <p className="text-[13px] text-white opacity-80 truncate">{mp.constituency || ''}</p>
          {mp.party && (
            <span
              className="inline-block mt-2 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-sm text-white"
              style={{ backgroundColor: partyColour }}
            >
              {mp.party}
            </span>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <p
            className="text-2xl sm:text-3xl font-bold tabular-nums leading-none text-white"
            style={{ fontFamily: '"Georgia", "Charter", "Times New Roman", serif' }}
          >
            {fmtMoney(row.total_spend)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] mt-1.5 text-white opacity-70">
            Total {YEAR_LABEL}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-[#222222] border border-[#333333]">
        <Cell label="Staffing"      v={row.staffing_spend} />
        <Cell label="Office"        v={row.office_spend} />
        <Cell label="Accommodation" v={row.accommodation_spend} />
        <Cell label="Travel"        v={row.travel_subsistence_spend} />
        <Cell label="Other"         v={row.other_costs_spend} />
        <Cell label="Winding-up"    v={row.winding_up_spend} />
      </div>
    </li>
  );
}

function Cell({ label, v }: { label: string; v: number | null | undefined }) {
  return (
    <div className="bg-[#1a1a1a] px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.15em] text-white opacity-70 mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-white tabular-nums leading-none">{fmtMoney(v)}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1a1a1a] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white opacity-70 mb-1.5 font-medium">{label}</p>
      <p
        className="text-2xl font-bold leading-none tracking-tight text-white tabular-nums"
        style={{ fontFamily: '"Georgia", "Charter", "Times New Roman", serif' }}
      >
        {value}
      </p>
    </div>
  );
}
