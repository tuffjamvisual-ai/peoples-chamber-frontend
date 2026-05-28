'use client';

import { useState } from 'react';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import { useSearchParams } from 'next/navigation';

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

type GovukData = {
  ministers: GovukMinister[];
  boardMembers: { name: string; photo: string; role: string; url: string; slug: string; category?: string; member_id?: number | null }[];
  childOrgs: { name: string; url: string; acronym: string }[];
  socialMedia: { service: string; url: string; title: string }[];
  foiEmail: string;
  pressPhone: string;
};

interface DepartmentClientProps {
  slug: string;
  govukData: GovukData | null;
  streetContext: string | null;
}

export default function DepartmentClient({ slug, govukData, streetContext }: DepartmentClientProps) {
  const dept = departments.find((d) => d.slug === slug);
  const searchParams = useSearchParams();
  const zoneParam = searchParams.get('zone');
  // activeZone is live UI state — URL deep-link sets initial value; the
  // Close button on the topic-detail block clears it back to null.
  const [activeZone, setActiveZone] = useState<string | null>(zoneParam || null);

  if (!dept) return <p style={{ padding: '40px', textAlign: 'center' }}>Department not found</p>;

  const activeZoneData = dept.controlZonePositions?.find((z) => z.zone === activeZone);
  const sos = govukData?.ministers?.[0] || { name: dept.minister, photo: '', role: 'Secretary of State', responsibilities: '', url: '', slug: '' };
  const juniorMinisters = govukData?.ministers?.slice(1) || [];
  const seniorOfficials = govukData?.boardMembers?.filter((m) => {
    const r = m.role.toLowerCase();
    return r.includes('permanent') || r.includes('director general') || r.includes('chief');
  }) || [];
  const boardMembers = govukData?.boardMembers?.filter((m) => {
    const r = m.role.toLowerCase();
    return r.includes('non-executive') || r.includes('board member');
  }) || [];

  return (
    <div className="text-[#14100d]" style={{ marginTop: '8px', fontFamily: 'Special Elite, monospace' }}>
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

        {/* Department head — title shown under the name (sos.role), so no separate label. */}
        <section className=" pb-8 mb-8">
          <div className="flex items-center gap-8">
            <div style={{
              position: 'relative',
              background: '#ebe5d8',
              padding: '12px 12px 48px 12px',
              width: '284px',
              transform: 'rotate(-2deg)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
              filter: 'contrast(1.05) brightness(0.98)',
              flexShrink: 0,
            }}>
              {sos.photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={sos.photo}
                  alt={sos.name}
                  style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
                />
              ) : (
                <div
                  aria-hidden
                  style={{
                    width: '260px', height: '260px', background: '#d6cdb8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '64px', color: ACCENT,
                    fontFamily: 'Special Elite, monospace',
                  }}
                >
                  {sos.name.charAt(0)}
                </div>
              )}
              {sos.resigned && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/resigned-stamp.png"
                  alt="Resigned"
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: '-80px',
                    right: '-40px',
                    width: '220px',
                    height: 'auto',
                    transform: 'rotate(-10deg)',
                    transformOrigin: 'center',
                    opacity: 0.9,
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}
                />
              )}
            </div>
            <div>
              <h2 className="text-[#14100d] text-2xl sm:text-3xl font-black tracking-tight mb-1">{sos.name}</h2>
              <p className="text-[#14100d] text-[16px] leading-[1.7] mb-2">{sos.role}</p>
              {sos.member_id ? (
                <Link
                  href={`/mps/${sos.member_id}`}
                  className="inline-block text-[14px] uppercase tracking-[0.2em] hover:underline font-semibold"
                  style={{ color: ACCENT }}
                >
                  View bio →
                </Link>
              ) : sos.slug ? (
                <Link
                  href={`/people/${sos.slug}`}
                  className="inline-block text-[14px] uppercase tracking-[0.2em] hover:underline font-semibold"
                  style={{ color: ACCENT }}
                >
                  View bio →
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {/* Assessment (no heading — the old "Street View" label was removed as irrelevant) */}
        <section className=" pb-8 mb-8">
          {((streetContext || dept.streetContext) ?? '')
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((para, idx) => (
              <p key={idx} className="text-[#14100d] text-[16px] leading-[1.7] mb-3">{para}</p>
            ))}
        </section>

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

        {/* Staff */}
        <section>
          <h2 className="text-[14px] uppercase tracking-[0.25em] mb-6 font-semibold" style={{ color: ACCENT }}>Department Staff</h2>

          {juniorMinisters.length > 0 && <StaffGroup label="Ministers" people={juniorMinisters} />}
          {seniorOfficials.length > 0 && <StaffGroup label="Senior Officials" people={seniorOfficials} />}
          {boardMembers.length > 0 && <StaffGroup label="Board Members" people={boardMembers} />}

          {(govukData?.foiEmail || govukData?.pressPhone) && (
            <div className="flex flex-wrap gap-6 mt-6 pt-6">
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
          )}
        </section>
    </div>
  );
}

function StaffGroup({ label, people }: { label: string; people: { name: string; role: string; slug: string; photo?: string; member_id?: number | null }[] }) {
  return (
    <div className="mb-8">
      <p className="text-[14px] uppercase tracking-[0.2em] text-[#14100d] mb-4 font-semibold">{label}</p>
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
              <div style={{ minWidth: 0, paddingTop: '4px' }}>
                <p className="text-[#14100d] text-[14px] font-semibold hover:text-[#7a1612] transition-colors">{person.name}</p>
                <p className="text-[#14100d] text-[14px] mt-0.5 leading-[1.55] opacity-80">{person.role}</p>
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
