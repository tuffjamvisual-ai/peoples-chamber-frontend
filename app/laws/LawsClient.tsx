'use client'

import { useState } from 'react'
import Link from 'next/link'

type Law = {
  id: number
  title: string
  plain_summary: string | null
  last_update: string | null
  sponsor_name: string | null
  sponsor_party: string | null
  sponsor_party_colour: string | null
  originating_house: string
}

export default function LawsClient({ laws }: { laws: Law[] }) {
  const [search, setSearch] = useState('')

  const filteredLaws = laws.filter(law =>
    law.title.toLowerCase().includes(search.toLowerCase()) ||
    (law.plain_summary && law.plain_summary.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="px-2 sm:px-4 py-4 sm:py-6">
      <header className="border-b border-[#1a1410]/20 pb-4 mb-6">
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#1a1410] leading-tight">
          Laws
        </h1>
        <p className="text-[#4a3d2f] text-sm sm:text-base mt-2">
          Bills that have received Royal Assent and become law
        </p>
        <p className="text-xs uppercase tracking-[0.25em] text-[#4a3d2f] mt-3">
          {filteredLaws.length} {filteredLaws.length === 1 ? 'law' : 'laws'} found
        </p>
      </header>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search laws..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-[60%] px-4 py-2 bg-[#f4e8d4] text-[#1a1410] rounded-sm border border-[#1a1410]/30 placeholder:text-[#4a3d2f]/60 focus:border-[#1c4c78] focus:outline-none"
        />
      </div>

      {filteredLaws.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#4a3d2f]">
            {search ? `No laws found matching "${search}"` : 'No laws found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredLaws.map((law) => (
            <Link
              key={law.id}
              href={`/bills/${law.id}`}
              className="bg-[#f4e8d4]/50 border border-[#1a1410]/20 rounded-sm p-4 sm:p-5 hover:border-[#7a1612] hover:bg-[#f4e8d4]/80 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2 py-0.5 bg-[#7a1612] text-[#f4e8d4] rounded-sm uppercase tracking-[0.18em] font-semibold">
                  ✓ Law
                </span>
                {law.originating_house && (
                  <span className="text-[11px] text-[#4a3d2f] uppercase tracking-[0.18em]">
                    {law.originating_house}
                  </span>
                )}
              </div>

              <h3 className="font-serif font-bold text-base sm:text-lg text-[#1a1410] mb-3 line-clamp-2 leading-snug">
                {law.title}
              </h3>

              {law.plain_summary && (
                <p className="text-[#4a3d2f] text-sm mb-4 line-clamp-3 flex-1 leading-relaxed">
                  {law.plain_summary}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-[#4a3d2f] mt-auto pt-2 border-t border-[#1a1410]/10">
                {law.sponsor_name && (
                  <span className="flex items-center gap-1.5">
                    {law.sponsor_party && (
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: `#${law.sponsor_party_colour}` || '#7697a2' }}
                      />
                    )}
                    <span className="truncate max-w-[140px]">{law.sponsor_name}</span>
                  </span>
                )}
                {law.last_update && (
                  <span className="font-mono">
                    {new Date(law.last_update).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
