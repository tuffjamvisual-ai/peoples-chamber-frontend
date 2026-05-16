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
const SUCCESS = '#4a8a3a'
const DANGER = '#a64030'

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
            background: CREAM,
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
            background: CREAM,
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
        background: CREAM,
        color: INK,
        border: `1px solid ${INK_HAIRLINE}`,
        padding: '20px 22px',
        transform: `rotate(${tilt}deg)`,
        boxShadow: '2px 3px 0 rgba(20,16,13,0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            padding: '3px 8px',
            background: ACCENT,
            color: CREAM,
            fontWeight: 'bold',
          }}
        >
          Poll
        </span>
        {poll.constituency && (
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: INK_SOFT,
              border: `1px solid ${INK_HAIRLINE}`,
              padding: '2px 7px',
            }}
          >
            {poll.constituency}
          </span>
        )}
      </div>

      <h3
        style={{
          fontSize: '17px',
          fontWeight: 'bold',
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
          margin: 0,
        }}
      >
        {poll.question}
      </h3>

      {poll.explainer && (
        <p style={{ fontSize: '14px', lineHeight: 1.55, color: INK_SOFT, margin: 0 }}>
          {poll.explainer}
        </p>
      )}

      <div>
        <div
          style={{
            display: 'flex',
            height: '10px',
            background: CREAM_DEEP,
            border: `1px solid ${INK_HAIRLINE}`,
            overflow: 'hidden',
          }}
          aria-hidden
        >
          <div style={{ width: `${yesPercent}%`, background: SUCCESS, transition: 'width 0.2s ease' }} />
          <div style={{ width: `${noPercent}%`, background: DANGER, transition: 'width 0.2s ease' }} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '12px',
            color: INK_SOFT,
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ color: SUCCESS, fontWeight: 'bold' }}>
            Yes {yesPercent}% · {poll.vote_count_yes.toLocaleString()}
          </span>
          <span>{total.toLocaleString()} votes</span>
          <span style={{ color: DANGER, fontWeight: 'bold' }}>
            {poll.vote_count_no.toLocaleString()} · No {noPercent}%
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <VoteButton
          label={userVote === 'yes' ? '✓ Yes' : 'Yes'}
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
    padding: '9px 12px',
    fontFamily: 'Special Elite, monospace',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    border: `1px solid ${colour}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s ease',
  }
  const style = active
    ? { ...base, background: colour, color: CREAM }
    : disabled
    ? { ...base, background: 'transparent', color: INK_SOFT, borderColor: INK_HAIRLINE }
    : { ...base, background: 'transparent', color: colour }

  return (
    <button onClick={onClick} disabled={disabled} style={style}>
      {label}
    </button>
  )
}
