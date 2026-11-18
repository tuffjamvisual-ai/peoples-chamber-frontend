'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useListNav } from '@/lib/search/use-list-nav'
import { markMatches } from '@/lib/search/words'

// Homepage local-authority search: a single input that auto-detects
// whether the visitor typed a UK postcode or a council/area name, and
// routes to the matching lookup. Originally built as two separate boxes
// (postcode + name), mirroring WelfareSearch.tsx's two-box layout, then
// merged into one on explicit request — a postcode resolves to exactly
// one council, so there's no need for a separate box once the two kinds
// of input can share a single debounced dropdown.
//
// Detection rule: clean the input (uppercase, strip spaces) and test it
// against the full UK postcode shape. A complete postcode triggers
// /api/councils/lookup (resolves to exactly one council — the dropdown
// shows that single result, and submitting takes you straight to its
// page, no intermediate results page needed since there's nothing to
// disambiguate). Anything else — including a partial postcode still
// being typed — triggers /api/councils/search's name typeahead instead;
// a partial postcode just won't happen to match any council name, so it
// harmlessly returns no results until enough of it is typed to complete
// the shape.

const PAPER = '#f4e8d4'
const INK = '#14100d'
const INK_SOFT = '#14100d'
const ACCENT = '#7a1612'
const SERIF = 'var(--font-special-elite), monospace'
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/

type PlaceResult = { label: string; slug: string; councilName: string }

type CouncilResult = {
  slug: string
  name: string
  shortName: string | null
  typeLabel: string
  country?: string
}

function cleanPostcode(v: string): string {
  return v.toUpperCase().replace(/\s+/g, '')
}

