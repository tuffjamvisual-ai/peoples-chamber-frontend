'use client';

import { useState } from 'react';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import { type DepartmentBudget } from '@/lib/department-budgets';
import { useSearchParams } from 'next/navigation';
import { SeniorOfficialDetailLine } from './CivilServiceBlocks';

// SoS block and Budget panel moved to server component DepartmentMasthead
// 2026-06-04 — sit above the description and report rather than below.
// fmtBn / totalSpend no longer imported here; the `budget` prop stays on
// the interface but is always passed `null` from page.tsx for now (kept
// for a clean revert path, same pattern as `streetContext`).

const ACCENT = "#7a1612";

type GovukMinister = {
  name: string;
  photo: string;
  role: string;
  responsibilities: string;
  url: string;
  slug: string;
  is_secretary_of_state?: boolean;
  member_id?: number | null;
  resigned?: boolean;
};

type BoardMember = {
  name: string;
  photo: string;
  role: string;
  url: string;
  slug: string;
  category?: string;
  member_id?: number | null;
  role_rank?: string | null;
  appointment_date?: string | null;
  previous_role?: string | null;
  scs_band?: string | null;
  pay_floor?: number | null;
  pay_ceiling?: number | null;
};

type GovukData = {
  ministers: GovukMinister[];
  boardMembers: BoardMember[];
  childOrgs: { name: string; url: string; acronym: string }[];
  socialMedia: { service: string; url: string; title: string }[];
  foiEmail: string;
  pressPhone: string;
};

interface DepartmentClientProps {
  slug: string;
  govukData: GovukData | null;
  streetContext: string | null;
  budget: DepartmentBudget | null;
}

