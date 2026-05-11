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

  const { data: sosRows } = await supabase
    .from('dept_ministers')
    .select('dept_slug, photo_url, member_id')
    .eq('is_secretary_of_state', true);
  const photoBySlug = new Map<string, string>(
    (sosRows || []).map((r: { dept_slug: string; photo_url: string | null }) => [r.dept_slug, r.photo_url || ''])
  );
  const memberIdBySlug = new Map<string, number>(
    (sosRows || [])
      .filter((r: { member_id: number | null }) => r.member_id != null)
      .map((r: { dept_slug: string; member_id: number }) => [r.dept_slug, r.member_id])
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="border-b border-[#333333] pb-10 mb-10">
          <p className="text-[13px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            The People&apos;s Chamber · Departments
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            Government Departments
          </h1>
          <p className="text-white text-[14px] leading-[1.7] max-w-2xl">
            What every department controls and where every party stands on the issues that matter to you. Tap any department for live ministers, agencies, and topic-by-topic positions.
          </p>

          <div className="grid grid-cols-3 gap-px border border-[#333333] mt-10">
            <Stat label="Departments" value={departments.length} />
            <Stat label="Control Zones" value={totalZones} />
            <Stat label="Live Data" value="Daily" accent />
          </div>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px border border-[#333333]">
          {departments.map((dept) => {
            const photo = photoBySlug.get(dept.slug);
            const memberId = memberIdBySlug.get(dept.slug);
            const ministerInner = (
              <div className="flex items-center gap-2">
                {photo ? (
                  <img
                    src={photo}
                    alt={dept.minister}
                    className="w-8 h-8 rounded-full object-cover bg-[#1a1a1a]"
                    style={{ border: `1px solid ${ACCENT}55` }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[13px] text-white"
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
              <li key={dept.slug} className="h-full border-l-2 border-transparent hover:border-l-[#ffffff] hover:bg-[#1a1a1a] transition-colors">
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
                        <span className="text-[13px] px-1.5 py-0.5 uppercase tracking-[0.1em] font-semibold rounded-sm text-white bg-[#1a1a1a] border border-[#333333]">
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
