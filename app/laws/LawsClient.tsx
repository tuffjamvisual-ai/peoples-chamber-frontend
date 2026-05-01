'use client'

import { useState } from 'react'
import Link from 'next/link'

type Law = {
  id: number
  title: string
  description: string
  plain_summary: string | null
  stage_date: string | null
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Laws</h1>
        <p className="text-gray-200 text-sm sm:text-base">
          Bills that have received Royal Assent and become law
        </p>
        <p className="text-sm text-gray-200 mt-2">
          {filteredLaws.length} laws found
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search laws..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#4a7a3a] focus:outline-none"
        />
      </div>

      {filteredLaws.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-200">
            {search ? `No laws found matching "${search}"` : 'No laws found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredLaws.map((law) => (
            <Link
              key={law.id}
              href={`/bills/${law.id}`}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:border-[#4a7a3a] transition-colors flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-300 rounded border border-green-800/40">
                  ✓ Law
                </span>
                {law.originating_house && (
                  <span className="text-xs text-gray-200">{law.originating_house}</span>
                )}
              </div>

              <h3 className="font-semibold text-base text-white mb-3 line-clamp-2">
                {law.title}
              </h3>

              {law.plain_summary && (
                <p className="text-gray-200 text-xs mb-4 line-clamp-3 flex-1">
                  {law.plain_summary}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-200 mt-auto">
                {law.sponsor_name && (
                  <span className="flex items-center gap-1">
                    {law.sponsor_party && (
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: `#${law.sponsor_party_colour}` || '#6b7280' }}
                      />
                    )}
                    {law.sponsor_name}
                  </span>
                )}
                {law.last_update && (
                  <span>{new Date(law.last_update).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
