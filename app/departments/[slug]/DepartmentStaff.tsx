// Department Staff section — junior ministers, senior civil service and
// board members. Lifted out of DepartmentClient (2026-06-10) so it can be
// rendered server-side directly beneath the Secretary of State photo in
// DepartmentMasthead, per the user-requested layout ("staff under the
// ministers photo"). Pure presentational; the only interactive piece,
// SeniorOfficialDetailLine, is its own client component.

import Link from 'next/link';

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
    <section style={{ fontFamily: 'Special Elite, monospace' }} className="text-[#14100d] mb-6">
      <h2 className="text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT }}>
        Department Staff
      </h2>
      {juniorMinisters.length > 0 && <StaffGroup label="Ministers" people={juniorMinisters} />}
      {seniorOfficials.length > 0 && (
        <StaffGroup
          label="Senior Civil Service"
          eyebrow="The politicians change. These people often stay for years."
          people={seniorOfficials}
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
}: {
  label: string;
  eyebrow?: string;
  people: StaffPerson[];
}) {
  return (
    <div className="mb-5">
      <p className="text-[15px] uppercase tracking-[0.2em] text-[#14100d] mb-1.5 font-semibold">{label}</p>
      {eyebrow && (
        <p className="text-[#14100d] text-[15px] mb-2 italic" style={{ opacity: 0.75 }}>
          {eyebrow}
        </p>
      )}
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
        {people.map((person, i) => {
          const href = person.member_id ? `/mps/${person.member_id}` : person.slug ? `/people/${person.slug}` : null;
          const inner = (
            <span
              className="text-[#14100d] text-[15px] leading-tight font-semibold hover:text-[#7a1612] transition-colors"
              style={{ overflowWrap: 'anywhere', textDecoration: href ? 'underline' : 'none', textUnderlineOffset: '3px' }}
            >
              {person.name}
            </span>
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
