'use client'

// Interactive cross-box ballot for a single bill. Sits inside the
// server-rendered ballot frame on the bill page; the running counts and
// Parliament's division are rendered server-side around it. Casting a vote
// posts to /api/vote then refreshes so the server counts update.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import Toast from '../../components/Toast'

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.7)'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const ACCENT = '#7a1612'

type Choice = 'yes' | 'no'

export default function BillVotingClient({ billId }: { billId: number }) {
  const router = useRouter()
  const { user } = useAuth()
  const [userVote, setUserVote] = useState<Choice | null>(null)
  const [voting, setVoting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setUserVote(null)
      return
    }
    fetch(`/api/vote?userId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUserVote((d?.votes?.[billId] as Choice) || null))
      .catch(() => {})
  }, [user, billId])

  async function handleVote(choice: Choice) {
    if (!user) {
      router.push(`/login?mode=signup&returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (voting) return
    // Already voted on this bill — tell them instead of silently doing nothing.
    if (userVote) {
      setNotice('You have already voted on this bill.')
      return
    }
    setVoting(true)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, billId, choice }),
      })
      if (res.ok) {
        setUserVote(choice)
        router.refresh() // pull fresh server-rendered counts
      } else {
        // Surface the server's reason (e.g. already voted from another device,
        // or email not yet confirmed) as a toast rather than failing silently.
        const d = await res.json().catch(() => null)
        if (res.status === 400) setUserVote(choice) // server says already voted; reflect it
        setNotice(d?.error || 'Your vote could not be recorded. Please try again.')
      }
    } catch {
      setNotice('Your vote could not be recorded. Please try again.')
    }
    setVoting(false)
  }

  const hasVoted = userVote !== null

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
      <BallotRow label="Aye" sub="I support this bill" marked={userVote === 'yes'} dim={hasVoted && userVote !== 'yes'} disabled={voting} onClick={() => handleVote('yes')} />
      <BallotRow label="No" sub="I oppose this bill" marked={userVote === 'no'} dim={hasVoted && userVote !== 'no'} disabled={voting} onClick={() => handleVote('no')} last />

      <div style={{ textAlign: 'center', marginTop: '14px', fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.06em', color: INK_SOFT }}>
        {hasVoted
          ? 'Your vote has been recorded. Thank you.'
          : user
          ? ''
          : 'You will be asked to sign in before your vote is counted.'}
      </div>
      <Toast message={notice} onDone={() => setNotice(null)} />
    </div>
  )
}

function BallotRow({
  label,
  sub,
  marked,
  dim,
  disabled,
  onClick,
  last = false,
}: {
  label: string
  sub: string
  marked: boolean
  dim: boolean
  disabled: boolean
  onClick: () => void
  last?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Vote ${label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: last ? 'none' : `1px solid ${INK_HAIRLINE}`,
        padding: '12px 4px',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: dim ? 0.45 : 1,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '19px', fontWeight: 'bold', color: INK }}>{label}</span>
        <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.05em', color: INK_SOFT, marginTop: '2px' }}>{sub}</span>
      </span>
      <span
        style={{
          width: '34px',
          height: '34px',
          border: `1.5px solid ${INK}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '27px',
          fontWeight: 'bold',
          lineHeight: 1,
          color: ACCENT,
          flexShrink: 0,
        }}
      >
        {marked ? '✗' : ''}
      </span>
    </button>
  )
}
