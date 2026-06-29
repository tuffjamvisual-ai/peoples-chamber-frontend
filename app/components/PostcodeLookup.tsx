'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PAPER = '#f4e8d4'
const INK = '#14100d'
const ACCENT = '#7a1612'
const SERIF = '"EB Garamond", Garamond, Georgia, "Times New Roman", serif'
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/

export default function PostcodeLookup({ heading = 'Who is your MP?' }: { heading?: string }) {
  const router = useRouter()
  const [pc, setPc] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setErr('')
    const clean = pc.toUpperCase().replace(/\s+/g, '')
    if (!POSTCODE_RE.test(clean)) { setErr("That doesn't look like a UK postcode."); return }
    setLoading(true)
    try {
      const res = await fetch('/api/find-mp?postcode=' + encodeURIComponent(clean))
      const data = await res.json()
      if (!res.ok) { setErr(data.message || 'Lookup failed. Please try again.'); setLoading(false); return }
      router.push('/mps/' + data.memberId)
    } catch {
      setErr('Lookup is unavailable right now. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ background: PAPER, border: `2px solid ${INK}`, padding: '18px 20px', fontFamily: SERIF, color: INK, boxShadow: '3px 3px 0 rgba(20,16,13,0.18)' }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(20px, 2.6vw, 28px)', lineHeight: 1.1, marginBottom: '10px', letterSpacing: '-0.01em' }}>
        {heading}
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
          disabled={loading}
          style={{ flex: '0 0 auto', fontFamily: SERIF, fontWeight: 700, fontSize: '17px', letterSpacing: '0.04em', color: '#fff', background: ACCENT, border: 'none', borderRadius: 0, padding: '11px 24px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Finding…' : 'Find my MP'}
        </button>
      </div>
      {err && (
        <p role="alert" style={{ margin: '10px 0 0', fontFamily: SERIF, fontSize: '15px', color: ACCENT }}>{err}</p>
      )}
    </form>
  )
}
