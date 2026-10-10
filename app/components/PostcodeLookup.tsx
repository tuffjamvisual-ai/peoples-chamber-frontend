'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { normaliseParty } from '@/lib/party-helpers'

// "Find Your MP" search box: a single input that auto-detects whether
// the visitor typed a UK postcode or an MP/constituency name, and
// routes to the matching MP. Mirrors app/components/CouncilSearch.tsx's
// detection pattern (postcode shape test -> single-result lookup,
// anything else -> name typeahead), extended here from postcode-only
// per explicit request to also support searching by MP name.
//
// Detection rule: clean the input (uppercase, strip spaces) and test it
// against the full UK postcode shape. A complete postcode triggers
// /api/find-mp (resolves to exactly one MP via their constituency —
// submitting goes straight to that MP's page, no intermediate list).
// Anything else triggers /api/mps/search's name/constituency typeahead
// instead; a partial postcode still being typed just won't happen to
// match any MP or constituency name, so it harmlessly returns no
// results until enough of it is typed to complete the postcode shape.

const PAPER = '#f4e8d4'
const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.65)'
const ACCENT = '#7a1612'
const SERIF = '"EB Garamond", Garamond, Georgia, "Times New Roman", serif'
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/

type MpResult = {
  memberId: number
  name: string
  constituency: string | null
  party: string | null
}

function cleanPostcode(v: string): string {
  return v.toUpperCase().replace(/\s+/g, '')
}

export default function PostcodeLookup({ heading = 'Who is your MP?' }: { heading?: string }) {
  const router = useRouter()

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [postcodeResult, setPostcodeResult] = useState<MpResult | null>(null)
  const [nameSuggestions, setNameSuggestions] = useState<MpResult[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const boxRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = q.trim()
    const clean = cleanPostcode(trimmed)

    if (trimmed.length < 2) {
      setPostcodeResult(null)
      setNameSuggestions([])
      setError('')
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        if (POSTCODE_RE.test(clean)) {
          const res = await fetch('/api/find-mp?postcode=' + encodeURIComponent(clean))
          const data = await res.json()
          if (res.ok) {
            setPostcodeResult({ memberId: data.memberId, name: data.name, constituency: data.constituency, party: null })
            setNameSuggestions([])
          } else {
            setPostcodeResult(null)
            setError(data.message || 'Lookup failed. Please try again.')
          }
        } else {
          const res = await fetch('/api/mps/search?q=' + encodeURIComponent(trimmed))
          const data = await res.json()
          setPostcodeResult(null)
          setNameSuggestions(res.ok ? (data.results || []) : [])
        }
        setOpen(true)
      } catch {
        setPostcodeResult(null)
        setNameSuggestions([])
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
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
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
      // A postcode resolves to exactly one MP — go straight there rather
      // than through a results list. Re-fetch rather than trust debounced
      // state, so submitting immediately (before the debounce fires)
      // still works correctly.
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/find-mp?postcode=' + encodeURIComponent(clean))
        const data = await res.json()
        if (res.ok && data.memberId) {
          setOpen(false)
          router.push('/mps/' + data.memberId)
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

    // Free-text name/constituency search has no single-result shortcut
    // the way a postcode does (several MPs can share a similar name
    // fragment, or the text could match a constituency rather than a
    // person) — so submitting just re-opens/keeps the dropdown of
    // matches open rather than guessing which one to navigate to.
    setOpen(true)
  }

  return (
    <form
      onSubmit={submit}
      ref={boxRef}
      style={{ position: 'relative', background: PAPER, border: `2px solid ${INK}`, padding: '18px 20px', fontFamily: SERIF, color: INK, boxShadow: '3px 3px 0 rgba(20,16,13,0.18)' }}
    >
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(20px, 2.6vw, 28px)', lineHeight: 1.1, marginBottom: '10px', letterSpacing: '-0.01em' }}>
        {heading}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (postcodeResult || nameSuggestions.length > 0 || error) setOpen(true) }}
          placeholder="Postcode, MP name, or constituency"
          aria-label="Search by postcode, MP name, or constituency"
          autoComplete="off"
          style={{ flex: '1 1 200px', minWidth: 0, fontFamily: SERIF, fontSize: '18px', color: INK, background: '#fbf4e3', border: `1px solid ${INK}`, borderRadius: 0, padding: '11px 14px', outline: 'none', letterSpacing: '0.02em' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ flex: '0 0 auto', fontFamily: SERIF, fontWeight: 700, fontSize: '17px', letterSpacing: '0.04em', color: '#fff', background: ACCENT, border: 'none', borderRadius: 0, padding: '11px 24px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Finding…' : 'Find my MP'}
        </button>
      </div>

      {open && (
        <div
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
              href={`/mps/${postcodeResult.memberId}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                padding: '11px 14px', textDecoration: 'none', color: INK,
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_SOFT }}>Your MP</span>
                <span style={{ display: 'block', fontSize: '18px', fontWeight: 600 }}>{postcodeResult.name}</span>
              </span>
              <span style={{ fontSize: '15px', color: ACCENT, whiteSpace: 'nowrap' }}>View profile →</span>
            </a>
          )}

          {!error && !postcodeResult && (
            <ul role="listbox" style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
              {loading && nameSuggestions.length === 0 && (
                <li style={{ padding: '10px 14px', fontFamily: SERIF, fontSize: '15px', color: INK_SOFT }}>Searching…</li>
              )}
              {!loading && nameSuggestions.length === 0 && (
                <li style={{ padding: '10px 14px', fontFamily: SERIF, fontSize: '15px', color: INK_SOFT }}>No matches. Try a full postcode, or check the spelling.</li>
              )}
              {nameSuggestions.map((r) => (
                <li key={r.memberId}>
                  <a
                    href={`/mps/${r.memberId}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', padding: '9px 14px', textDecoration: 'none', color: INK, fontFamily: SERIF, fontSize: '16px', borderBottom: '1px solid rgba(20,16,13,0.12)' }}
                  >
                    <span>
                      {r.name}
                      {r.constituency && <span style={{ color: INK_SOFT }}> — {r.constituency}</span>}
                    </span>
                    <span style={{ fontSize: '13px', color: INK_SOFT, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {normaliseParty(r.party)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
