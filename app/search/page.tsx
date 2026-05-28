'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchTopics } from '@/lib/search-index';
import DossierShell from '../components/DossierShell';

const INK = '#14100d';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const results = searchTopics(query);

  return (
    <DossierShell>
      <a
        href="/"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← Back to home
      </a>

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Search
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Find where any issue is controlled and what every party says about it.
        </p>
      </header>

      <div className="relative mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: knife crime, energy bills, small boats, income tax..."
          className="w-full bg-[#14100d]/5 border border-[#14100d]/20 rounded-xl px-5 py-4 text-[#14100d] text-lg placeholder:text-[#14100d]/40 focus:outline-none focus:border-[#14100d]"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#14100d] hover:text-[#14100d]"
          >
            ✕
          </button>
        )}
      </div>

      {query.length >= 2 && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#14100d] text-lg mb-2">No results for "{query}"</p>
          <p className="text-[#14100d] text-sm">Try a different term or browse departments directly</p>
          <Link href="/departments" className="inline-block mt-4 text-[#6b2417] hover:underline text-sm">Browse all departments →</Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, i) => (
            <Link
              key={i}
              href={`/departments/${result.departmentSlug}?zone=${encodeURIComponent(result.zone)}`}
              className="block border border-[#14100d]/20 rounded-xl p-5 hover:border-[#14100d] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-[#14100d] mb-1">{result.department}</div>
                  <div className="text-[#14100d] font-semibold text-lg">{result.zone}</div>
                  <div className="text-[#14100d] text-sm mt-1">See what every party says about this →</div>
                </div>
                <div className="text-[#6b2417] text-2xl flex-shrink-0">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!query && (
        <div>
          <p className="text-[#14100d] text-sm mb-4">Popular searches:</p>
          <div className="flex flex-wrap gap-2">
            {['knife crime', 'small boats', 'nhs', 'energy bills', 'income tax', 'immigration', 'potholes', 'grooming gangs', 'inflation', 'mortgage', 'police', 'benefits'].map(term => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3 py-1.5 bg-[#14100d]/5 text-[#14100d]/40 rounded-lg text-sm hover:bg-[#14100d]/10 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </DossierShell>
  );
}
