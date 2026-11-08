// Department Staff section — junior ministers, senior civil service and
// board members. Lifted out of DepartmentClient (2026-06-10) so it can be
// rendered server-side directly beneath the Secretary of State photo in
// DepartmentMasthead, per the user-requested layout ("staff under the
// ministers photo"). Pure presentational; the only interactive piece,
// SeniorOfficialDetailLine, is its own client component.

import Link from 'next/link';
import { phoneUpTo } from '@/lib/breakpoints';

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
    <section style={{ fontFamily: 'var(--font-special-elite), monospace' }} className="text-[#14100d] mb-6">
      <h2 className="text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT }}>
        Department Staff
      </h2>
      {juniorMinisters.length > 0 && <StaffGroup label="Ministers" people={juniorMinisters} showRoles />}
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

// showRoles (owner, 4 Nov 2026): under 640px, each minister's GOV.UK role title under their name, one to a line.
const ROLES_CSS = `.dept-role { display: none; } @media ${phoneUpTo(639.98)} { .dept-role { display: block; } .dept-role-list { grid-template-columns: minmax(0, 1fr) !important; row-gap: 10px !important; } }`;

function StaffGroup({
  label,
  eyebrow,
  people,
  showRoles = false,
}: {
  label: string;
  eyebrow?: string;
  people: StaffPerson[];
  showRoles?: boolean;
}) {
  return (
    <div className="mb-5">
      {showRoles && <style>{ROLES_CSS}</style>}
      <p className="text-[15px] uppercase tracking-[0.2em] text-[#14100d] mb-1.5 font-semibold">{label}</p>
      {eyebrow && (
        <p className="text-[#14100d] text-[15px] mb-2 italic" >
          {eyebrow}
        </p>
      )}
      <ul className={`grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1${showRoles ? ' dept-role-list' : ''}`}>
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
              {showRoles && person.role && <span className="dept-role text-[#14100d] text-[15px] leading-snug" style={{ overflowWrap: 'anywhere' }}>{person.role}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
