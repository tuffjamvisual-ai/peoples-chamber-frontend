'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// Full results listing for /tools/welfare/search — the page a user
// lands on after pressing Enter/Search on the typeahead box (rather
// than clicking a dropdown suggestion directly), and also where a
// "county" or "borough" result from the dropdown sends them, since a
// county resolves to a LIST of constituencies rather than a single
// results page. Reads either ?q= (typeahead query) or ?county=
// (exact-name expansion) from the URL and renders whichever shape
// /api/welfare/search returns for that param.

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.65)'
const INK_HAIRLINE = 'rgba(20,16,13,0.2)'
const ACCENT = '#7a1612'
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif'
const MONO = 'Special Elite, monospace'

type SearchResult =
  | { type: 'constituency'; gssCode: string; name: string; scope: 'full' | 'partial'; county?: string | null }
  | { type: 'local_authority'; gssCode: string; name: string; scope: 'full' | 'partial' }
  | { type: 'county'; name: string; constituencyCount: number; label: 'county' | 'borough' }

function resultHref(r: SearchResult): string {
  if (r.type === 'constituency') return `/tools/welfare/constituency/${r.gssCode}`
  if (r.type === 'local_authority') return `/tools/welfare/local-authority/${r.gssCode}`
  return `/tools/welfare/search?county=${encodeURIComponent(r.name)}`
}

export default function WelfareSearchResults() {
  const params = useSearchParams()
  const q = params.get('q') || ''
  const county = params.get('county') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError('')
      setResults([])
      if (!q && !county) {
        setLoading(false)
        setError('Enter a constituency, council or county name to search.')
        return
      }
      try {
        const url = county
          ? `/api/welfare/search?county=${encodeURIComponent(county)}`
          : `/api/welfare/search?q=${encodeURIComponent(q)}`
        const res = await fetch(url)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.message || 'Search failed. Please try again.')
          setLoading(false)
          return
        }
        setResults(data.results || [])
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError('Search is unavailable right now. Please try again.')
          setLoading(false)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [q, county])

  const heading = county ? `Constituencies in ${county}` : q ? `Results for "${q}"` : 'Search'

  const constituencies = results.filter(
    (r): r is Extract<SearchResult, { type: 'constituency' }> => r.type === 'constituency',
  )
  const localAuthorities = results.filter(
    (r): r is Extract<SearchResult, { type: 'local_authority' }> => r.type === 'local_authority',
  )
  const counties = results.filter(
    (r): r is Extract<SearchResult, { type: 'county' }> => r.type === 'county',
  )

  return (
    <div>
      <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 3.2vw, 36px)', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '20px', color: INK }}>
        {heading}
      </h1>

      {loading && (
        <p style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT }}>Searching…</p>
      )}

      {!loading && error && (
        <p role="alert" style={{ fontFamily: SERIF, fontSize: '16px', color: ACCENT }}>{error}</p>
      )}

      {!loading && !error && results.length === 0 && (
        <p style={{ fontFamily: SERIF, fontSize: '16px', color: INK_SOFT }}>
          No matches found. Check the spelling, or try searching by postcode instead.
        </p>
      )}

      {!loading && !error && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {constituencies.length > 0 && (
            <ResultGroup title="Constituencies" items={constituencies.map((r) => ({ key: r.type + r.gssCode, href: resultHref(r), name: r.name, partial: r.scope === 'partial' }))} />
          )}
          {localAuthorities.length > 0 && (
            <ResultGroup title="Local authorities" items={localAuthorities.map((r) => ({ key: r.type + r.gssCode, href: resultHref(r), name: r.name, partial: r.scope === 'partial' }))} />
          )}
          {counties.length > 0 && (
            <ResultGroup
              title="Counties & boroughs"
              items={counties.map((r) => ({
                key: `county-${r.name}`,
                href: resultHref(r),
                name: r.name,
                sub: `${r.constituencyCount} constituenc${r.constituencyCount === 1 ? 'y' : 'ies'} · ${r.label === 'borough' ? 'borough' : 'county'}`,
              }))}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({ title, items }: { title: string; items: { key: string; href: string; name: string; partial?: boolean; sub?: string }[] }) {
  return (
    <section>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 12px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
        {title}
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px 20px' }}>
        {items.map((item) => (
          <li key={item.key}>
            <a href={item.href} style={{ display: 'block', padding: '8px 0', color: INK, textDecoration: 'none', fontFamily: SERIF, fontSize: '17px', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              {item.name}
              {item.partial && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: ACCENT, letterSpacing: '0.04em', fontFamily: MONO }}>PARTIAL DATA</span>
              )}
              {item.sub && (
                <span style={{ display: 'block', fontSize: '13px', color: INK_SOFT, marginTop: '2px', fontFamily: MONO }}>{item.sub}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
