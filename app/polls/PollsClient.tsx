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
        background: 'transparent',
        color: INK,
        border: `3px double ${INK}`,
        boxShadow: '2px 3px 6px rgba(20,16,13,0.14)',
        transform: `rotate(${tilt}deg)`,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Tear-off stub: perforated edge, vertical title + serial number */}
      <div
        style={{
          flexShrink: 0,
          width: '34px',
          borderRight: '2px dashed rgba(20,16,13,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0',
        }}
      >
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: INK_SOFT, whiteSpace: 'nowrap' }}>
          The People&apos;s Ballot
        </span>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.06em', color: ACCENT, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          No. {String(poll.id).padStart(4, '0')}
        </span>
      </div>

      {/* Main ballot */}
      <div style={{ flex: 1, minWidth: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {poll.constituency && (
          <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
            {poll.constituency}
          </div>
        )}

        <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0 }}>
          {poll.question}
        </h3>

        {poll.explainer && (
          <p style={{ fontSize: '13px', lineHeight: 1.5, color: INK_SOFT, margin: 0 }}>
            {poll.explainer}
          </p>
        )}

        <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '13px', fontStyle: 'italic', color: INK_SOFT, letterSpacing: '0.03em', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '9px' }}>
          Mark one box with a cross.
        </div>

        <div>
          <BallotRow label="Aye" marked={userVote === 'yes'} disabled={hasVoted} onClick={() => onVote('yes')} />
          <BallotRow label="No" marked={userVote === 'no'} disabled={hasVoted} onClick={() => onVote('no')} />
        </div>

        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '9px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>The count so far</span>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', letterSpacing: '0.08em', color: INK_SOFT }}>{total.toLocaleString()} votes</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', color: SUCCESS, lineHeight: 1 }}>
              {yesPercent}%<span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', color: INK_SOFT, letterSpacing: '0.12em', marginLeft: '4px' }}>AYE</span>
            </span>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', color: DANGER, lineHeight: 1 }}>
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '9px', color: INK_SOFT, letterSpacing: '0.12em', marginRight: '4px' }}>NO</span>{noPercent}%
            </span>
          </div>
          <div style={{ display: 'flex', height: '10px', background: CREAM_DEEP, border: `1px solid ${INK_HAIRLINE}`, overflow: 'hidden' }} aria-hidden>
            <div style={{ width: `${yesPercent}%`, background: SUCCESS }} />
            <div style={{ width: `${noPercent}%`, background: DANGER }} />
          </div>
        </div>
      </div>

      {/* "Voted" stamp, slapped on once the ballot is cast */}
      {hasVoted && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            transform: 'rotate(-13deg)',
            border: `3px double ${ACCENT}`,
            padding: '2px 9px',
            color: ACCENT,
            fontFamily: 'Special Elite, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        >
          Voted
        </div>
      )}
    </div>
  )
}

function BallotRow({
  label,
  marked,
  disabled,
  onClick,
}: {
  label: string
  marked: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Vote ${label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        padding: '7px 0',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '17px', fontWeight: 'bold', color: INK, minWidth: '52px' }}>{label}</span>
      <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${INK_HAIRLINE}`, alignSelf: 'flex-end', marginBottom: '7px' }} />
      <span
        style={{
          width: '30px',
          height: '30px',
          border: `1.5px solid ${INK}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
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
