import type { Metadata } from 'next';
import { departments } from '@/lib/departments';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ScrollToTopButton from '../components/ScrollToTopButton';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: 'Departments',
  description:
    'Explore all 24 UK government departments, their ministers, control zones and what every party says about each topic.',
  alternates: { canonical: '/departments' },
};

// Render on demand, then cache at the edge for 1 hour via revalidate.
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
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: ink, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Government Departments
        </h1>
      </header>

      <ul style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
                      style={{ width: '84px', height: '96px', background: '#d6cdb8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: ink }}
                    >
                      {dept.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, paddingTop: '6px', minWidth: 0 }}>
                  <h2 style={{ fontSize: dept.name.length > 35 ? '15px' : '17px', fontWeight: 'bold', lineHeight: 1.25 }}>
                    {dept.name}
                  </h2>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <ScrollToTopButton />
    </DossierShell>
  );
}
