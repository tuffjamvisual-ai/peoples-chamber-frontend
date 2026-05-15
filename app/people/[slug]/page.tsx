// Server-rendered. Reads from person_cache (populated nightly by
// /api/sync-person-cache) with a dept_ministers fallback for new
// appointees not yet cached. Previous version was a client component
// that fetched data in useEffect after mount — caused a loading flash
// and shipped empty HTML to crawlers.

import { supabase } from '@/lib/supabase';
import Navigation from '../../components/Navigation';
import Link from 'next/link';
import InterestsLoader from './InterestsLoader';

export const revalidate = 3600;

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
};

async function getPerson(slug: string): Promise<Person | null> {
  const [{ data: cached }, { data: ministerRow }] = await Promise.all([
    supabase
      .from('person_cache')
      .select('name, photo, current_roles, past_roles')
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
    };
  }

  // Cache miss — minimal record from dept_ministers if available.
  if (ministerRow) {
    return {
      name: ministerRow.name || '',
      photo: ministerRow.photo_url || '',
      currentRoles: [],
      pastRoles: [],
    };
  }

  return null;
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = await getPerson(slug);

  return (
    <div className="min-h-screen bg-[#606060]">
      <Navigation />
      <main className="bg-[#505050] shadow-[0_0_40px_rgba(0,0,0,0.4)] max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <Link href="/departments" className="inline-flex items-center gap-2 text-white hover:text-white mb-6 text-sm">
          ← Back to Departments
        </Link>

        {!person && <div className="text-white text-sm">Person not found.</div>}

        {person && (
          <>
            {/* Header */}
            <div className="bg-[#505050] border border-[#5a5a5a] rounded-xl p-6 mb-6 flex items-start gap-6">
              {person.photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={person.photo}
                  alt={person.name}
                  className="w-32 h-32 rounded-full object-cover border-2 border-[#5a5a5a] flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[#404040] flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
                  {person.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{person.name}</h1>
                {person.currentRoles.length > 0 && (
                  <p className="text-[#c9c9c9] text-sm">{person.currentRoles[0].title}</p>
                )}
              </div>
            </div>

            {/* Current Roles */}
            {person.currentRoles.length > 0 && (
              <div className="bg-[#505050] border border-[#5a5a5a] rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Current Role{person.currentRoles.length > 1 ? 's' : ''}
                </h2>
                {person.currentRoles.map((role, i) => (
                  <div key={i} className="mb-4 last:mb-0">
                    <div className="text-white font-medium">{role.title}</div>
                    <div className="text-white text-sm">{role.organisation}</div>
                    {role.startDate && (
                      <div className="text-white text-sm mt-0.5">
                        Since {new Date(role.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </div>
                    )}
                    {role.body && (
                      <div
                        className="text-[#c9c9c9] text-sm mt-3 leading-relaxed prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: role.body }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <InterestsLoader slug={slug} />

            {/* Past Roles */}
            {person.pastRoles.length > 0 && (
              <div className="bg-[#505050] border border-[#5a5a5a] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Previous Roles</h2>
                <div className="divide-y divide-[#404040]">
                  {person.pastRoles.map((role, i) => (
                    <div key={i} className="py-3">
                      <div className="text-white text-sm font-medium">{role.title}</div>
                      <div className="text-white text-sm">{role.organisation}</div>
                      {role.startDate && role.endDate && (
                        <div className="text-white text-sm mt-0.5">
                          {new Date(role.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          {' — '}
                          {new Date(role.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
