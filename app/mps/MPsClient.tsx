'use client'

import { useState } from 'react'
import Link from 'next/link'

type MP = {
  id: number
  name: string
  party: string
  party_colour: string | null
  constituency: string
  photo_url: string | null
}

export default function MPsClient({ mps }: { mps: MP[] }) {
  const [search, setSearch] = useState('')

  const filteredMPs = mps.filter(mp =>
    mp.name.toLowerCase().includes(search.toLowerCase()) ||
    mp.constituency.toLowerCase().includes(search.toLowerCase()) ||
    mp.party.toLowerCase().includes(search.toLowerCase())
  )

  const mpsByParty = filteredMPs.reduce((acc: any, mp) => {
    const party = mp.party || 'Independent'
    if (!acc[party]) acc[party] = []
    acc[party].push(mp)
    return acc
  }, {})

  const parties = Object.keys(mpsByParty).sort((a, b) =>
    mpsByParty[b].length - mpsByParty[a].length
  )

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Members of Parliament</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          All current MPs in the House of Commons
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {filteredMPs.length} MPs • {parties.length} parties
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, constituency, or party..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {filteredMPs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No MPs found matching "{search}"</p>
        </div>
      ) : (
        <div className="space-y-8">
          {parties.map(party => (
            <div key={party}>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: mpsByParty[party][0]?.party_colour || '#6b7280' }}
                />
                {party} ({mpsByParty[party].length})
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mpsByParty[party].map((mp: MP) => (
                  <Link
                    key={mp.id}
                    href={`/mps/${mp.id}`}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {mp.photo_url ? (
                        <img
                          src={mp.photo_url}
                          alt={mp.name}
                          className="w-12 h-12 rounded-full object-cover bg-gray-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xs">
                          No Photo
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">{mp.name}</h3>
                        <p className="text-gray-400 text-xs truncate">{mp.constituency}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
