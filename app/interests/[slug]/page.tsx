'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

type Interest = {
  category: string;
  summary: string;
  detail: string;
  registered_date: string | null;
};

type Category = { name: string; items: Interest[] };

type InterestsData = {
  slug: string;
  memberId: number | null;
  categories: Category[];
};

type Person = { name: string };

export default function InterestsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<InterestsData | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/mp-interests?slug=${slug}`).then(r => r.json()).catch(() => null),
      fetch(`/api/person?slug=${slug}`).then(r => r.json()).catch(() => null),
    ]).then(([interests, pers]) => {
      setData(interests);
      if (pers && pers.name) setPerson(pers);
      setLoading(false);
    });
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-200">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 pt-4">
        <Link
          href={`/people/${slug}`}
          className="inline-block text-sm mb-8"
          style={{ color: '#d4af37' }}
        >
          ← Back to {person?.name || 'profile'}
        </Link>

        <h1 className="text-3xl font-semibold text-white mb-2">
          {person?.name || slug}
        </h1>
        <p className="text-sm text-gray-400 mb-10" style={{ color: '#d4af37' }}>
          Register of Financial Interests
        </p>

        {loading && <div className="text-gray-500 text-sm">Loading…</div>}

        {!loading && (!data || data.categories.length === 0) && (
          <div className="text-gray-500 text-sm">No registered interests found.</div>
        )}

        {!loading && data && data.categories.length > 0 && (
          <div className="space-y-12">
            {data.categories.map(cat => (
              <section key={cat.name}>
                <h2
                  className="text-lg font-medium mb-4 pb-2 border-b"
                  style={{ color: '#d4af37', borderColor: '#d4af37' }}
                >
                  {cat.name}
                </h2>
                <ul className="space-y-6">
                  {cat.items.map((it, i) => (
                    <li key={i}>
                      <div className="text-gray-100 leading-relaxed">{it.summary}</div>
                      {it.detail && (
                        <div className="text-sm text-gray-400 whitespace-pre-wrap mt-2 leading-relaxed">
                          {it.detail}
                        </div>
                      )}
                      {it.registered_date && (
                        <div className="text-xs text-gray-500 mt-2">
                          Registered {new Date(it.registered_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