export default function DepartmentClient({ slug, govukData, streetContext, budget }: DepartmentClientProps) {
  const dept = departments.find((d) => d.slug === slug);
  const searchParams = useSearchParams();
  const zoneParam = searchParams.get('zone');
  // activeZone is live UI state — URL deep-link sets initial value; the
  // Close button on the topic-detail block clears it back to null.
  const [activeZone, setActiveZone] = useState<string | null>(zoneParam || null);

  if (!dept) return <p style={{ padding: '40px', textAlign: 'center' }}>Department not found</p>;

  const activeZoneData = dept.controlZonePositions?.find((z) => z.zone === activeZone);
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
  const boardMembers = govukData?.boardMembers?.filter((m) => {
    const r = m.role.toLowerCase();
    return r.includes('non-executive') || r.includes('board member');
  }) || [];

  return (
    <div
      className="text-[#14100d]"
      style={{
        marginTop: '8px',
        fontFamily: 'Special Elite, monospace',
        // Keep long role titles / department text from spilling outside the
        // folder's inner safe area (visible folder edge can look like a sidebar).
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
        {/* Social links — was previously next to dept name in the now-removed header */}
        {govukData?.socialMedia && govukData.socialMedia.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-8">
            {govukData.socialMedia.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] uppercase tracking-[0.15em] px-2 py-1 text-[#14100d]  hover: transition-colors"
              >
                {s.service === 'twitter' ? 'X' : s.service === 'youtube' ? 'YT' : s.service.slice(0, 3)}
              </a>
            ))}
          </div>
        )}

        {/* Secretary of State block + Budget panel rendered server-side in
            DepartmentMasthead (see app/departments/[slug]/DepartmentMasthead.tsx),
            and Institutional Performance Report rendered server-side in
            page.tsx — both lifted out of this client component on 2026-06-04
            so they ship in the initial HTML and so the masthead sits above
            the descriptive content per the user-requested layout. */}

        {/* Topic detail */}
        {activeZone && activeZoneData && (
          <section className=" pb-8 mb-8">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#14100d]">{activeZone}</h2>
              <button
                onClick={() => setActiveZone(null)}
                className="text-[14px] uppercase tracking-[0.25em] text-[#14100d] hover:text-[#14100d] transition-colors"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-[#14100d] text-[16px] leading-[1.7] mb-6">{activeZoneData.context}</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-px  ">
              {activeZoneData.positions.map((pos) => {
                const party = parties.find((p) => p.id === pos.partyId);
                if (!party) return null;
                return (
                  <li key={pos.partyId} className=" p-4 border-l-2" style={{ borderLeftColor: party.colour }}>
                    <span
                      className="inline-block text-[14px] uppercase tracking-[0.15em] font-bold px-2 py-0.5  mb-2"
                      style={{ backgroundColor: party.colour, color: party.textColour }}
                    >
                      {party.name}
                    </span>
                    <p className="text-[#14100d] font-semibold text-[14px] mb-1 leading-snug">{pos.headline}</p>
                    <p className="text-[#14100d] text-[16px] leading-[1.7]">{pos.position}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Agencies */}
        {govukData?.childOrgs && govukData.childOrgs.length > 0 && (
          <section className=" pb-8 mb-8">
            <h2 className="text-[14px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT }}>
              Agencies & Arm&apos;s Length Bodies ({govukData.childOrgs.length})
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {govukData.childOrgs.map((org, i) => {
                const agencySlug = org.url.split('/government/organisations/')[1] || '';
                return (
                  <Link
                    key={i}
                    href={'/agencies/' + agencySlug}
                    className="text-[15px] uppercase tracking-[0.15em] text-[#14100d] hover:text-[#7a1612] transition-colors"
                  >
                    {org.acronym || org.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Staff — heading + groups only when there's at least one body to
            show. Previously the "Department Staff" h2 rendered even when
            all three groups were empty (commons-leader: 1 minister-SoS,
            0 officials per gov.uk's own API), leaving a dangling heading
            above the FOI/press contact row. 2026-06-04. */}
        {(juniorMinisters.length > 0 || seniorOfficials.length > 0 || boardMembers.length > 0) && (
          <section>
            <h2 className="text-[14px] uppercase tracking-[0.25em] mb-6 font-semibold" style={{ color: ACCENT }}>Department Staff</h2>

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
        )}

        {(govukData?.foiEmail || govukData?.pressPhone) && (
          <section className="mt-8">
            <div className="flex flex-wrap gap-6">
              {govukData.foiEmail && (
                <a
                  href={`mailto:${govukData.foiEmail}`}
                  className="text-[14px] uppercase tracking-[0.15em] hover:underline"
                  style={{ color: ACCENT }}
                >
                  FOI Request: {govukData.foiEmail}
                </a>
              )}
              {govukData.pressPhone && (
                <span className="text-[14px] uppercase tracking-[0.15em] text-[#14100d] font-mono">Press: {govukData.pressPhone}</span>
              )}
            </div>
          </section>
        )}
    </div>
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
          // Vary the polaroid tilt per item for stacked-snapshots feel
          const tilt = ((i % 5) - 2) * 1.2 - 0.5;
          const inner = (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                background: '#ebe5d8',
                padding: '6px 6px 18px 6px',
                transform: `rotate(${tilt}deg)`,
                boxShadow: '0 3px 6px rgba(0,0,0,0.18), inset 0 0 20px rgba(0,0,0,0.03)',
                flexShrink: 0,
              }}>
                {person.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={person.photo}
                    alt={person.name}
                    loading="lazy"
                    style={{ display: 'block', width: '60px', height: '70px', objectFit: 'cover', filter: 'contrast(1.05) sepia(0.05)' }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: '60px', height: '70px', background: '#d6cdb8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', color: '#14100d',
                    }}
                  >
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0, paddingTop: '4px', flex: '1 1 0', overflow: 'hidden' }}>
                <p className="text-[#14100d] text-[14px] font-semibold hover:text-[#7a1612] transition-colors" style={{ overflowWrap: 'anywhere' }}>{person.name}</p>
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

