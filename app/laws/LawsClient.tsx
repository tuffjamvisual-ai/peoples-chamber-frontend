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
    <div className="magazine-section">
      <input
        type="search"
        className="magazine-search"
        placeholder="Search laws by title or summary…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search laws"
      />

      <p className="magazine-meta">
        {filteredLaws.length} {filteredLaws.length === 1 ? 'law' : 'laws'} found
      </p>

      {filteredLaws.length === 0 ? (
        <div className="magazine-callout">
          <strong>No matches</strong>
          {search ? `Nothing found for "${search}". Try a broader query.` : 'No laws found.'}
        </div>
      ) : (
        <div className="magazine-grid">
          {filteredLaws.map((law) => (
            <Link
              key={law.id}
              href={`/bills/${law.id}`}
              className="magazine-card"
            >
              <p className="magazine-kicker">
                ✓ Law
                {law.originating_house && ` · ${law.originating_house}`}
              </p>

              <h3 className="magazine-title">{law.title}</h3>

              {law.plain_summary && (
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.45, opacity: 0.8 }}>
                  {law.plain_summary.length > 180
                    ? law.plain_summary.slice(0, 180).trimEnd() + '…'
                    : law.plain_summary}
                </p>
              )}

              <div className="magazine-meta">
                {law.sponsor_name && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {law.sponsor_party && (
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: law.sponsor_party_colour
                            ? `#${law.sponsor_party_colour}`
                            : '#7697a2',
                        }}
                      />
                    )}
                    <span>{law.sponsor_name}</span>
                  </span>
                )}
                {law.last_update && (
                  <span style={{ float: 'right' }}>
                    {new Date(law.last_update).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
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
