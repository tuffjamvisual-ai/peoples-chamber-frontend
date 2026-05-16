import type { Metadata } from 'next';
import { departments } from '@/lib/departments';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import '../components/magazine-layout.css';
import ScrollToTopButton from '../components/ScrollToTopButton';

import MagazineNav from '../components/MagazineNav';
export const metadata: Metadata = {
  title: 'Departments',
  description:
    'Explore all 24 UK government departments, their ministers, control zones and what every party says about each topic.',
  alternates: { canonical: '/departments' },
};

// Render on demand. Building this page statically alongside /earnings
// and /expenses saturated Supabase under Vercel's 3-worker build → 60s
// statement timeouts. First request after deploy renders fresh, then
// the page caches at the edge for 1 hour via revalidate.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const ink = '#14100d';

export default async function DepartmentsPage() {
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
      mpByName.get(normalize(r.name))?.photo_url || r.photo_url || '',
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

      <MagazineNav />
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

        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
            Government Departments
          </h1>
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
                    <h2 style={{ fontSize: dept.name.length > 35 ? '14px' : '16px', fontWeight: 'bold', lineHeight: 1.25 }}>
                      {dept.name}
                    </h2>
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
