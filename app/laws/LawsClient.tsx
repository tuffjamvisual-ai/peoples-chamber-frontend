'use client'

import { useState } from 'react'
import Link from 'next/link'

type Law = {
  id: number
  title: string
  description: string
  stage_date: string | null
  sponsor_name: string | null
  originating_house: string
}

export default function LawsClient({ laws }: { laws: Law[] }) {
  const [search, setSearch] = useState('')

  const filteredLaws = laws.filter(law =>
    law.title.toLowerCase().includes(search.toLowerCase()) ||
    law.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Laws</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Bills that have received Royal Assent and become law
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {filteredLaws.length} laws found
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search laws..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {filteredLaws.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {search ? `No laws found matching "${search}"` : 'No laws found with Royal Assent status'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredLaws.map((law) => (
            <Link
              key={law.id}
              href={`/bills/${law.id}`}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold text-base sm:text-lg text-white mb-3 line-clamp-2">
                {law.title}
              </h3>
              
              <p className="text-gray-400 text-xs sm:text-sm mb-4 line-clamp-3">
                {law.description}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{law.originating_house}</span>
                {law.stage_date && (
                  <span>{new Date(law.stage_date).toLocaleDateString()}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
