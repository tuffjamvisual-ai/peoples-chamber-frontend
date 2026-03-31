import { departments } from '@/lib/departments';
import Navigation from '../components/Navigation';
import Link from 'next/link';

export default function DepartmentsPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Government Departments</h1>
          <p className="text-gray-400">Find out what each department controls and where every party stands on the issues that matter to you.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {departments.map((dept) => (
            <Link
              key={dept.slug}
              href={`/departments/${dept.slug}`}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500 transition-colors"
            >
              <h2 className="text-white font-semibold text-sm mb-1">{dept.name}</h2>
              <p className="text-gray-500 text-xs mb-3 line-clamp-2">{dept.description}</p>
              <div className="flex items-center gap-2">
                {dept.ministerPhoto ? (
                  <img src={dept.ministerPhoto} alt={dept.minister} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                    {dept.minister.charAt(0)}
                  </div>
                )}
                <span className="text-xs text-gray-400">{dept.minister}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {dept.controlZones.slice(0, 3).map((zone) => (
                  <span key={zone} className="text-xs px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded">{zone}</span>
                ))}
                {dept.controlZones.length > 3 && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">+{dept.controlZones.length - 3}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
