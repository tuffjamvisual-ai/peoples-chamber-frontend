'use client';

import { useState } from 'react';
import Navigation from '../components/Navigation';
import Link from 'next/link';
import { searchTopics } from '@/lib/search-index';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const results = searchTopics(query);

  return (
    <div className="min-h-screen bg-[#002633]">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
          <p className="text-[#c9c9c9] text-sm">Find where any issue is controlled and what every party says about it</p>
        </div>

        <div className="relative mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: knife crime, energy bills, small boats, income tax..."
            className="w-full bg-[#002633] border border-[#1c3849] rounded-xl px-5 py-4 text-white text-lg placeholder-[#7697a2] focus:outline-none focus:border-[#9bdd42]"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7697a2] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {query.length >= 2 && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#7697a2] text-lg mb-2">No results for "{query}"</p>
            <p className="text-[#7697a2] text-sm">Try a different term or browse departments directly</p>
            <Link href="/departments" className="inline-block mt-4 text-[#9bdd42] hover:underline text-sm">Browse all departments →</Link>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, i) => (
              <Link
                key={i}
                href={`/departments/${result.departmentSlug}?zone=${encodeURIComponent(result.zone)}`}
                className="block bg-[#002633] border border-[#1c3849] rounded-xl p-5 hover:border-[#9bdd42] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#7697a2] mb-1">{result.department}</div>
                    <div className="text-white font-semibold text-lg">{result.zone}</div>
                    <div className="text-[#7697a2] text-sm mt-1">See what every party says about this →</div>
                  </div>
                  <div className="text-[#9bdd42] text-2xl flex-shrink-0">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!query && (
          <div>
            <p className="text-[#7697a2] text-sm mb-4">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {['knife crime', 'small boats', 'nhs', 'energy bills', 'income tax', 'immigration', 'potholes', 'grooming gangs', 'inflation', 'mortgage', 'police', 'benefits'].map(term => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="px-3 py-1.5 bg-[#1c3849] text-[#c9c9c9] rounded-lg text-sm hover:bg-[#405b6b] transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
