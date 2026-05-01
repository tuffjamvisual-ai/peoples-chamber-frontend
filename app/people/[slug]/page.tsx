'use client';

import { useState, use, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import Link from 'next/link';

type PersonData = {
  name: string;
  photo: string;
  currentRoles: { title: string; organisation: string; startDate: string; body: string }[];
  pastRoles: { title: string; organisation: string; startDate: string; endDate: string }[];
};

type Interest = {
  summary: string;
  detail: string;
  registered_date: string | null;
};

type InterestCategory = { name: string; items: Interest[] };

export default function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [person, setPerson] = useState<PersonData | null>(null);
  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/person?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setPerson(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    fetch(`/api/mp-interests?slug=${slug}`)
      .then(r => r.json())
      .then(d => setInterests(d.categories || []))
      .catch(() => {});
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <Link href="/departments" className="inline-flex items-center gap-2 text-white hover:text-white mb-6 text-sm">
          ← Back to Departments
        </Link>

        {loading && (
          <div className="text-white text-sm">Loading...</div>
        )}

        {!loading && !person && (
          <div className="text-white text-sm">Person not found.</div>
        )}

        {person && (
          <>
            {/* Header */}
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 mb-6 flex items-start gap-6">
              {person.photo ? (
                <img src={person.photo} alt={person.name}
                  className="w-32 h-32 rounded-full object-cover border-2 border-[#2e2e2e] flex-shrink-0" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[#2e2e2e] flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
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
              <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Current Role{person.currentRoles.length > 1 ? 's' : ''}</h2>
                {person.currentRoles.map((role, i) => (
                  <div key={i} className="mb-4 last:mb-0">
                    <div className="text-white font-medium">{role.title}</div>
                    <div className="text-white text-sm">{role.organisation}</div>
                    {role.startDate && (
                      <div className="text-white text-sm mt-0.5">Since {new Date(role.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
                    )}
                    {role.body && (
                      <div className="text-[#c9c9c9] text-sm mt-3 leading-relaxed prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: role.body }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Financial Interests — flat layout, gold category headings, sits on page bg */}
            {interests.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Financial Interests</h2>
                {interests.map((cat) => (
                  <div key={cat.name} className="mb-6 last:mb-0">
                    <h3 className="text-sm font-semibold mb-2" style={{ color: '#ffffff' }}>
                      {cat.name}
                    </h3>
                    <ul className="space-y-2">
                      {cat.items.map((item, i) => (
                        <li key={i} className="text-[#c9c9c9] text-sm leading-relaxed">
                          <div>{item.summary}</div>
                          {item.detail && item.detail !== item.summary && (
                            <div className="text-white text-sm mt-1 whitespace-pre-line">{item.detail}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Past Roles */}
            {person.pastRoles.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Previous Roles</h2>
                <div className="divide-y divide-[#2e2e2e]">
                  {person.pastRoles.map((role, i) => (
                    <div key={i} className="py-3">
                      <div className="text-white text-sm font-medium">{role.title}</div>
                      <div className="text-white text-sm">{role.organisation}</div>
                      {role.startDate && role.endDate && (
                        <div className="text-white text-sm mt-0.5">
                          {new Date(role.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} — {new Date(role.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
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
