'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type MP = {
  id: number
  member_id: number
  name: string
  party: string
  party_colour: string | null
  constituency: string
  photo_url: string | null
}

export default function MPsClient({ mps }: { mps: MP[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return mps
    const q = search.toLowerCase()
    return mps.filter(
      (mp) =>
        mp.name.toLowerCase().includes(q) ||
        mp.constituency.toLowerCase().includes(q) ||
        mp.party.toLowerCase().includes(q),
    )
  }, [mps, search])

  const byParty = useMemo(() => {
    const acc: Record<string, MP[]> = {}
    for (const mp of filtered) {
      const p = mp.party || 'Independent'
      ;(acc[p] ||= []).push(mp)
    }
    return acc
  }, [filtered])

  const parties = Object.keys(byParty).sort(
    (a, b) => byParty[b].length - byParty[a].length,
  )

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <header className="border-b border-[#1c3849] pb-10 mb-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#ffffff] font-medium mb-4">
          The People&apos;s Chamber · Members
        </p>
        <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
          Members of Parliament
        </h1>
        <p className="text-[#7697a2] text-[14px] leading-[1.7] max-w-2xl">
          All {mps.length.toLocaleString()} sitting MPs in the House of Commons.
          Search by name, constituency, or party. Tap an MP for voting record,
          financial interests, sponsored bills, and contact details.
        </p>

        <div className="grid grid-cols-3 gap-px border border-[#1c3849] mt-10">
          <Stat label="Sitting MPs" value={mps.length} />
          <Stat label="Parties Represented" value={parties.length} />
          <Stat label="Filtered Result" value={filtered.length} accent />
        </div>
      </header>

      <div className="mb-12">
        <label
          htmlFor="mp-search"
          className="block text-[10px] uppercase tracking-[0.25em] text-[#7697a2] font-medium mb-2"
        >
          Search
        </label>
        <input
          id="mp-search"
          type="search"
          placeholder="Name, constituency, or party…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1c3849] text-white text-sm leading-[1.7] border border-[#1c3849] rounded-sm px-4 py-3 placeholder:text-[#7697a2] focus:outline-none focus:border-[#ffffff] transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[#7697a2] text-sm border-t border-[#1c3849] pt-10">
          No MPs match &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <div className="space-y-16">
          {parties.map((party) => {
            const partyColour = byParty[party][0]?.party_colour || '#ffffff'
            const count = byParty[party].length
            return (
              <section key={party} className="border-t border-[#1c3849] pt-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: partyColour }}
                    aria-hidden
                  />
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {party}
                  </h2>
                  <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-[#7697a2] font-mono">
                    {count} MP{count === 1 ? '' : 's'}
                  </span>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-[#1c3849]">
                  {byParty[party].map((mp) => (
                    <li key={mp.id} className="bg-[#001520]">
                      <Link
                        href={`/mps/${mp.member_id}`}
                        className="group flex items-start gap-3 bg-[#002633] hover:bg-[#001520] transition-colors p-4 border-l-2 border-transparent hover:border-l-[#ffffff]"
                      >
                        {mp.photo_url ? (
                          <img
                            src={mp.photo_url}
                            alt={mp.name}
                            className="w-12 h-12 rounded-full object-cover bg-[#001520] flex-shrink-0"
                            style={{ border: `1px solid ${partyColour}` }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full bg-[#001520] flex items-center justify-center text-[#7697a2] text-[10px] uppercase tracking-wider flex-shrink-0"
                            style={{ border: `1px solid ${partyColour}` }}
                          >
                            {mp.name?.charAt(0)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-[14px] leading-snug truncate group-hover:text-[#ffffff] transition-colors">
                            {mp.name}
                          </h3>
                          <p className="text-[#7697a2] text-[12px] leading-[1.7] truncate">
                            {mp.constituency}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="px-4 py-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#7697a2] font-medium mb-2">
        {label}
      </p>
      <p
        className={`text-3xl sm:text-4xl font-black leading-none tracking-tight ${
          accent ? 'text-[#ffffff]' : 'text-white'
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  )
}
