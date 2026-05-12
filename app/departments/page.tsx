import type { Metadata } from 'next';
import { departments } from '@/lib/departments';
import { supabase } from '@/lib/supabase';
import Navigation from '../components/Navigation';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Departments',
  description:
    'Explore all 24 UK government departments, their ministers, control zones and what every party says about each topic.',
  alternates: { canonical: '/departments' },
};

export const revalidate = 3600;

const ACCENT = '#ffffff';

export default async function DepartmentsPage() {
  const totalZones = departments.reduce((sum, d) => sum + d.controlZones.length, 0);

  // dept_ministers has photo_url and member_id largely empty; resolve from mps by
  // normalised name match. Lords/Baronesses won't resolve (not in mps).
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
    <div className="min-h-screen bg-[#505050] text-white">
      <Navigation />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="border-b border-[#5a5a5a] pb-10 mb-10">
          <p className="text-[13px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            The People&apos;s Chamber · Departments
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            Government Departments
          </h1>
          <p className="text-white text-[14px] leading-[1.7] max-w-2xl">
            What every department controls and where every party stands on the issues that matter to you. Tap any department for live ministers, agencies, and topic-by-topic positions.
          </p>

          <div className="grid grid-cols-3 gap-px border border-[#5a5a5a] mt-10">
            <Stat label="Departments" value={departments.length} />
            <Stat label="Control Zones" value={totalZones} />
            <Stat label="Live Data" value="Daily" accent />
          </div>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px border border-[#5a5a5a]">
          {departments.map((dept) => {
            const photo = photoBySlug.get(dept.slug);
            const memberId = memberIdBySlug.get(dept.slug);
            const ministerInner = (
              <div className="flex items-center gap-2">
                {photo ? (
                  <img
                    src={photo}
                    alt={dept.minister}
                    className="w-8 h-8 rounded-full object-cover bg-[#505050]"
                    style={{ border: `1px solid ${ACCENT}55` }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-[#505050] flex items-center justify-center text-[13px] text-white"
                    style={{ border: `1px solid ${ACCENT}55` }}
                  >
                    {dept.minister.charAt(0)}
                  </div>
                )}
                <span className={`text-[14px] truncate font-mono ${memberId ? 'text-white hover:text-[#ffffff] hover:underline' : 'text-white'}`}>
                  {dept.minister}
                </span>
              </div>
            );

            return (
              <li key={dept.slug} className="h-full border-l-2 border-transparent hover:border-l-[#ffffff] hover:bg-[#505050] transition-colors">
                <div className="flex flex-col h-full">
                  <Link href={`/departments/${dept.slug}`} className="block px-5 pt-5">
                    <h2 className="text-white font-bold text-[14px] leading-snug mb-1.5 hover:text-[#ffffff] transition-colors">
                      {dept.name}
                    </h2>
                    <p className="text-white text-[15px] leading-[1.7] mb-4 line-clamp-2">{dept.description}</p>
                  </Link>

                  {memberId ? (
                    <Link href={`/mps/${memberId}`} className="block px-5 mb-3" aria-label={`View bio for ${dept.minister}`}>
                      {ministerInner}
                    </Link>
                  ) : (
                    <div className="px-5 mb-3">{ministerInner}</div>
                  )}

                  <Link href={`/departments/${dept.slug}`} className="block px-5 pb-5 mt-auto">
                    <div className="flex flex-wrap gap-1">
                      {dept.controlZones.slice(0, 3).map((zone) => (
                        <span
                          key={zone}
                          className="text-[13px] px-1.5 py-0.5 uppercase tracking-[0.1em] font-semibold rounded-sm"
                          style={{ color: ACCENT, backgroundColor: ACCENT + '15', border: `1px solid ${ACCENT}33` }}
                        >
                          {zone}
                        </span>
                      ))}
                      {dept.controlZones.length > 3 && (
                        <span className="text-[13px] px-1.5 py-0.5 uppercase tracking-[0.1em] font-semibold rounded-sm text-white bg-[#505050] border border-[#5a5a5a]">
                          +{dept.controlZones.length - 3}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="px-4 py-5">
      <p className="text-[13px] uppercase tracking-[0.25em] text-white font-medium mb-2">{label}</p>
      <p
        className={`text-3xl sm:text-4xl font-black leading-none tracking-tight ${accent ? 'text-[#ffffff]' : 'text-white'}`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
