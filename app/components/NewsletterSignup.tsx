'use client'

// Email-only newsletter sign-up (audit reassessment, 16 Oct 2026). Replaces the homepage
// link to account registration: a reader who wants the Sunday email gives an email address
// and nothing else. The server sends a confirmation link; the address joins the list only
// once that link is clicked. Account creation is offered afterwards, not required.

import { useState } from 'react'
import { markNewsletterSubscribed } from '@/lib/newsletter-strip'

const INK = '#14100d'
const ACCENT = '#7a1612'
const FONT = "var(--font-special-elite), monospace"

export default function NewsletterSignup({ source = 'homepage' }: { source?: string }) {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot, hidden from people
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, source }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { setState('sent'); markNewsletterSubscribed(); return }
      setState('error')
      setMessage(data.error || 'Something went wrong. Please try again.')
    } catch {
      setState('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" style={{ fontFamily: FONT, color: INK, marginTop: '12px', padding: '10px 12px', border: `1px solid ${ACCENT}`, background: 'rgba(122,22,18,0.05)' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700 }}>Check your inbox.</p>
        <p style={{ margin: '0 0 8px', fontSize: '15px', lineHeight: 1.5 }}>We have sent a link to {email}. Click it to confirm, and the newsletter will start on Sunday.</p>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          Want to vote on bills and compare your choices with your MP&rsquo;s?{' '}
          <a href="/login?mode=signup" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Create a free account &rarr;</a>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ marginTop: '12px' }} noValidate>
      <label htmlFor={`nl-email-${source}`} style={{ display: 'block', fontFamily: FONT, fontSize: '14px', color: INK, marginBottom: '6px' }}>
        Your email address
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <input
          id={`nl-email-${source}`}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ flex: '1 1 12em', minWidth: 0, fontFamily: FONT, fontSize: '16px', padding: '9px 10px', border: `1px solid ${INK}`, background: '#f4e8d4', color: INK, boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          style={{ fontFamily: FONT, fontSize: '16px', padding: '9px 14px', border: `1px solid ${ACCENT}`, background: ACCENT, color: '#f4efe6', cursor: state === 'sending' ? 'wait' : 'pointer' }}
        >
          {state === 'sending' ? 'Sending…' : 'Sign up free'}
        </button>
      </div>
      {/* Honeypot: off-screen, skipped by keyboard and screen readers. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Leave this empty<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>
      {state === 'error' && <p role="alert" style={{ fontFamily: FONT, fontSize: '14px', color: ACCENT, margin: '8px 0 0' }}>{message}</p>}
      <p style={{ fontFamily: FONT, fontSize: '13px', color: INK, margin: '8px 0 0', lineHeight: 1.5 }}>
        Email only, no account needed. Unsubscribe from any email in one click. <a href="/privacy" style={{ color: INK, textDecoration: 'underline' }}>Privacy</a>
      </p>
    </form>
  )
}
