'use client'

import { useState } from 'react'

const C = {
  bg:   '#F4EFE5',
  ink:  '#404040',
  red:  '#B02A2A',
  gold: '#C8A76A',
}

export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div
        style={{
          fontSize: '13px',
          color: '#cfc8b8',
          padding: '14px 16px',
          border: `1px solid ${C.gold}`,
          background: 'rgba(200, 167, 106, 0.08)',
          fontFamily: 'inherit',
        }}
      >
        Thanks. Saturday morning, we&apos;ll write, you&apos;ll skim, the powerful will continue undisturbed.
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
      }}
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
    >
      <input
        type="email"
        required
        placeholder="Enter your email address"
        style={{
          flex: 1,
          minWidth: '220px',
          background: C.bg,
          border: '1px solid transparent',
          color: C.ink,
          padding: '12px 16px',
          fontSize: '13px',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        style={{
          background: C.red,
          color: '#fff',
          border: 'none',
          padding: '12px 22px',
          fontSize: '13px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Subscribe
      </button>
    </form>
  )
}
