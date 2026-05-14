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
const cream = '#ebe5d8';

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
  const memberIdBySlug = new Map<string, number>(
    (sosRows || [])
      .map((r: { dept_slug: string; name: string | null; member_id: number | null }) => {
        const mid = r.member_id ?? mpByName.get(normalize(r.name))?.member_id ?? null;
        return mid != null ? ([r.dept_slug, mid] as [string, number]) : null;
      })
      .filter((x): x is [string, number] => x !== null)
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
          <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
            The People&apos;s Chamber · Departments
          </p>
          <h1 style={{ fontSize: '52px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
            Government Departments
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '640px' }}>
            What every department controls and where every party stands on the issues that matter to you. Tap any department for live ministers, agencies, and topic-by-topic positions.
          </p>
        </header>

        <ul style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1px',
          background: inkHairline,
          border: `1px solid ${inkHairline}`,
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          {departments.map((dept, idx) => {
            const photo = photoBySlug.get(dept.slug);
            const memberId = memberIdBySlug.get(dept.slug);
            const tilt = ((idx % 5) - 2) * 0.15; // subtle vary -0.3..+0.15

            const ministerInner = (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photo}
                    alt={dept.minister}
                    loading="lazy"
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${inkHairline}` }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: '#d6cdb8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', color: ink,
                      border: `1px solid ${inkHairline}`,
                    }}
                  >
                    {dept.minister.charAt(0)}
                  </div>
                )}
                <span style={{ fontSize: '13px', color: ink, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dept.minister}
                </span>
              </div>
            );

            return (
              <li
                key={dept.slug}
                style={{
                  background: cream,
                  display: 'flex',
                  flexDirection: 'column',
                  transform: `rotate(${tilt}deg)`,
                }}
              >
                <Link
                  href={`/departments/${dept.slug}`}
                  style={{ display: 'block', padding: '18px 18px 8px', color: ink, textDecoration: 'none' }}
                >
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: 1.25, marginBottom: '6px' }}>
                    {dept.name}
                  </h2>
                  <p style={{ fontSize: '13px', color: inkSoft, lineHeight: 1.55, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                    {dept.description}
                  </p>
                </Link>

                {memberId ? (
                  <Link href={`/mps/${memberId}`} style={{ display: 'block', padding: '0 18px 10px', color: 'inherit', textDecoration: 'none' }} aria-label={`View bio for ${dept.minister}`}>
                    {ministerInner}
                  </Link>
                ) : (
                  <div style={{ padding: '0 18px 10px' }}>{ministerInner}</div>
                )}

                <Link href={`/departments/${dept.slug}`} style={{ display: 'block', padding: '0 18px 18px', marginTop: 'auto', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {dept.controlZones.slice(0, 3).map((zone) => (
                      <span
                        key={zone}
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 600,
                          padding: '2px 6px',
                          color: '#7a1612',
                          border: `1px solid rgba(122,22,18,0.3)`,
                          background: 'rgba(122,22,18,0.06)',
                        }}
                      >
                        {zone}
                      </span>
                    ))}
                    {dept.controlZones.length > 3 && (
                      <span style={{
                        fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                        padding: '2px 6px', color: inkSoft, border: `1px solid ${inkHairline}`, background: 'transparent',
                      }}>
                        +{dept.controlZones.length - 3}
                      </span>
                    )}
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

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div style={{ padding: '16px 18px', background: cream }}>
      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 500, marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: accent ? '#7a1612' : ink }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
