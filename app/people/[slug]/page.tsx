// Magazine-template profile page for peers + civil servants
// (the non-MP staff whose dept_ministers / dept_officials rows don't
// link to an mps row). Mirrors the chrome and polaroid hero used on
// /mps/[id]. Data comes from person_cache (nightly refresh) with a
// dept_ministers fallback for new appointees not yet cached.

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import '../../components/magazine-layout.css';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import InterestsLoader from './InterestsLoader';

export const revalidate = 3600;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

type Role = {
  title: string;
  organisation: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  body?: string;
};

type Person = {
  name: string;
  photo: string;
  currentRoles: Role[];
  pastRoles: Role[];
  politicalBio: string | null;
};

async function getPerson(slug: string): Promise<Person | null> {
  const [{ data: cached }, { data: ministerRow }] = await Promise.all([
    supabase
      .from('person_cache')
      .select('name, photo, current_roles, past_roles, political_bio')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('dept_ministers')
      .select('photo_url, name')
      .eq('slug', slug)
      .maybeSingle(),
  ]);

  if (cached) {
    return {
      name: cached.name,
      photo: cached.photo || ministerRow?.photo_url || '',
      currentRoles: (cached.current_roles as Role[]) || [],
      pastRoles: (cached.past_roles as Role[]) || [],
      politicalBio: (cached.political_bio as string | null) || null,
    };
  }

  if (ministerRow) {
    return {
      name: ministerRow.name || '',
      photo: ministerRow.photo_url || '',
      currentRoles: [],
      pastRoles: [],
      politicalBio: null,
    };
  }

  return null;
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = await getPerson(slug);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <nav
        aria-label="Site"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          aspectRatio: '1023 / 330',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        {([
          ['/', 'Home', 5, 9],
          ['/bills', 'Bills', 16, 8],
          ['/laws', 'Laws', 25, 7],
          ['/polls', "People's Polls", 34, 14],
          ['/mps', 'MPs', 48, 11],
          ['/departments', 'Departments', 59, 15],
          ['/login', 'Login', 76, 8],
          ['/about', 'About', 87, 9],
        ] as const).map(([href, label, left, width]) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            style={{
              position: 'absolute',
              top: '80%',
              left: `${left}%`,
              width: `${width}%`,
              height: '18%',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
        ))}
      </nav>

      <div
        className="magazine-content-spacing"
        style={{ position: 'relative', zIndex: 2, color: INK, fontFamily: 'Special Elite, monospace' }}
      >
        <a
          href="/departments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: INK,
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to departments
        </a>

        {!person && (
          <p style={{ fontSize: '16px', lineHeight: 1.7 }}>Person not found.</p>
        )}

        {person && (
          <>
            {/* Hero — polaroid photo on right, name + role on left,
                mirroring the MP profile pattern. */}
            <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '40px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div
                style={{
                  position: 'relative',
                  background: CREAM,
                  padding: '12px 12px 48px 12px',
                  width: '284px',
                  marginTop: '-20px',
                  marginRight: '-20px',
                  transform: 'rotate(13deg)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
                  filter: 'contrast(1.05) brightness(0.98)',
                  flexShrink: 0,
                }}
              >
                {person.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={person.photo}
                    alt={person.name}
                    style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: '260px',
                      height: '260px',
                      background: '#d6cdb8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '64px',
                      color: INK,
                      fontFamily: 'Special Elite, monospace',
                    }}
                  >
                    {person.name.charAt(0) || '?'}
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/paperclip.png"
                  alt=""
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-5px',
                    width: '65px',
                    height: 'auto',
                    transform: 'rotate(180deg)',
                    pointerEvents: 'none',
                    zIndex: 3,
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '260px' }}>
                <h1
                  style={{
                    fontSize: '44px',
                    fontWeight: 'bold',
                    letterSpacing: '-0.02em',
                    marginBottom: '12px',
                    transform: 'rotate(-0.3deg)',
                    textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
                    lineHeight: 1.05,
                  }}
                >
                  {person.name}
                </h1>
                {person.currentRoles.length > 0 && (
                  <p style={{ fontSize: '18px', color: INK, marginBottom: '8px', lineHeight: 1.4 }}>
                    {person.currentRoles[0].title}
                  </p>
                )}
              </div>
            </div>

            {/* Political Bio */}
            {person.politicalBio && (
              <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '32px', marginBottom: '40px' }}>
                <p
                  style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3em',
                    marginBottom: '16px',
                    color: ACCENT,
                    fontWeight: 'bold',
                  }}
                >
                  Political Bio
                </p>
                <div style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '760px' }}>
                  {person.politicalBio
                    .split(/\n\n+/)
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i} style={{ marginBottom: '18px' }}>
                        {para}
                      </p>
                    ))}
                </div>
              </section>
            )}

            {/* Current Roles */}
            {person.currentRoles.length > 0 && (
              <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '32px', marginBottom: '40px' }}>
                <p
                  style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3em',
                    marginBottom: '20px',
                    color: ACCENT,
                    fontWeight: 'bold',
                  }}
                >
                  Current Role{person.currentRoles.length > 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {person.currentRoles.map((role, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: '16px' }}>
                      <div style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '4px' }}>{role.title}</div>
                      <div style={{ fontSize: '14px', color: INK_SOFT, marginBottom: '6px' }}>{role.organisation}</div>
                      {role.startDate && (
                        <div style={{ fontSize: '13px', color: INK_SOFT, marginBottom: '8px' }}>
                          Since {new Date(role.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </div>
                      )}
                      {role.body && (
                        <div
                          style={{ fontSize: '14px', lineHeight: 1.7, marginTop: '10px' }}
                          dangerouslySetInnerHTML={{ __html: role.body }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Financial Interests (client island — calls /api/mp-interests) */}
            <InterestsLoader slug={slug} />

            {/* Previous Roles */}
            {person.pastRoles.length > 0 && (
              <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '32px', marginBottom: '40px' }}>
                <p
                  style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3em',
                    marginBottom: '20px',
                    color: ACCENT,
                    fontWeight: 'bold',
                  }}
                >
                  Previous Roles
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
                  {person.pastRoles.map((role, i) => (
                    <li
                      key={i}
                      style={{
                        padding: '12px 0',
                        borderBottom: i < person.pastRoles.length - 1 ? `1px solid ${INK_HAIRLINE}` : 'none',
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '2px' }}>{role.title}</div>
                      <div style={{ fontSize: '14px', color: INK_SOFT }}>{role.organisation}</div>
                      {role.startDate && role.endDate && (
                        <div style={{ fontSize: '13px', color: INK_SOFT, marginTop: '4px' }}>
                          {new Date(role.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          {' — '}
                          {new Date(role.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <ScrollToTopButton />
      </div>
    </div>
  );
}
