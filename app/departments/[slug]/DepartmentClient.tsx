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
          <div className="flex gap-3 flex-wrap mb-8 items-center">
            {govukData.socialMedia.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.title || s.service}
                title={s.title || s.service}
                className="text-[#14100d] hover:text-[#7a1612] transition-colors"
                style={{ display: 'inline-flex' }}
              >
                {socialIcon(s.service)}
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
                className="text-[15px] uppercase tracking-[0.25em] text-[#14100d] hover:text-[#14100d] transition-colors"
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
                      className="inline-block text-[15px] uppercase tracking-[0.15em] font-bold px-2 py-0.5  mb-2"
                      style={{ backgroundColor: party.colour, color: party.textColour }}
                    >
                      {party.name}
                    </span>
                    <p className="text-[#14100d] font-semibold text-[15px] mb-1 leading-snug">{pos.headline}</p>
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
            <h2 className="text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT }}>
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

        {govukData?.pressPhone && (
          <section className="mt-8">
            <div className="flex flex-wrap gap-6">
              <span className="text-[15px] uppercase tracking-[0.15em] text-[#14100d] font-mono">Press: {govukData.pressPhone}</span>
            </div>
          </section>
        )}
    </div>
  );
}

// Brand glyph for a department's social link. Monochrome (currentColor),
// 20px. Falls back to a globe for anything unrecognised.
function socialIcon(service: string) {
  const s = (service || '').toLowerCase();
  const size = { width: 20, height: 20, viewBox: '0 0 24 24' };
  if (s.includes('twitter') || s === 'x') {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" /></svg>;
  }
  if (s.includes('youtube')) {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>;
  }
  if (s.includes('facebook')) {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
  }
  if (s.includes('linkedin')) {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" /></svg>;
  }
  if (s.includes('flickr')) {
    return <svg {...size} fill="currentColor" aria-hidden><circle cx="7.5" cy="12" r="4" /><circle cx="16.5" cy="12" r="4" /></svg>;
  }
  if (s.includes('instagram')) {
    return <svg {...size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>;
  }
  return <svg {...size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>;
}
