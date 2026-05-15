// Magazine-template profile for peers + civil servants. The hero
// geometry is intentionally identical to /mps/[id] (row-reverse,
// 284px polaroid, 260x260 photo, rotate 15deg, paperclip overlay) so
// /mps/[id] and /people/[slug] read as the same magazine.
//
// Data:
//   - person_cache: name, photo, current_roles, past_roles, political_bio
//   - dept_ministers fallback: photo if cache empty (e.g. new appointee)
//   - mp_interests: registered interests, joined by member_slug

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import '../../components/magazine-layout.css';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import PeopleProfileSections, { type Role, type Interest } from './PeopleProfileSections';

export const revalidate = 3600;

const INK = '#14100d';
const CREAM = '#ebe5d8';

type Person = {
  name: string;
  photo: string;
  currentRoles: Role[];
  pastRoles: Role[];
  politicalBio: string | null;
};

async function getPersonAndInterests(
  slug: string,
): Promise<{ person: Person | null; interests: Interest[] }> {
  const [{ data: cached }, { data: ministerRow }, { data: interestRows }] = await Promise.all([
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
    supabase
      .from('mp_interests')
      .select('category, summary, detail, registered_date')
      .eq('member_slug', slug)
      .order('registered_date', { ascending: false }),
  ]);

  const interests = (interestRows || []) as Interest[];

  if (cached) {
    return {
      person: {
        name: cached.name,
        // Prefer the manually-uploaded dept_ministers photo over the
        // gov.uk-synced one in person_cache. Manual uploads are the
        // authoritative source — sync runs would otherwise overwrite
        // them on the next refresh.
        photo: ministerRow?.photo_url || cached.photo || '',
        currentRoles: (cached.current_roles as Role[]) || [],
        pastRoles: (cached.past_roles as Role[]) || [],
        politicalBio: (cached.political_bio as string | null) || null,
      },
      interests,
    };
  }

  if (ministerRow) {
    return {
      person: {
        name: ministerRow.name || '',
        photo: ministerRow.photo_url || '',
        currentRoles: [],
        pastRoles: [],
        politicalBio: null,
      },
      interests,
    };
  }

  return { person: null, interests };
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { person, interests } = await getPersonAndInterests(slug);

  const bioParagraphs = person?.politicalBio
    ? person.politicalBio
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

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
            display: 'inline-block',
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
            {/* Hero — identical geometry to /mps/[id] */}
            <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '40px', marginBottom: '30px' }}>
              <div
                style={{
                  position: 'relative',
                  background: CREAM,
                  padding: '12px 12px 48px 12px',
                  width: '284px',
                  marginTop: '-20px',
                  marginRight: '-40px',
                  transform: 'rotate(15deg)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
                  filter: 'contrast(1.05) brightness(0.98)',
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#d6cdb8',
                      color: INK,
                      fontSize: '64px',
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
                    transformOrigin: 'center',
                    pointerEvents: 'none',
                    zIndex: 3,
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <h1
                  style={{
                    fontSize: '44px',
                    marginTop: '20px',
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    color: INK,
                    fontFamily: 'Special Elite, monospace',
                    textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {person.name}
                </h1>
                {person.currentRoles[0] && (
                  <p style={{ fontSize: '22px', marginBottom: '4px', color: INK }}>
                    {person.currentRoles[0].title}
                  </p>
                )}
                {person.currentRoles[0]?.organisation && (
                  <p style={{ fontSize: '15px', color: 'rgba(20,16,13,0.7)' }}>
                    {person.currentRoles[0].organisation}
                  </p>
                )}
              </div>
            </div>

            <PeopleProfileSections
              paragraphs={bioParagraphs}
              currentRoles={person.currentRoles}
              pastRoles={person.pastRoles}
              interests={interests}
            />
          </>
        )}

        <ScrollToTopButton />
      </div>
    </div>
  );
}