export default function CouncilSearch({ initialQuery = '', placeholder = 'Postcode or council name', noMatchText = 'No matches. Press Search to see full results.' }: { initialQuery?: string; placeholder?: string; noMatchText?: string } = {}) {
  const router = useRouter()

  const [q, setQ] = useState(initialQuery)
  // A search already on the page (/councils/search?q=...) does not open the dropdown over its own results.
  const skipFirstLookup = useRef(initialQuery !== '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [postcodeResult, setPostcodeResult] = useState<CouncilResult | null>(null)
  const [nameSuggestions, setNameSuggestions] = useState<CouncilResult[]>([])
  // Towns and villages with their council, after the names (ENTRY 308: "grimsby" found nothing).
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceResult[]>([])
  const [open, setOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const boxRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (skipFirstLookup.current) { skipFirstLookup.current = false; return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = q.trim()
    const clean = cleanPostcode(trimmed)

    if (trimmed.length < 2) {
      // Clearing the results as the box empties; the fetches below set them from their answers.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPostcodeResult(null)
      setNameSuggestions([])
      setPlaceSuggestions([])
      setError('')
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        if (POSTCODE_RE.test(clean)) {
          const res = await fetch('/api/councils/lookup?postcode=' + encodeURIComponent(clean))
          const data = await res.json()
          if (res.ok) {
            setPostcodeResult(data)
            setNameSuggestions([])
            setPlaceSuggestions([])
          } else {
            setPostcodeResult(null)
            setError(data.message || 'Lookup failed. Please try again.')
          }
        } else {
          const res = await fetch('/api/councils/search?q=' + encodeURIComponent(trimmed))
          const data = await res.json()
          setPostcodeResult(null)
          setNameSuggestions(res.ok ? (data.results || []) : [])
          setPlaceSuggestions(res.ok ? (data.places || []) : [])
        }
        setOpen(true)
      } catch {
        setPostcodeResult(null)
        setNameSuggestions([])
        setPlaceSuggestions([])
        setError('Search is unavailable right now. Please try again.')
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q])

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowHelp(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    if (trimmed.length < 2) return
    const clean = cleanPostcode(trimmed)

    if (POSTCODE_RE.test(clean)) {
      // A postcode resolves to exactly one council — go straight there
      // rather than through a results page. Re-fetch rather than trust
      // debounced state, so submitting immediately (before the debounce
      // fires) still works correctly.
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/councils/lookup?postcode=' + encodeURIComponent(clean))
        const data = await res.json()
        if (res.ok && data.slug) {
          setOpen(false)
          router.push(`/councils/${data.slug}`)
          return
        }
        setPostcodeResult(null)
        setError(data.message || 'Lookup failed. Please try again.')
        setOpen(true)
      } catch {
        setError('Lookup is unavailable right now. Please try again.')
        setOpen(true)
      } finally {
        setLoading(false)
      }
      return
    }

    setOpen(false)
    router.push('/councils/search?q=' + encodeURIComponent(trimmed))
  }

  // Arrow keys, Enter and Escape over the council names then the places (SEARCH-ALL batch 2); matched letters bold;
  // rows at least 44px. With nothing highlighted, Enter submits as before.
  const picks = [...nameSuggestions.map((r) => r.slug), ...placeSuggestions.map((p) => p.slug)]
  const nav = useListNav(open && !error && !postcodeResult ? picks.length : 0, (i) => { setOpen(false); router.push(`/councils/${picks[i]}`) }, () => setOpen(false))
  const row = (k: number) => ({ id: `cs-opt-${k}`, role: 'option' as const, 'aria-selected': k === nav.active, onMouseEnter: () => nav.setActive(k) })
  const bold = (label: string) => markMatches(label, q).map(([t, hit], i) => (hit ? <strong key={i}>{t}</strong> : <span key={i}>{t}</span>))

  return (
    <>
    {/* ENTRY 310 and 311 (owner, 18 Nov 2026): from 1,024px the box takes the reports search look (no panel, parchment
        field, ink outline button, at most 420px); under 1,024px nothing changes (the inline styles stand). Inline styles
        cannot hold a media query, so these override them with !important. */}
    <style>{`
      @media (min-width: 1024px) {
        .cs-box { background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; max-width: 420px; }
        .cs-input { background: rgba(20,16,13,0.05) !important; border: 1px solid rgba(20,16,13,0.3) !important; padding: 10px 14px !important; font-size: 15px !important; letter-spacing: normal !important; }
        .cs-submit { background: transparent !important; color: ${INK} !important; border: 1px solid ${INK} !important; font-weight: normal !important; font-size: 15px !important; letter-spacing: 0.06em !important; padding: 10px 14px !important; }
        .cs-list { left: 0 !important; right: 0 !important; top: 100% !important; margin-top: 2px; background: #f4ecd8 !important; box-shadow: 0 4px 10px rgba(0,0,0,0.15) !important; border-top: 1px solid ${INK} !important; }
      }
    `}</style>
    <form
      onSubmit={submit}
      ref={boxRef}
      className="cs-box"
      style={{ position: 'relative', background: PAPER, border: `2px solid ${INK}`, padding: '18px 20px', fontFamily: SERIF, color: INK, boxShadow: '3px 3px 0 rgba(20,16,13,0.18)' }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(18px, 2.4vw, 24px)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
          Find your local authority
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          aria-label="How to use this search"
          className="og-help-i"
          style={{
            flex: '0 0 auto', width: '20px', height: '20px', borderRadius: '50%',
            border: `1.5px solid ${INK}`, background: 'transparent', color: INK,
            fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: '15px',
            lineHeight: 1, cursor: 'pointer', padding: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          i
        </button>

        {showHelp && (
          <div
            role="note"
            style={{
              position: 'absolute', left: 0, top: 'calc(100% + 8px)', zIndex: 21,
              maxWidth: '360px', background: '#fbf4e3', border: `1px solid ${INK}`,
              boxShadow: '3px 3px 0 rgba(20,16,13,0.18)', padding: '12px 14px',
              fontFamily: SERIF, fontSize: '15px', lineHeight: 1.5, color: INK,
            }}
          >
            Type a UK postcode to jump straight to your council&rsquo;s page. Type a council or
            area name instead to see a list of matches. Covers all councils in England, Scotland,
            Wales and Northern Ireland.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch' }}>
        <input
          className="cs-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (postcodeResult || nameSuggestions.length > 0 || placeSuggestions.length > 0 || error) setOpen(true) }}
          placeholder={placeholder}
          aria-label={`Search by ${placeholder.toLowerCase()}`}
          autoComplete="off"
          onKeyDown={nav.onKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="cs-list"
          aria-activedescendant={open && nav.active >= 0 ? `cs-opt-${nav.active}` : undefined}
          style={{ flex: '1 1 200px', minWidth: 0, fontFamily: SERIF, fontSize: '18px', color: INK, background: '#fbf4e3', border: `1px solid ${INK}`, borderRadius: 0, padding: '11px 14px', outline: 'none', letterSpacing: '0.02em' }}
        />
        <button
          type="submit"
          className="cs-submit"
          disabled={loading}
          style={{ flex: '0 0 auto', fontFamily: SERIF, fontWeight: 700, fontSize: '17px', letterSpacing: '0.04em', color: '#fff', background: ACCENT, border: 'none', borderRadius: 0, padding: '11px 24px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {open && (
        <div
          className="cs-list"
          style={{
            position: 'absolute', left: '20px', right: '20px', top: 'calc(100% - 4px)', zIndex: 20,
            background: '#fbf4e3', border: `1px solid ${INK}`, borderTop: 'none',
            boxShadow: '3px 3px 0 rgba(20,16,13,0.18)', maxHeight: '340px', overflowY: 'auto',
          }}
        >
          {error && (
            <p role="alert" style={{ margin: 0, padding: '10px 14px', fontFamily: SERIF, fontSize: '15px', color: ACCENT }}>{error}</p>
          )}

          {!error && postcodeResult && (
            <a
              href={`/councils/${postcodeResult.slug}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                padding: '11px 14px', textDecoration: 'none', color: INK,
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_SOFT }}>Your local authority</span>
                <span style={{ display: 'block', fontSize: '18px', fontWeight: 600 }}>{postcodeResult.shortName || postcodeResult.name}</span>
              </span>
              <span style={{ fontSize: '15px', color: ACCENT, whiteSpace: 'nowrap' }}>View council profile →</span>
            </a>
          )}

          {!error && !postcodeResult && (
            <ul id="cs-list" role="listbox" style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
              {loading && nameSuggestions.length === 0 && placeSuggestions.length === 0 && (
                <li style={{ padding: '10px 14px', fontFamily: SERIF, fontSize: '15px', color: INK_SOFT }}>Searching…</li>
              )}
              {!loading && nameSuggestions.length === 0 && placeSuggestions.length === 0 && (
                <li style={{ padding: '10px 14px', fontFamily: SERIF, fontSize: '15px', color: INK_SOFT }}>{noMatchText}</li>
              )}
              {nameSuggestions.map((r, k) => (
                <li key={r.slug} {...row(k)}>
                  <a
                    href={`/councils/${r.slug}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', minHeight: '44px', boxSizing: 'border-box', background: k === nav.active ? 'rgba(20,16,13,0.08)' : 'transparent', padding: '9px 14px', textDecoration: 'none', color: INK, fontFamily: SERIF, fontSize: '16px', borderBottom: '1px solid rgba(20,16,13,0.12)' }}
                  >
                    <span>{bold(r.shortName || r.name)}</span>
                    <span style={{ fontSize: '15px', color: INK_SOFT, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {r.typeLabel}
                    </span>
                  </a>
                </li>
              ))}
              {placeSuggestions.map((p, j) => (
                <li key={`${p.label}|${p.slug}`} {...row(nameSuggestions.length + j)}>
                  <a
                    href={`/councils/${p.slug}`}
                    style={{ display: 'flex', alignItems: 'center', minHeight: '44px', boxSizing: 'border-box', background: nameSuggestions.length + j === nav.active ? 'rgba(20,16,13,0.08)' : 'transparent', padding: '9px 14px', textDecoration: 'none', color: INK, fontFamily: SERIF, fontSize: '16px', borderBottom: '1px solid rgba(20,16,13,0.12)' }}
                  >
                    <span>{bold(p.label)}: {p.councilName}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
    </>
  )
}
