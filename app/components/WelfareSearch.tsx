'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// The welfare explorer's search box: a postcode lookup (resolves to
// BOTH a constituency and a local authority, since a postcode sits in
// one of each) plus a free-text search by constituency/council/county
// name with a live typeahead dropdown. Styled to match the site's
// existing PostcodeLookup component rather than copying any third-party
// tool's look.
//
// Typeahead behaviour ("both", per the explicit product decision):
// results drop down live as the user types (debounced ~250ms) so they
// can click straight through without ever submitting; pressing Enter
// (or clicking a "see all results" affordance) instead takes them to
// the full /tools/welfare/search results page for that query — useful
// when there are more matches than fit the dropdown, or on a device
// where a hover dropdown is awkward.

const PAPER = '#f4e8d4'
const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.65)'
const ACCENT = '#7a1612'
const SERIF = '"EB Garamond", Garamond, Georgia, "Times New Roman", serif'
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/

type LookupResult = {
  constituency: { gssCode: string; name: string; scope: 'full' | 'partial' } | null
  localAuthority: { gssCode: string; name: string; scope: 'full' | 'partial' } | null
}

type SearchResult =
  | { type: 'constituency'; gssCode: string; name: string; scope: 'full' | 'partial' }
  | { type: 'local_authority'; gssCode: string; name: string; scope: 'full' | 'partial' }
  | { type: 'county'; name: string; constituencyCount: number; label: 'county' | 'borough' }

function resultHref(r: SearchResult): string {
  if (r.type === 'constituency') return `/tools/welfare/constituency/${r.gssCode}`
  if (r.type === 'local_authority') return `/tools/welfare/local-authority/${r.gssCode}`
  return `/tools/welfare/search?county=${encodeURIComponent(r.name)}`
}

function resultTypeLabel(r: SearchResult): string {
  if (r.type === 'constituency') return 'Constituency'
  if (r.type === 'local_authority') return 'Local authority'
  return r.label === 'borough' ? 'Borough' : 'County'
}

