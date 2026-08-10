'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import BillCoverCard from '../components/BillCoverCard'
import Pagination from '../components/Pagination'

type Law = {
  id: number
  parliament_id?: number | null
  title: string
  plain_summary: string | null
  description?: string | null
  current_stage?: string | null
  last_update: string | null
  stage_date?: string | null
  sponsor_name: string | null
  sponsor_party: string | null
  sponsor_party_colour: string | null
  originating_house: string
  vote_count_yes?: number | null
  vote_count_no?: number | null
  vote_count_abstain?: number | null
  commons_ayes?: number | null
  commons_noes?: number | null
  is_act?: boolean | null
}

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.7)'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const CREAM = '#ebe5d8'
const ACCENT = '#7a1612'

const LAWS_PER_PAGE = 20

export default function LawsClient({ laws }: { laws: Law[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')

  const filteredLaws = useMemo(() => {
    if (!search) return laws
    const q = search.toLowerCase()
    return laws.filter(
      (law) =>
        law.title.toLowerCase().includes(q) ||
        (law.plain_summary && law.plain_summary.toLowerCase().includes(q))
    )
  }, [laws, search])

  const totalPages = Math.max(1, Math.ceil(filteredLaws.length / LAWS_PER_PAGE))
  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const currentPage = Math.min(Math.max(1, Number.isFinite(rawPage) ? rawPage : 1), totalPages)

  // Keep URL in sync when the active page falls out of the new filter
  // range (e.g. user on page 5, types a query that narrows to 2 pages).
  useEffect(() => {
    if (rawPage > totalPages) {
      router.replace(totalPages === 1 ? pathname : `${pathname}?page=${totalPages}`)
    }
  }, [rawPage, totalPages, pathname, router])

  const paginated = filteredLaws.slice(
    (currentPage - 1) * LAWS_PER_PAGE,
    currentPage * LAWS_PER_PAGE
  )

  const firstShown = filteredLaws.length === 0 ? 0 : (currentPage - 1) * LAWS_PER_PAGE + 1
  const lastShown = Math.min(currentPage * LAWS_PER_PAGE, filteredLaws.length)

  const hrefFor = (p: number) => (p <= 1 ? pathname : `${pathname}?page=${p}`)

  function handleSearchChange(value: string) {
    setSearch(value)
    // Reset to page 1 whenever search changes — page 5 of a fresh
    // result set is almost never what the user means to land on.
    if (currentPage !== 1) router.replace(pathname)
  }

  return (
    <>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search Acts by title or summary…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            flex: '1 1 320px',
            maxWidth: '480px',
            padding: '10px 14px',
            background: CREAM,
            color: INK,
            border: `1px solid ${INK_HAIRLINE}`,
            borderRadius: 0,
            fontFamily: 'Special Elite, monospace',
            fontSize: '15px',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7 }}>
          {filteredLaws.length === 0
            ? `0 of ${laws.length.toLocaleString()} shown`
            : `${firstShown.toLocaleString()}-${lastShown.toLocaleString()} of ${filteredLaws.length.toLocaleString()}${
                search ? ` (filtered from ${laws.length.toLocaleString()})` : ''
              } · page ${currentPage} of ${totalPages}`}
        </span>
      </div>

      {paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: INK_SOFT }}>
          {search ? `No Acts found matching "${search}".` : 'No Acts found.'}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {paginated.map((law) => (
              <BillCoverCard
                key={law.id}
                bill={law}
                userVote={null}
                onClick={() => router.push(`/bills/${law.id}`)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={pathname} />
          )}
        </>
      )}
    </>
  )
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  const baseStyle = {
    padding: '8px 14px',
    fontSize: '15px',
    border: `1px solid ${INK_HAIRLINE}`,
    color: INK,
    background: 'transparent',
    textDecoration: 'none',
    fontFamily: 'Special Elite, monospace',
  } as const

  if (disabled) {
    return (
      <span
        aria-disabled
        style={{ ...baseStyle, opacity: 0.35, cursor: 'not-allowed' }}
      >
        {children}
      </span>
    )
  }
  return (
    <Link href={href} style={baseStyle}>
      {children}
    </Link>
  )
}

// Slight per-card rotation so the grid feels like clippings pinned to
// a board rather than a CSS grid. Tilts repeat on a 5-card cycle.
function tiltFor(i: number) {
  const cycle = [-0.4, 0.3, -0.2, 0.5, -0.3]
  return cycle[i % cycle.length]
}

function LawCard({ law, tilt }: { law: Law; tilt: number }) {
  const partyColour = law.sponsor_party_colour
    ? `#${law.sponsor_party_colour.replace(/^#/, '')}`
    : '#7697a2'

  const date = law.last_update
    ? new Date(law.last_update).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <Link
      href={`/bills/${law.id}`}
      style={{
        display: 'block',
        background: CREAM,
        color: INK,
        border: `1px solid ${INK_HAIRLINE}`,
        padding: '20px 22px',
        textDecoration: 'none',
        transform: `rotate(${tilt}deg)`,
        boxShadow: '2px 3px 0 rgba(20,16,13,0.15)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '15px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            padding: '3px 8px',
            background: ACCENT,
            color: CREAM,
            fontWeight: 'bold',
          }}
        >
          ✓ Royal Assent
        </span>
        {law.originating_house && (
          <span
            style={{
              fontSize: '15px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: INK_SOFT,
            }}
          >
            {law.originating_house}
          </span>
        )}
      </div>

      <h3
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          lineHeight: 1.3,
          marginBottom: '12px',
          letterSpacing: '-0.01em',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {law.title}
      </h3>

      {law.plain_summary && (
        <p
          style={{
            fontSize: '15px',
            lineHeight: 1.6,
            color: INK_SOFT,
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {law.plain_summary}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '12px',
          borderTop: `1px dashed ${INK_HAIRLINE}`,
          fontSize: '15px',
          color: INK_SOFT,
        }}
      >
        {law.sponsor_name ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: partyColour,
                flexShrink: 0,
              }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {law.sponsor_name}
            </span>
          </span>
        ) : (
          <span />
        )}
        {date && <span style={{ flexShrink: 0 }}>{date}</span>}
      </div>
    </Link>
  )
}
