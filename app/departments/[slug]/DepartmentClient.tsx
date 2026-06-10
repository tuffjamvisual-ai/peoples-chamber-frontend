'use client';

import { useState } from 'react';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import { type DepartmentBudget } from '@/lib/department-budgets';
import { useSearchParams } from 'next/navigation';

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

        {/* Department Staff now renders server-side in page.tsx, directly
            beneath the Secretary of State photo (see DepartmentStaff.tsx). */}

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
