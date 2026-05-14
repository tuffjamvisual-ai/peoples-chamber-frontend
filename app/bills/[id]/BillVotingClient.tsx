'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'

const SUCCESS = '#4a8a3a'
const DANGER = '#8a3a3a'

export default function BillVotingClient({ billId }: { billId: number }) {
  const router = useRouter()
  const { user } = useAuth()
  const [userVote, setUserVote] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch(`/api/vote?userId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUserVote(d?.votes?.[billId] || null))
      .catch(() => {})
  }, [user, billId])

  async function handleVote(choice: 'yes' | 'no' | 'abstain') {
    if (!user) {
      router.push(`/login?mode=signup&returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (userVote || voting) return
    setVoting(true)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, billId, choice }),
      })
      if (res.ok) {
        setUserVote(choice)
        // Pull fresh server-rendered counts.
        router.refresh()
      }
    } catch {}
    setVoting(false)
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <VoteButton label="Support"  activeLabel="✓ Supported" onClick={() => handleVote('yes')}     disabled={!!userVote || voting} active={userVote === 'yes'}     colour={SUCCESS} />
        <VoteButton label="Oppose"   activeLabel="✓ Opposed"   onClick={() => handleVote('no')}      disabled={!!userVote || voting} active={userVote === 'no'}      colour={DANGER} />
        <VoteButton label="Abstain"  activeLabel="✓ Abstained" onClick={() => handleVote('abstain')} disabled={!!userVote || voting} active={userVote === 'abstain'} colour="#7697a2" />
      </div>
    </>
  )
}

function VoteButton({
  label,
  activeLabel,
  onClick,
  disabled,
  active,
  colour,
}: {
  label: string
  activeLabel: string
  onClick: () => void
  disabled: boolean
  active: boolean
  colour: string
}) {
  const baseClasses = 'py-3 text-[15px] uppercase tracking-[0.2em] font-bold transition-colors rounded-sm'
  const style: React.CSSProperties = active
    ? { backgroundColor: colour, color: '#505050' }
    : disabled
    ? { backgroundColor: '#404040', color: '#ffffff', cursor: 'not-allowed' }
    : { backgroundColor: colour + '22', color: colour, border: `1px solid ${colour}55` }
  return (
    <button onClick={onClick} disabled={disabled} className={baseClasses} style={style}>
      {active ? activeLabel : label}
    </button>
  )
}
