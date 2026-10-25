'use client'

// Interactive cross-box ballot for a single bill. Sits inside the
// server-rendered ballot frame on the bill page; the running counts and
// Parliament's division are rendered server-side around it. Casting a vote
// posts to /api/vote then refreshes so the server counts update.
// Changing a vote (owner's approval, 25 Oct 2026, report 53): while the bill is still going through Parliament the
// visitor can mark the other box; /api/vote changes the stored vote. Once the bill is closed (an Act, withdrawn or
// defeated) the page says so and shows the final choice. After every reply the boxes show the choice the server says
// is stored, never just the box last clicked.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import Toast from '../../components/Toast'

const INK = '#14100d'
const INK_SOFT = '#14100d'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const ACCENT = '#7a1612'

type Choice = 'yes' | 'no'
type Stored = Choice | 'abstain'
const LABEL: Record<Stored, string> = { yes: 'Aye', no: 'No', abstain: 'Abstain' }

export default function BillVotingClient({ billId, closed: closedAtRender = false }: { billId: number; closed?: boolean }) {
  const router = useRouter()
  const { user, authLoading } = useAuth()
  const [userVote, setUserVote] = useState<Stored | null>(null)
  const [closed, setClosed] = useState(closedAtRender)
  const [voting, setVoting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setUserVote(null)
      return
    }
    fetch(`/api/vote?userId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUserVote((d?.votes?.[billId] as Stored) || null))
      .catch(() => {})
  }, [user, billId])

  async function handleVote(choice: Choice) {
    if (authLoading) return
    if (!user) {
      router.push(`/login?mode=signup&returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (voting) return
    if (closed) {
      setNotice('Voting has closed on this bill.')
      if (userVote) return
    }
    // Marking the box already marked changes nothing.
    if (userVote === choice) {
      setNotice(`Your vote is already ${LABEL[choice]}.`)
      return
    }
    setVoting(true)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, billId, choice }),
      })
      const d = await res.json().catch(() => null)
      if (res.ok) {
        // The stored choice, as the server reports it.
        if (d?.choice) setUserVote(d.choice as Stored)
        if (d?.changed) setNotice(`Your vote has been changed to ${LABEL[d.choice as Stored] ?? d.choice}.`)
        router.refresh() // pull fresh server-rendered counts
      } else {
        if (res.status === 401) {
          setNotice('Your session has expired. Please refresh the page and sign in again.')
          setVoting(false)
          return
        }
        // A refusal carries the stored choice (existingChoice); show that, never the box just clicked.
        if (d?.existingChoice) setUserVote(d.existingChoice as Stored)
        if (d?.closed) setClosed(true)
        setNotice(d?.error || 'Your vote could not be recorded. Please try again.')
      }
    } catch {
      setNotice('Your vote could not be recorded. Please try again.')
    }
    setVoting(false)
  }

  const hasVoted = userVote !== null
  const status = closed
    ? hasVoted
      ? `Voting has closed on this bill. Your final vote: ${LABEL[userVote as Stored]}.`
      : 'Voting has closed on this bill.'
    : hasVoted
    ? `Your vote: ${LABEL[userVote as Stored]}.`
    : user
    ? ''
    : 'You will be asked to sign in before your vote is counted.'

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
      <BallotRow label="Aye" sub="I support this bill" marked={userVote === 'yes'} dim={hasVoted && userVote !== 'yes'} disabled={voting || (closed && hasVoted)} onClick={() => handleVote('yes')} />
      <BallotRow label="No" sub="I oppose this bill" marked={userVote === 'no'} dim={hasVoted && userVote !== 'no'} disabled={voting || (closed && hasVoted)} onClick={() => handleVote('no')} last />

      <div role="status" style={{ textAlign: 'center', marginTop: '14px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.06em', color: INK_SOFT }}>
        {status}
        {hasVoted && !closed && (
          <span style={{ display: 'block', marginTop: '6px', fontWeight: 'bold', color: ACCENT }}>
            Change your vote: mark the other box while the bill is going through Parliament.
          </span>
        )}
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
      type="button"
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
        <span style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '19px', fontWeight: 'bold', color: INK }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.05em', color: INK_SOFT, marginTop: '2px' }}>{sub}</span>
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
