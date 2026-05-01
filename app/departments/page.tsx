import type { Metadata } from 'next';
import { departments } from '@/lib/departments';
import Navigation from '../components/Navigation';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Departments',
  description:
    'Explore all 24 UK government departments, their ministers, control zones and what every party says about each topic.',
  alternates: { canonical: '/departments' },
};

const ACCENT = '#ffffff';

export default function DepartmentsPage() {
  const totalZones = departments.reduce((sum, d) => sum + d.controlZones.length, 0);

  return (
    <div className="min-h-screen bg-[#001520] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="border-b border-[#1c3849] pb-10 mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            The People&apos;s Chamber · Departments
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            Government Departments
          </h1>
          <p className="text-[#7697a2] text-[14px] leading-[1.7] max-w-2xl">
            What every department controls and where every party stands on the issues that matter to you. Tap any department for live ministers, agencies, and topic-by-topic positions.
          </p>

          <div className="grid grid-cols-3 gap-px border border-[#1c3849] mt-10">
            <Stat label="Departments" value={departments.length} />
            <Stat label="Control Zones" value={totalZones} />
            <Stat label="Live Data" value="Daily" accent />
          </div>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px border border-[#1c3849]">
          {departments.map((dept) => (
            <li key={dept.slug} className="">
              <Link
                href={`/departments/${dept.slug}`}
                className="group block h-full p-5 hover:bg-[#001520] transition-colors border-l-2 border-transparent hover:border-l-[#ffffff]"
              >
                <h2 className="text-white font-bold text-[14px] leading-snug mb-1.5 group-hover:text-[#ffffff] transition-colors">
                  {dept.name}
                </h2>
                <p className="text-[#7697a2] text-[12px] leading-[1.7] mb-4 line-clamp-2">{dept.description}</p>

                <div className="flex items-center gap-2 mb-3">
                  {dept.ministerPhoto ? (
                    <img
                      src={dept.ministerPhoto}
                      alt={dept.minister}
                      className="w-6 h-6 rounded-full object-cover bg-[#001520]"
                      style={{ border: `1px solid ${ACCENT}55` }}
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full bg-[#001520] flex items-center justify-center text-[10px] text-[#7697a2]"
                      style={{ border: `1px solid ${ACCENT}55` }}
                    >
                      {dept.minister.charAt(0)}
                    </div>
                  )}
                  <span className="text-[11px] text-[#7697a2] truncate font-mono">{dept.minister}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {dept.controlZones.slice(0, 3).map((zone) => (
                    <span
                      key={zone}
                      className="text-[10px] px-1.5 py-0.5 uppercase tracking-[0.1em] font-semibold rounded-sm"
                      style={{ color: ACCENT, backgroundColor: ACCENT + '15', border: `1px solid ${ACCENT}33` }}
                    >
                      {zone}
                    </span>
                  ))}
                  {dept.controlZones.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 uppercase tracking-[0.1em] font-semibold rounded-sm text-[#7697a2] bg-[#001520] border border-[#1c3849]">
                      +{dept.controlZones.length - 3}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="px-4 py-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#7697a2] font-medium mb-2">{label}</p>
      <p
        className={`text-3xl sm:text-4xl font-black leading-none tracking-tight ${accent ? 'text-[#ffffff]' : 'text-white'}`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
