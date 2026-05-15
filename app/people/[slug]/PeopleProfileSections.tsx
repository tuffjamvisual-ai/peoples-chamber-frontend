'use client';

// Sidebar+content panel for /people/[slug]. Mirrors the visual layout
// of /mps/[id]'s MagazineProfileSections but with peer-applicable tabs
// only (Political Bio, Current Roles, Past Roles, Interests). Tabs
// without data are hidden via the same has[id] pattern.

import { useEffect, useState } from 'react';

type SectionId = 'bio' | 'roles' | 'past' | 'interests';

const ALL_SECTIONS: Array<{ id: SectionId; label: string; rotate: string }> = [
  { id: 'bio',       label: 'POLITICAL BIO',  rotate: '0.1deg' },
  { id: 'roles',     label: 'CURRENT ROLES',  rotate: '-0.12deg' },
  { id: 'past',      label: 'PAST ROLES',     rotate: '0.08deg' },
  { id: 'interests', label: 'INTERESTS',      rotate: '-0.1deg' },
];

export type Role = {
  title: string;
  organisation: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  body?: string;
};
export type Interest = {
  category: string | null;
  summary: string | null;
  detail: string | null;
  registered_date: string | null;
};

interface Props {
  paragraphs: string[];
  currentRoles: Role[];
  pastRoles: Role[];
  interests: Interest[];
}

const sectionH2: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 'bold',
  marginBottom: '24px',
  color: '#14100d',
  fontFamily: 'Special Elite, monospace',
  transform: 'rotate(-0.2deg)',
  textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.15)',
};

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtMonthYear = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';

export default function PeopleProfileSections({ paragraphs, currentRoles, pastRoles, interests }: Props) {
  const has: Record<SectionId, boolean> = {
    bio: paragraphs.length > 0,
    roles: currentRoles.length > 0,
    past: pastRoles.length > 0,
    interests: interests.length > 0,
  };
  const sections = ALL_SECTIONS.filter((s) => has[s.id]);
  const validIds = new Set<SectionId>(sections.map((s) => s.id));

  const [active, setActive] = useState<SectionId>(sections[0]?.id ?? 'bio');

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.slice(1) as SectionId;
      if (h && validIds.has(h)) setActive(h);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [validIds]);

  const select = (id: SectionId) => {
    setActive(id);
    if (typeof window !== 'undefined') history.replaceState(null, '', `#${id}`);
  };

  if (sections.length === 0) return null;

  // Group interests by category for cleaner display.
  const interestsByCategory = interests.reduce<Record<string, Interest[]>>((acc, it) => {
    const cat = it.category || 'Other';
    (acc[cat] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-px" style={{ marginTop: '-80px' }}>
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-16">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px' }}>
            {sections.map((s) => {
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => select(s.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderLeft: isActive ? '4px solid #7a1612' : '4px solid transparent',
                    background: isActive ? 'rgba(122,22,18,0.08)' : 'transparent',
                    boxShadow: isActive ? 'inset 1px 0 2px rgba(0,0,0,0.05)' : 'none',
                    fontWeight: isActive ? 'bold' : 'normal',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#14100d',
                    fontFamily: 'inherit',
                    transform: `rotate(${s.rotate})`,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="lg:col-span-3 p-6 sm:p-8" style={{ color: '#14100d', fontFamily: 'Special Elite, monospace' }}>
        {active === 'bio' && (
          <>
            <h2 style={sectionH2}>Political Biography</h2>
            <div style={{ lineHeight: 1.8, fontSize: '16px', letterSpacing: '0.01em' }}>
              {paragraphs.map((para, idx) => {
                const tilt = idx % 4;
                const rot = tilt === 0 ? '0.1deg' : tilt === 1 ? '-0.15deg' : tilt === 2 ? '0.08deg' : '-0.1deg';
                return (
                  <p key={idx} style={{ marginBottom: '16px', transform: `rotate(${rot})` }}>
                    {para}
                  </p>
                );
              })}
            </div>
          </>
        )}

        {active === 'roles' && (
          <>
            <h2 style={sectionH2}>Current Role{currentRoles.length > 1 ? 's' : ''}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {currentRoles.map((role, i) => (
                <div key={i} style={{ borderLeft: '3px solid #7a1612', paddingLeft: '16px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{role.title}</div>
                  {role.organisation && (
                    <div style={{ fontSize: '15px', color: 'rgba(20,16,13,0.7)', marginBottom: '6px' }}>
                      {role.organisation}
                    </div>
                  )}
                  {role.startDate && (
                    <div style={{ fontSize: '13px', color: 'rgba(20,16,13,0.7)' }}>
                      Since {fmtDate(role.startDate).replace(/^\d+\s/, '')}
                    </div>
                  )}
                  {role.body && (
                    <div
                      style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '12px' }}
                      dangerouslySetInnerHTML={{ __html: role.body }}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {active === 'past' && (
          <>
            <h2 style={sectionH2}>Previous Roles</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {pastRoles.map((role, i) => (
                <li
                  key={i}
                  style={{
                    padding: '14px 0',
                    borderBottom: i < pastRoles.length - 1 ? '1px dashed rgba(20,16,13,0.2)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '2px' }}>{role.title}</div>
                  {role.organisation && (
                    <div style={{ fontSize: '14px', color: 'rgba(20,16,13,0.7)' }}>{role.organisation}</div>
                  )}
                  {role.startDate && role.endDate && (
                    <div style={{ fontSize: '13px', color: 'rgba(20,16,13,0.7)', marginTop: '4px' }}>
                      {fmtMonthYear(role.startDate)} — {fmtMonthYear(role.endDate)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {active === 'interests' && (
          <>
            <h2 style={sectionH2}>Registered Interests</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(interestsByCategory).map(([cat, items]) => (
                <div key={cat}>
                  <h3
                    style={{
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.2em',
                      color: '#7a1612',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                    }}
                  >
                    {cat}
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((it, i) => (
                      <li key={i} style={{ fontSize: '15px', lineHeight: 1.7 }}>
                        {it.summary && <div>{it.summary}</div>}
                        {it.detail && it.detail !== it.summary && (
                          <div style={{ fontSize: '14px', color: 'rgba(20,16,13,0.7)', marginTop: '4px', whiteSpace: 'pre-line' }}>
                            {it.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