export default function WelfareSearch() {
  const router = useRouter()

  // ── postcode lookup ─────────────────────────────────────────────
  const [pc, setPc] = useState('')
  const [pcErr, setPcErr] = useState('')
  const [pcLoading, setPcLoading] = useState(false)
  const [pcResult, setPcResult] = useState<LookupResult | null>(null)

  async function submitPostcode(e: React.FormEvent) {
    e.preventDefault()
    if (pcLoading) return
    setPcErr('')
    setPcResult(null)
    const clean = pc.toUpperCase().replace(/\s+/g, '')
    if (!POSTCODE_RE.test(clean)) { setPcErr("That doesn't look like a UK postcode."); return }
    setPcLoading(true)
    try {
      const res = await fetch('/api/welfare/lookup?postcode=' + encodeURIComponent(clean))
      const data = await res.json()
      if (!res.ok) { setPcErr(data.message || 'Lookup failed. Please try again.'); setPcLoading(false); return }
      setPcResult(data)
      setPcLoading(false)
    } catch {
      setPcErr('Lookup is unavailable right now. Please try again.')
      setPcLoading(false)
    }
  }

  // ── name typeahead ──────────────────────────────────────────────
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [qLoading, setQLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const boxRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setQLoading(true)
      try {
        const res = await fetch('/api/welfare/search?q=' + encodeURIComponent(q.trim()))
        const data = await res.json()
        setSuggestions(res.ok ? (data.results || []) : [])
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setQLoading(false)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q])

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const text = q.trim()
    if (text.length < 2) return
    setOpen(false)
    router.push('/tools/welfare/search?q=' + encodeURIComponent(text))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Postcode lookup */}
      <form
        onSubmit={submitPostcode}
        style={{ background: PAPER, border: `2px solid ${INK}`, padding: '18px 20px', fontFamily: SERIF, color: INK, boxShadow: '3px 3px 0 rgba(20,16,13,0.18)' }}
      >
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(18px, 2.4vw, 24px)', lineHeight: 1.1, marginBottom: '10px', letterSpacing: '-0.01em' }}>
          Enter your postcode
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch' }}>
          <input
            value={pc}
            onChange={(e) => setPc(e.target.value)}
            placeholder="e.g. SW1A 0AA"
            aria-label="Your postcode"
            autoComplete="postal-code"
            style={{ flex: '1 1 200px', minWidth: 0, fontFamily: SERIF, fontSize: '18px', color: INK, background: '#fbf4e3', border: `1px solid ${INK}`, borderRadius: 0, padding: '11px 14px', outline: 'none', letterSpacing: '0.05em' }}
          />
          <button
            type="submit"
            disabled={pcLoading}
            style={{ flex: '0 0 auto', fontFamily: SERIF, fontWeight: 700, fontSize: '17px', letterSpacing: '0.04em', color: '#fff', background: ACCENT, border: 'none', borderRadius: 0, padding: '11px 24px', cursor: pcLoading ? 'default' : 'pointer', opacity: pcLoading ? 0.7 : 1 }}
          >
            {pcLoading ? 'Finding…' : 'Find my area'}
          </button>
        </div>
        {pcErr && (
          <p role="alert" style={{ margin: '10px 0 0', fontFamily: SERIF, fontSize: '15px', color: ACCENT }}>{pcErr}</p>
        )}
        {pcResult && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pcResult.constituency && (
              <ResultLink
                label="Your constituency"
                name={pcResult.constituency.name}
                partial={pcResult.constituency.scope === 'partial'}
                href={`/tools/welfare/constituency/${pcResult.constituency.gssCode}`}
              />
            )}
            {pcResult.localAuthority && (
              <ResultLink
                label="Your local authority"
                name={pcResult.localAuthority.name}
                partial={pcResult.localAuthority.scope === 'partial'}
                href={`/tools/welfare/local-authority/${pcResult.localAuthority.gssCode}`}
              />
            )}
          </div>
        )}
      </form>

      {/* Name / county typeahead */}
      <form onSubmit={submitSearch} ref={boxRef} style={{ position: 'relative', background: PAPER, border: `2px solid ${INK}`, padding: '18px 20px', fontFamily: SERIF, color: INK, boxShadow: '3px 3px 0 rgba(20,16,13,0.18)' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(18px, 2.4vw, 24px)', lineHeight: 1.1, marginBottom: '10px', letterSpacing: '-0.01em' }}>
          Or search by name
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
            placeholder="Constituency, council or county"
            aria-label="Search by constituency, council or county name"
            style={{ flex: '1 1 200px', minWidth: 0, fontFamily: SERIF, fontSize: '18px', color: INK, background: '#fbf4e3', border: `1px solid ${INK}`, borderRadius: 0, padding: '11px 14px', outline: 'none', letterSpacing: '0.02em' }}
          />
          <button
            type="submit"
            style={{ flex: '0 0 auto', fontFamily: SERIF, fontWeight: 700, fontSize: '17px', letterSpacing: '0.04em', color: '#fff', background: ACCENT, border: 'none', borderRadius: 0, padding: '11px 24px', cursor: 'pointer' }}
          >
            Search
          </button>
        </div>

        {open && q.trim().length >= 2 && (
          <ul
            role="listbox"
            style={{
              position: 'absolute', left: '20px', right: '20px', top: 'calc(100% - 4px)', zIndex: 20,
              margin: 0, padding: '4px 0', listStyle: 'none',
              background: '#fbf4e3', border: `1px solid ${INK}`, borderTop: 'none',
              boxShadow: '3px 3px 0 rgba(20,16,13,0.18)', maxHeight: '340px', overflowY: 'auto',
            }}
          >
            {qLoading && suggestions.length === 0 && (
              <li style={{ padding: '10px 14px', fontFamily: SERIF, fontSize: '15px', color: INK_SOFT }}>Searching…</li>
            )}
            {!qLoading && suggestions.length === 0 && (
              <li style={{ padding: '10px 14px', fontFamily: SERIF, fontSize: '15px', color: INK_SOFT }}>No matches. Press Search to see full results.</li>
            )}
            {suggestions.map((r) => (
              <li key={`${r.type}-${'gssCode' in r ? r.gssCode : r.name}`}>
                <a
                  href={resultHref(r)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', padding: '9px 14px', textDecoration: 'none', color: INK, fontFamily: SERIF, fontSize: '16px', borderBottom: '1px solid rgba(20,16,13,0.12)' }}
                >
                  <span>
                    {r.name}
                    {'scope' in r && r.scope === 'partial' && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: ACCENT, letterSpacing: '0.04em' }}>PARTIAL DATA</span>
                    )}
                  </span>
                  <span style={{ fontSize: '13px', color: INK_SOFT, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {resultTypeLabel(r)}
                    {r.type === 'county' ? ` · ${r.constituencyCount}` : ''}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  )
}

function ResultLink({ label, name, href, partial }: { label: string; name: string; href: string; partial: boolean }) {
  const ACCENT_LOCAL = '#7a1612'
  const INK_SOFT_LOCAL = 'rgba(20,16,13,0.65)'
  return (
    <a
      href={href}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
        padding: '11px 14px', background: '#fbf4e3', border: '1px solid rgba(20,16,13,0.3)',
        textDecoration: 'none', color: '#14100d',
      }}
    >
      <span>
        <span style={{ display: 'block', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_SOFT_LOCAL }}>{label}</span>
        <span style={{ display: 'block', fontSize: '18px', fontWeight: 600 }}>{name}</span>
      </span>
      <span style={{ fontSize: '15px', color: ACCENT_LOCAL, whiteSpace: 'nowrap' }}>
        {partial ? 'View partial results →' : 'View results →'}
      </span>
    </a>
  )
}
