'use client'

import { useEffect, useRef } from 'react'

// Lightweight fixed-position notification pill. Parent sets `message` to show
// it and passes `onDone` to clear it; the toast auto-dismisses after ~3.2s.
// Re-arms whenever `message` changes (so a fresh click restarts the timer).
export default function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onDoneRef.current(), 3200)
    return () => clearTimeout(t)
  }, [message])
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '28px',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#14100d',
        color: '#f4e8d4',
        fontFamily: "'Special Elite', monospace",
        fontSize: '15px',
        letterSpacing: '0.03em',
        lineHeight: 1.4,
        padding: '12px 20px',
        border: '1px solid rgba(244,232,212,0.25)',
        borderRadius: '4px',
        boxShadow: '0 6px 22px rgba(0,0,0,0.4)',
        maxWidth: '90vw',
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  )
}
