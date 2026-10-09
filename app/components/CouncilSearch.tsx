'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Homepage local-authority search: a postcode lookup (resolves straight
// to a single council) plus a free-text search by council/area name with
// a live typeahead dropdown. Modeled on WelfareSearch.tsx's UX pattern —
// same debounced-typeahead-plus-postcode shape — but simpler: there is
// only one result type here (a council), so no scope/partial labelling
// or multi-type result list is needed, and it resolves straight to
// /councils/[slug] rather than a welfare-specific detail route.

const PAPER = '#f4e8d4'
const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.65)'
const ACCENT = '#7a1612'
const SERIF = '"EB Garamond", Garamond, Georgia, "Times New Roman", serif'
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/

type CouncilResult = {
  slug: string
  name: string
  shortName: string | null
  typeLabel: string
  country?: string
}

export default function CouncilSearch() {
  const router = useRouter()

  // ── postcode lookup ─────────────────────────────────────────────
  const [pc, setPc] = useState('')
  const [pcErr, setPcErr] = useState('')
  const [pcLoading, setPcLoading] = useState(false)
  const [pcResult, setPcResult] = useState<CouncilResult | null>(null)

  async function submitPostcode(e: React.FormEvent) {
    e.preventDefault()
    if (pcLoading) return
    setPcErr('')
    setPcResult(null)
    const clean = pc.toUpperCase().replace(/\s+/g, '')
    if (!POSTCODE_RE.test(clean)) { setPcErr("That doesn't look like a UK postcode."); return }
    setPcLoading(true)
    try {
      const res = await fetch('/api/councils/lookup?postcode=' + encodeURIComponent(clean))
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
  const [suggestions, setSuggestions] = useState<CouncilResult[]>([])
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
        const res = await fetch('/api/councils/search?q=' + encodeURIComponent(q.trim()))
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
    router.push('/councils/search?q=' + encodeURIComponent(text))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Postcode lookup */}
      <form
        onSubmit={submitPostcode}
        style={{ background: PAPER, border: `2px solid ${INK}`, padding: '18px 20px', fontFamily: SERIF, color: INK, boxShadow: '3px 3px 0 rgba(20,16,13,0.18)' }}
      >
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(18px, 2.4vw, 24px)', lineHeight: 1.1, marginBottom: '10px', letterSpacing: '-0.01em' }}>
          Find your local authority
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
            {pcLoading ? 'Finding…' : 'Find my council'}
          </button>
        </div>
        {pcErr && (
          <p role="alert" style={{ margin: '10px 0 0', fontFamily: SERIF, fontSize: '15px', color: ACCENT }}>{pcErr}</p>
        )}
        {pcResult && (
          <div style={{ marginTop: '14px' }}>
            <a
              href={`/councils/${pcResult.slug}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                padding: '11px 14px', background: '#fbf4e3', border: '1px solid rgba(20,16,13,0.3)',
                textDecoration: 'none', color: INK,
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_SOFT }}>Your local authority</span>
                <span style={{ display: 'block', fontSize: '18px', fontWeight: 600 }}>{pcResult.shortName || pcResult.name}</span>
              </span>
              <span style={{ fontSize: '15px', color: ACCENT, whiteSpace: 'nowrap' }}>View council profile →</span>
            </a>
          </div>
        )}
      </form>

      {/* Name typeahead */}
      <form onSubmit={submitSearch} ref={boxRef} style={{ position: 'relative', background: PAPER, border: `2px solid ${INK}`, padding: '18px 20px', fontFamily: SERIF, color: INK, boxShadow: '3px 3px 0 rgba(20,16,13,0.18)' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(18px, 2.4vw, 24px)', lineHeight: 1.1, marginBottom: '10px', letterSpacing: '-0.01em' }}>
          Or search by name
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
            placeholder="Council or area name"
            aria-label="Search by council or area name"
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
              <li key={r.slug}>
                <a
                  href={`/councils/${r.slug}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', padding: '9px 14px', textDecoration: 'none', color: INK, fontFamily: SERIF, fontSize: '16px', borderBottom: '1px solid rgba(20,16,13,0.12)' }}
                >
                  <span>{r.shortName || r.name}</span>
                  <span style={{ fontSize: '13px', color: INK_SOFT, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {r.typeLabel}
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
