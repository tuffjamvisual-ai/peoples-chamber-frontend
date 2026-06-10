// Department Staff section — junior ministers, senior civil service and
// board members. Lifted out of DepartmentClient (2026-06-10) so it can be
// rendered server-side directly beneath the Secretary of State photo in
// DepartmentMasthead, per the user-requested layout ("staff under the
// ministers photo"). Pure presentational; the only interactive piece,
// SeniorOfficialDetailLine, is its own client component.

import Link from 'next/link';
import { SeniorOfficialDetailLine } from './CivilServiceBlocks';

const ACCENT = '#7a1612';

type StaffMinister = {
  name: string;
  photo: string;
  role: string;
  slug: string;
  member_id?: number | null;
};

type StaffBoardMember = {
  name: string;
  photo: string;
  role: string;
  slug: string;
  member_id?: number | null;
  role_rank?: string | null;
  appointment_date?: string | null;
  scs_band?: string | null;
  pay_floor?: number | null;
  pay_ceiling?: number | null;
};

type StaffData = {
  ministers?: StaffMinister[];
  boardMembers?: StaffBoardMember[];
};

export default function DepartmentStaff({ govukData }: { govukData: StaffData | null }) {
  const juniorMinisters = govukData?.ministers?.slice(1) || [];
  // Senior officials: filter on role text (covers older rows without
  // role_rank) then sort by rank so PermSec → 2nd PermSec → DG → Chief.
  const rankOrder: Record<string, number> = {
    permanent_secretary: 0,
    second_permanent_secretary: 1,
    director_general: 2,
    chief_officer: 3,
    other: 9,
  };
  const seniorOfficials = (govukData?.boardMembers || [])
    .filter((m) => {
      const r = m.role.toLowerCase();
      return r.includes('permanent') || r.includes('director general') || r.includes('chief');
    })
    .slice()
    .sort((a, b) => (rankOrder[a.role_rank || 'other'] ?? 9) - (rankOrder[b.role_rank || 'other'] ?? 9));
  const boardMembers =
    govukData?.boardMembers?.filter((m) => {
      const r = m.role.toLowerCase();
      return r.includes('non-executive') || r.includes('board member');
    }) || [];

  if (juniorMinisters.length === 0 && seniorOfficials.length === 0 && boardMembers.length === 0) {
    return null;
  }

  return (
    <section style={{ fontFamily: 'Special Elite, monospace' }} className="text-[#14100d] mb-8">
      <h2 className="text-[14px] uppercase tracking-[0.25em] mb-6 font-semibold" style={{ color: ACCENT }}>
        Department Staff
      </h2>
      {juniorMinisters.length > 0 && <StaffGroup label="Ministers" people={juniorMinisters} />}
      {seniorOfficials.length > 0 && (
        <StaffGroup
          label="Senior Civil Service"
          eyebrow="The politicians change. These people often stay for years."
          people={seniorOfficials}
          showDetailLine
        />
      )}
      {boardMembers.length > 0 && <StaffGroup label="Board Members" people={boardMembers} />}
    </section>
  );
}

type StaffPerson = {
  name: string;
  role: string;
  slug: string;
  photo?: string;
  member_id?: number | null;
  appointment_date?: string | null;
  scs_band?: string | null;
  pay_floor?: number | null;
  pay_ceiling?: number | null;
};

function StaffGroup({
  label,
  eyebrow,
  people,
  showDetailLine,
}: {
  label: string;
  eyebrow?: string;
  people: StaffPerson[];
  showDetailLine?: boolean;
}) {
  return (
    <div className="mb-8">
      <p className="text-[14px] uppercase tracking-[0.2em] text-[#14100d] mb-2 font-semibold">{label}</p>
      {eyebrow && (
        <p className="text-[#14100d] text-[13px] mb-4 italic" style={{ opacity: 0.75 }}>
          {eyebrow}
        </p>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {people.map((person, i) => {
          const href = person.member_id ? `/mps/${person.member_id}` : person.slug ? `/people/${person.slug}` : null;
          const inner = (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <p
                className="text-[#14100d] text-[14px] font-semibold hover:text-[#7a1612] transition-colors"
                style={{ overflowWrap: 'anywhere', textDecoration: href ? 'underline' : 'none', textUnderlineOffset: '3px' }}
              >
                {person.name}
              </p>
              <p className="text-[#14100d] text-[14px] mt-0.5 leading-[1.55] opacity-80" style={{ overflowWrap: 'anywhere' }}>{person.role}</p>
              {showDetailLine && (
                <SeniorOfficialDetailLine
                  appointmentDate={person.appointment_date ?? null}
                  scsBand={person.scs_band ?? null}
                  payFloor={person.pay_floor ?? null}
                  payCeiling={person.pay_ceiling ?? null}
                />
              )}
            </div>
          );
          return (
            <li key={i}>
              {href ? <Link href={href} className="block">{inner}</Link> : <div className="block">{inner}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
