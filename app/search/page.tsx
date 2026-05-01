'use client';

import { useState } from 'react';
import Navigation from '../components/Navigation';
import Link from 'next/link';
import { searchTopics } from '@/lib/search-index';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const results = searchTopics(query);

  return (
    <div className="min-h-screen bg-[#0a140a]">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
          <p className="text-gray-300 text-sm">Find where any issue is controlled and what every party says about it</p>
        </div>

        <div className="relative mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: knife crime, energy bills, small boats, income tax..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-[#6b9e3e]"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-200 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {query.length >= 2 && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-200 text-lg mb-2">No results for "{query}"</p>
            <p className="text-gray-200 text-sm">Try a different term or browse departments directly</p>
            <Link href="/departments" className="inline-block mt-4 text-[#6b9e3e] hover:underline text-sm">Browse all departments →</Link>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, i) => (
              <Link
                key={i}
                href={`/departments/${result.departmentSlug}?zone=${encodeURIComponent(result.zone)}`}
                className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-[#6b9e3e] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-gray-200 mb-1">{result.department}</div>
                    <div className="text-white font-semibold text-lg">{result.zone}</div>
                    <div className="text-gray-200 text-sm mt-1">See what every party says about this →</div>
                  </div>
                  <div className="text-[#6b9e3e] text-2xl flex-shrink-0">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!query && (
          <div>
            <p className="text-gray-200 text-sm mb-4">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {['knife crime', 'small boats', 'nhs', 'energy bills', 'income tax', 'immigration', 'potholes', 'grooming gangs', 'inflation', 'mortgage', 'police', 'benefits'].map(term => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
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
