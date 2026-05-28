'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

type Poll = {
  id: number
  question: string
  constituency: string | null
  vote_count_yes: number
  vote_count_no: number
  created_at: string
  explainer: string | null
}

type SortOption = 'newest' | 'popular'

const INK = '#14100d'
const INK_SOFT = 'rgba(20,16,13,0.7)'
const INK_HAIRLINE = 'rgba(20,16,13,0.3)'
const CREAM = '#ebe5d8'
const CREAM_DEEP = '#dcd4c0'
const ACCENT = '#7a1612'
const SUCCESS = '#4e6b34'
const DANGER = '#8a2f20'

export default function PollsClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [polls, setPolls] = useState<Poll[]>([])
  const [userVotes, setUserVotes] = useState<Record<number, string>>({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('popular')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/polls')
      .then((r) => r.json())
      .then((d) => {
        setPolls(d.polls || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!user) {
      setUserVotes({})
      return
    }
    fetch('/api/polls/vote?userId=' + user.id)
      .then((r) => r.json())
      .then((d) => setUserVotes(d.votes || {}))
  }, [user])

  const handleVote = async (pollId: number, choice: 'yes' | 'no') => {
    if (!user) {
      router.push(`/login?mode=signup&returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (userVotes[pollId]) return

    const res = await fetch('/api/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, pollId, choice }),
    })

    if (res.ok) {
      setUserVotes((prev) => ({ ...prev, [pollId]: choice }))
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p
          return {
            ...p,
            vote_count_yes: p.vote_count_yes + (choice === 'yes' ? 1 : 0),
            vote_count_no: p.vote_count_no + (choice === 'no' ? 1 : 0),
          }
        })
      )
    }
  }

  const totalVotesAll = useMemo(
    () => polls.reduce((acc, p) => acc + p.vote_count_yes + p.vote_count_no, 0),
    [polls]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = q ? polls.filter((p) => p.question.toLowerCase().includes(q)) : polls.slice()
    result.sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return b.vote_count_yes + b.vote_count_no - (a.vote_count_yes + a.vote_count_no)
    })
    return result
  }, [polls, search, sort])

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '20px',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          opacity: 0.8,
        }}
      >
        <span>
          <strong style={{ fontSize: '16px' }}>{polls.length.toLocaleString()}</strong> polls
        </span>
        <span>
          <strong style={{ fontSize: '16px' }}>{totalVotesAll.toLocaleString()}</strong> total votes
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search polls…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 280px',
            maxWidth: '420px',
            padding: '10px 14px',
            background: 'rgba(20,16,13,0.05)',
            color: INK,
            border: `1px solid ${INK_HAIRLINE}`,
            borderRadius: 0,
            fontFamily: 'Special Elite, monospace',
            fontSize: '15px',
            outline: 'none',
          }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          style={{
            padding: '10px 14px',
            background: 'rgba(20,16,13,0.05)',
            color: INK,
            border: `1px solid ${INK_HAIRLINE}`,
            borderRadius: 0,
            fontFamily: 'Special Elite, monospace',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="popular">Most popular</option>
          <option value="newest">Newest</option>
        </select>
        <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7 }}>
          {filtered.length.toLocaleString()} shown
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: INK_SOFT, fontSize: '14px' }}>
          Loading polls…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: INK_SOFT }}>
          {search ? `No polls match "${search}".` : 'No polls yet.'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          {filtered.map((poll, idx) => (
            <PollCard
              key={poll.id}
              poll={poll}
              tilt={tiltFor(idx)}
              userVote={(userVotes[poll.id] as 'yes' | 'no' | undefined) ?? null}
              onVote={(choice) => handleVote(poll.id, choice)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function tiltFor(i: number) {
  const cycle = [-0.4, 0.3, -0.2, 0.5, -0.3]
  return cycle[i % cycle.length]
}

function PollCard({
  poll,
  tilt,
  userVote,
  onVote,
}: {
  poll: Poll
  tilt: number
  userVote: 'yes' | 'no' | null
  onVote: (choice: 'yes' | 'no') => void
}) {
  const total = poll.vote_count_yes + poll.vote_count_no
  const yesPercent = total > 0 ? Math.round((poll.vote_count_yes / total) * 100) : 50
  const noPercent = total > 0 ? 100 - yesPercent : 50
  const hasVoted = userVote !== null

  return (
    <div
      style={{
        position: 'relative',
        background: CREAM,
        color: INK,
        border: `1px solid ${INK}`,
        boxShadow: `inset 0 0 0 2px ${CREAM}, inset 0 0 0 3px ${INK_HAIRLINE}, 3px 4px 7px rgba(20,16,13,0.18)`,
        padding: '20px 22px',
        transform: `rotate(${tilt}deg)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Vintage ballot header band */}
      <div style={{ textAlign: 'center', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '9px' }}>
        <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold' }}>
          The People&apos;s Ballot
        </div>
        {poll.constituency && (
          <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginTop: '4px' }}>
            {poll.constituency}
          </div>
        )}
      </div>

      <h3
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '19px',
          fontWeight: 'bold',
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          margin: 0,
          textAlign: 'center',
        }}
      >
        {poll.question}
      </h3>

      {poll.explainer && (
        <p style={{ fontSize: '13.5px', lineHeight: 1.55, color: INK_SOFT, margin: 0 }}>
          {poll.explainer}
        </p>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '27px', fontWeight: 'bold', color: SUCCESS, lineHeight: 1 }}>
            {yesPercent}%<span style={{ fontFamily: 'Special Elite, monospace', fontSize: '10px', color: INK_SOFT, letterSpacing: '0.15em', marginLeft: '5px' }}>AYE</span>
          </span>
          <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '10px', color: INK_SOFT, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {total.toLocaleString()} votes
          </span>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '27px', fontWeight: 'bold', color: DANGER, lineHeight: 1 }}>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '10px', color: INK_SOFT, letterSpacing: '0.15em', marginRight: '5px' }}>NO</span>{noPercent}%
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            height: '14px',
            background: CREAM_DEEP,
            border: `1px solid ${INK_HAIRLINE}`,
            overflow: 'hidden',
          }}
          aria-hidden
        >
          <div style={{ width: `${yesPercent}%`, background: SUCCESS, transition: 'width 0.2s ease' }} />
          <div style={{ width: `${noPercent}%`, background: DANGER, transition: 'width 0.2s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
        <VoteButton
          label={userVote === 'yes' ? '✓ Aye' : 'Aye'}
          colour={SUCCESS}
          active={userVote === 'yes'}
          disabled={hasVoted}
          onClick={() => onVote('yes')}
        />
        <VoteButton
          label={userVote === 'no' ? '✓ No' : 'No'}
          colour={DANGER}
          active={userVote === 'no'}
          disabled={hasVoted}
          onClick={() => onVote('no')}
        />
      </div>
    </div>
  )
}

function VoteButton({
  label,
  colour,
  active,
  disabled,
  onClick,
}: {
  label: string
  colour: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  const base = {
    flex: 1,
    padding: '10px 12px',
    fontFamily: 'Special Elite, monospace',
    fontSize: '15px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    border: `1px solid ${INK}`,
    borderRadius: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease',
  }
  const style = active
    ? { ...base, background: colour, color: CREAM, borderColor: colour }
    : disabled
    ? { ...base, background: 'transparent', color: INK_HAIRLINE, borderColor: INK_HAIRLINE }
    : { ...base, background: 'transparent', color: INK }

  return (
    <button onClick={onClick} disabled={disabled} style={style}>
      {label}
    </button>
  )
}
