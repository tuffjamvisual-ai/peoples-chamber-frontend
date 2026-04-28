'use client'

import { useMemo, useState } from 'react'

type Row = Record<string, unknown>

interface Props {
  rows: Row[]
  sectionTitle: string
}

// Pick the most "title-like" field to use as each row's headline.
// Person-identifying fields take priority over institutional fields when
// both are present (e.g. on revolving_door rows the person_name is the
// natural headline, not the organisation).
// Falls back to the first string field if none of the preferred keys exist.
const TITLE_KEYS = [
  // Explicit headline fields
  'title', 'name', 'subject',
  // Person-identifying fields (preferred over institutional when both exist)
  'person_name', 'mp_name', 'donor_name', 'lobbyist_name', 'minister_name', 'minister', 'donor',
  // Institutional fields
  'organisation', 'organisation_name', 'company', 'company_name', 'group_name',
]

const HIDE_KEYS = new Set(['id', 'created_at', 'updated_at', 'inserted_at'])
const DATE_KEYS = ['date', 'meeting_date', 'received_date', 'awarded_date', 'reported_date', 'registered_date', 'departure_date']

function pickTitle(row: Row): { key: string | null; value: string } {
  for (const k of TITLE_KEYS) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return { key: k, value: v }
  }
  for (const [k, v] of Object.entries(row)) {
    if (HIDE_KEYS.has(k)) continue
    if (typeof v === 'string' && v.trim()) return { key: k, value: v }
  }
  return { key: null, value: '(untitled)' }
}

function pickDate(row: Row): string | null {
  for (const k of DATE_KEYS) {
    const v = row[k]
    if (typeof v === 'string' && v) return v
  }
  return null
}

function formatValue(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

export default function TransparencyClient({ rows, sectionTitle }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((row) =>
      Object.values(row).some((v) => formatValue(v).toLowerCase().includes(q))
    )
  }, [rows, query])

  if (rows.length === 0) {
    return (
      <p className="text-gray-400 text-sm leading-relaxed">
        No records have been synced into the {sectionTitle.toLowerCase()} table yet. The page will populate once the sync job runs.
      </p>
    )
  }

  return (
    <>
      <div className="mb-6">
        <input
          type="search"
          placeholder={`Search ${rows.length.toLocaleString()} records…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md bg-[#0a0f1a] border border-gray-800 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-gray-600"
        />
        {query && (
          <p className="text-gray-500 text-xs mt-2">
            {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} matching
          </p>
        )}
      </div>

      <ul className="divide-y divide-gray-800">
        {filtered.map((row, i) => {
          const { key: titleKey, value: titleValue } = pickTitle(row)
          const dateValue = pickDate(row)
          const otherEntries = Object.entries(row).filter(
            ([k, v]) =>
              k !== titleKey &&
              !HIDE_KEYS.has(k) &&
              v !== null &&
              v !== '' &&
              !(typeof v === 'string' && v.trim() === '')
          )

          return (
            <li key={i} className="py-4">
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <h3 className="text-white text-base font-medium leading-snug">{titleValue}</h3>
                {dateValue && <span className="text-gray-500 text-xs whitespace-nowrap font-mono">{dateValue}</span>}
              </div>
              {otherEntries.length > 0 && (
                <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
                  {otherEntries.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-gray-500 font-mono">{k}</dt>
                      <dd className="text-gray-300 whitespace-pre-line break-words">{formatValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
