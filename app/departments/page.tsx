import type { Metadata } from 'next';
import { departments } from '@/lib/departments';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import '../components/magazine-layout.css';
import ScrollToTopButton from '../components/ScrollToTopButton';

export const metadata: Metadata = {
  title: 'Departments',
  description:
    'Explore all 24 UK government departments, their ministers, control zones and what every party says about each topic.',
  alternates: { canonical: '/departments' },
};

export const revalidate = 3600;

const ink = '#14100d';
const inkSoft = 'rgba(20,16,13,0.7)';
const inkHairline = 'rgba(20,16,13,0.3)';

export default async function DepartmentsPage() {
  const totalZones = departments.reduce((sum, d) => sum + d.controlZones.length, 0);

  // Name-normalisation for fuzzy MP-by-name matching when dept_ministers
  // rows lack a populated member_id (mostly peers we can't link to mps).
  const normalize = (s: string | null | undefined): string => {
    if (!s) return '';
    return s
      .toLowerCase()
      .replace(/^(the rt hon|rt hon|sir|dame|dr|mr|mrs|ms|miss|lord|baroness|baron)\s+/i, '')
      .replace(/\s+(mp|mbe|obe|kbe|dbe|cbe|kcb|gcb|dso|mc|qc|kc|bt)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const [{ data: sosRows }, { data: mpRows }] = await Promise.all([
    supabase
      .from('dept_ministers')
      .select('dept_slug, name, photo_url, member_id')
      .eq('is_secretary_of_state', true),
    supabase.from('mps').select('member_id, name, display_name, photo_url').eq('current_member', true),
  ]);

  const mpByName = new Map<string, { member_id: number; photo_url: string | null }>();
  (mpRows || []).forEach((mp) => {
    [normalize(mp.display_name), normalize(mp.name)].forEach((k) => {
      if (k && !mpByName.has(k)) mpByName.set(k, { member_id: mp.member_id, photo_url: mp.photo_url });
    });
  });

  const photoBySlug = new Map<string, string>(
    (sosRows || []).map((r: { dept_slug: string; name: string | null; photo_url: string | null }) => [
      r.dept_slug,
      r.photo_url || mpByName.get(normalize(r.name))?.photo_url || '',
    ])
  );

  return (
    <div style={{
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
    }}>
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
          ['/',            'Home',           5,    9],
          ['/bills',       'Bills',          16,   8],
          ['/laws',        'Laws',           25,   7],
          ['/polls',       "People's Polls", 34,   14],
          ['/mps',         'MPs',            48,   11],
          ['/departments', 'Departments',    59,   15],
          ['/login',       'Login',          76,   8],
          ['/about',       'About',          87,   9],
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

      <div className="magazine-content-spacing" style={{ position: 'relative', zIndex: 2, color: ink, fontFamily: 'Special Elite, monospace' }}>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: ink,
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to home
        </a>

        <header style={{ borderBottom: `1px solid ${inkHairline}`, paddingBottom: '32px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
            Government Departments
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '640px' }}>
            What every department controls and where every party stands on the issues that matter to you. Tap any department for live ministers, agencies, and topic-by-topic positions.
          </p>
        </header>

        <ul style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '32px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          {departments.map((dept, idx) => {
            const photo = photoBySlug.get(dept.slug);
            const tilt = ((idx % 5) - 2) * 1.5 - 0.5;

            return (
              <li key={dept.slug}>
                <Link
                  href={`/departments/${dept.slug}`}
                  style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      background: '#ebe5d8',
                      padding: '6px 6px 22px 6px',
                      transform: `rotate(${tilt}deg)`,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
                      flexShrink: 0,
                    }}
                  >
                    {photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo}
                        alt={dept.minister}
                        loading="lazy"
                        style={{ display: 'block', width: '84px', height: '96px', objectFit: 'cover', filter: 'contrast(1.05) sepia(0.05)' }}
                      />
                    ) : (
                      <div
                        aria-hidden
                        style={{
                          width: '84px',
                          height: '96px',
                          background: '#d6cdb8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          color: ink,
                        }}
                      >
                        {dept.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, paddingTop: '6px', minWidth: 0 }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', lineHeight: 1.25 }}>
                      {dept.name}
                    </h2>
                    <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>{dept.minister}</p>
                    <p style={{ fontSize: '13px', color: inkSoft, lineHeight: 1.55, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                      {dept.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <ScrollToTopButton />
      </div>
    </div>
  );
}
