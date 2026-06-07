'use client';
// Shared display components — no data fetching, props-only. Marked
// 'use client' so the client-side DepartmentClient can import
// SeniorOfficialDetailLine without violating the server/client
// boundary. WorkforceBlock + BudgetBlock are still rendered from the
// server component (page.tsx) but work the same way either side.

import {
  fmtAppointed,
  fmtHeadcount,
  fmtMillions,
  fmtPayBand,
  type DepartmentBudgetRow,
  type DepartmentStaffingRow,
} from '@/lib/department-civil-service';

const ACCENT = '#7a1612';

function ChangeChip({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return null;
  const up = pct >= 0;
  const sign = up ? '↑' : '↓';
  const colour = up ? '#0a6f2a' : '#7a1612';
  return (
    <span style={{ color: colour, marginLeft: 8, fontWeight: 600 }}>
      {sign} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function WorkforceBlock({ row }: { row: DepartmentStaffingRow | null }) {
  return (
    <section className="pb-6 mb-6" style={{ fontFamily: 'Special Elite, monospace' }}>
      <h2 className="text-[14px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>
        Workforce
      </h2>
      {row && row.headcount != null ? (
        <>
          <p className="text-[#14100d]" style={{ fontSize: '22px', lineHeight: 1.2 }}>
            <strong>{fmtHeadcount(row.headcount)}</strong> civil servants
            <ChangeChip pct={row.change_from_previous_percent} />
          </p>
          <p className="text-[#14100d] text-[14px] mt-1" style={{ opacity: 0.8 }}>
            {row.fte != null && (<>{fmtHeadcount(Math.round(row.fte))} FTE · </>)}
            {row.period} · ONS Public Sector Employment, Table 8
          </p>
          {row.is_proxy && row.proxy_note && (
            <p className="text-[#14100d] text-[13px] mt-2" style={{ opacity: 0.65 }}>
              {row.proxy_note}.
            </p>
          )}
        </>
      ) : (
        <p className="text-[#14100d] text-[14px]" style={{ opacity: 0.8 }}>
          {row?.proxy_note || 'Not separately reported in civil service statistics'}.
        </p>
      )}
    </section>
  );
}

export function BudgetBlock({ row }: { row: DepartmentBudgetRow | null }) {
  if (!row) {
    return (
      <section className="pb-6 mb-6" style={{ fontFamily: 'Special Elite, monospace' }}>
        <h2 className="text-[14px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>
          Budget
        </h2>
        <p className="text-[#14100d] text-[14px]" style={{ opacity: 0.8 }}>
          Not in HM Treasury Main Estimates DEL tables.
        </p>
      </section>
    );
  }

  const total = fmtMillions(row.total_del_millions);
  const rdel = fmtMillions(row.resource_del_millions);
  const cdel = fmtMillions(row.capital_del_millions);

  return (
    <section className="pb-6 mb-6" style={{ fontFamily: 'Special Elite, monospace' }}>
      <h2 className="text-[14px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>
        Budget
      </h2>
      {total ? (
        <>
          <p className="text-[#14100d]" style={{ fontSize: '22px', lineHeight: 1.2 }}>
            <strong>{total}</strong> allocated
            <ChangeChip pct={row.change_from_previous_percent} />
          </p>
          <p className="text-[#14100d] text-[14px] mt-1" style={{ opacity: 0.8 }}>
            Resource DEL {rdel ?? '—'} · Capital DEL {cdel ?? '—'} · FY {row.financial_year} plans · HM Treasury Main Estimates
          </p>
          {row.caveat_note && (
            <p className="text-[#14100d] text-[13px] mt-2" style={{ opacity: 0.65 }}>
              {row.caveat_note}.
            </p>
          )}
          {row.editorial_prose && (
            <p className="text-[#14100d] text-[15px] mt-3" style={{ lineHeight: 1.7 }}>
              {row.editorial_prose}
            </p>
          )}
        </>
      ) : (
        <p className="text-[#14100d] text-[14px]" style={{ opacity: 0.8 }}>
          {row.caveat_note || 'Not separately disclosed in HMT Main Estimates'}.
        </p>
      )}
    </section>
  );
}

// Detail row appended under each official's name in the Senior
// Officials staff group: appointment date · salary band.
export function SeniorOfficialDetailLine({
  appointmentDate,
  scsBand,
  payFloor,
  payCeiling,
}: {
  appointmentDate: string | null | undefined;
  scsBand: string | null | undefined;
  payFloor: number | null | undefined;
  payCeiling: number | null | undefined;
}) {
  const appointed = fmtAppointed(appointmentDate);
  const pay = fmtPayBand(payFloor, payCeiling);
  const band = scsBand ? scsBand.toUpperCase() : null;
  const parts = [appointed, pay && band ? `${pay} · ${band}` : pay || band].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="text-[#14100d] text-[12px] mt-0.5" style={{ opacity: 0.7, lineHeight: 1.45 }}>
      {parts.join(' · ')}
    </p>
  );
}
