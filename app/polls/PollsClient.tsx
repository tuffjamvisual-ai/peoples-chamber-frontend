'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import Toast from '../components/Toast'

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
const INK_SOFT = '#14100d'
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
  const [sort, setSort] = useState<SortOption>('newest')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/polls')
      .then((r) => r.json())
      .then((d) => {
        setPolls(d.polls || [])
        setLoading(false)
      })
  }, [])

  // Deep link: /polls#poll-<id> should land the reader on that poll's card,
  // not the top of the list. Polls render only after the async fetch above,
  // so the browser's native #hash scroll fires before the target exists —
  // we scroll (and briefly highlight) once the cards are in the DOM.
  const didHashScroll = useRef(false)
  useEffect(() => {
    if (didHashScroll.current || loading || polls.length === 0) return
    const m = window.location.hash.match(/^#poll-(\d+)$/)
    if (!m) return
    const el = document.getElementById(`poll-${m[1]}`)
    if (!el) return
    didHashScroll.current = true
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.outline = '3px solid rgba(122,22,18,0.7)'
      el.style.outlineOffset = '4px'
      setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = '' }, 1800)
    })
  }, [loading, polls])

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
    // Already voted on this poll — tell them instead of silently doing nothing.
    if (userVotes[pollId]) {
      setNotice('You have already voted on this poll.')
      return
    }

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
    } else {
      // Surface the server's reason (already voted elsewhere, email not
      // confirmed, etc.) rather than failing silently.
      const d = await res.json().catch(() => null)
      if (res.status === 400) setUserVotes((prev) => ({ ...prev, [pollId]: choice }))
      setNotice(
        d?.error === 'Already voted'
          ? 'You have already voted on this poll.'
          : d?.error || 'Your vote could not be recorded. Please try again.',
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
      <Toast message={notice} onDone={() => setNotice(null)} />
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '20px',
          fontSize: '15px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          opacity: 1,
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
            fontSize: '15px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="newest">Newest</option>
          <option value="popular">Most popular</option>
        </select>
        <span style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 1 }}>
          {filtered.length.toLocaleString()} shown
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: INK_SOFT, fontSize: '15px' }}>
          Loading polls…
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {!search && <VIBallotCard tilt={-0.4} />}
            {filtered.map((poll, idx) => (
              <PollCard
                key={poll.id}
                poll={poll}
                tilt={tiltFor(idx + 1)}
                userVote={(userVotes[poll.id] as 'yes' | 'no' | undefined) ?? null}
                onVote={(choice) => handleVote(poll.id, choice)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: INK_SOFT }}>
              {search ? `No polls match "${search}".` : 'No other polls yet.'}
            </div>
          )}
        </>
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
      id={`poll-${poll.id}`}
      style={{
        scrollMarginTop: '90px',
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
          justifyContent: 'center',
          padding: '14px 0',
        }}
      >
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.06em', color: ACCENT, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          No. {String(poll.id).padStart(4, '0')}
        </span>
      </div>

      {/* Main ballot */}
      <div style={{ flex: 1, minWidth: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {poll.constituency && (
          <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
            {poll.constituency}
          </div>
        )}

        <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0 }}>
          {poll.question}
        </h3>

        {poll.explainer && (
          <p style={{ fontSize: '15px', lineHeight: 1.5, color: INK_SOFT, margin: 0 }}>
            {poll.explainer}
          </p>
        )}

        <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', fontStyle: 'italic', color: INK_SOFT, letterSpacing: '0.03em', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '9px' }}>
          Mark one box with a cross.
        </div>

        <div>
          <BallotRow label="Aye" marked={userVote === 'yes'} disabled={false} onClick={() => onVote('yes')} />
          <BallotRow label="No" marked={userVote === 'no'} disabled={false} onClick={() => onVote('no')} />
        </div>

        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '9px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>The count so far</span>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.08em', color: INK_SOFT }}>{total.toLocaleString()} votes</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', color: SUCCESS, lineHeight: 1 }}>
              {yesPercent}%<span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK_SOFT, letterSpacing: '0.12em', marginLeft: '4px' }}>AYE</span>
            </span>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', color: DANGER, lineHeight: 1 }}>
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK_SOFT, letterSpacing: '0.12em', marginRight: '4px' }}>NO</span>{noPercent}%
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
            fontSize: '15px',
            fontWeight: 'bold',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 1,
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

// Reader voting-intention poll (poll_type 'voting_intention'), rendered as a
// party ballot alongside the yes/no polls. Votes via /api/reader-vi (session
// cookie); one changeable vote per account; results seeded with the poll-of-
// polls baseline until readers accumulate.
const VI_PARTIES = [
  { key: 'reform', label: 'Reform UK', colour: '#12B6CF' },
  { key: 'labour', label: 'Labour', colour: '#E4003B' },
  { key: 'conservative', label: 'Conservative', colour: '#0087DC' },
  { key: 'green', label: 'Green', colour: '#6AB023' },
  { key: 'libdem', label: 'Lib Dem', colour: '#FAA61A' },
  { key: 'snp', label: 'SNP', colour: '#BBab00' },
  { key: 'restore', label: 'Restore Britain', colour: '#26408B' },
  { key: 'another', label: 'Another party', colour: '#777' },
  { key: 'wouldnt', label: "Wouldn't vote", colour: '#aaa' },
]

function fmtVIDate(iso: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' }
}

function VIBallotCard({ tilt }: { tilt: number }) {
  const router = useRouter()
  const { user } = useAuth()
  const [tally, setTally] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [userVote, setUserVote] = useState<string | null>(null)
  const [userVoteText, setUserVoteText] = useState<string | null>(null)
  const [votedAt, setVotedAt] = useState<string | null>(null)
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const apply = (d: { tally?: Record<string, number>; total?: number; userVote?: string | null; userVoteText?: string | null; votedAt?: string | null; seeded?: boolean }) => {
    setTally(d.tally || {}); setTotal(d.total || 0); setUserVote(d.userVote ?? null)
    setUserVoteText(d.userVoteText ?? null); setVotedAt(d.votedAt ?? null)
  }
  useEffect(() => { fetch('/api/reader-vi').then((r) => r.json()).then(apply).catch(() => {}) }, [user])

  const login = () => router.push(`/login?mode=signup&returnTo=${encodeURIComponent('/polls')}`)

  const cast = async (key: string, text?: string) => {
    if (!user) { login(); return }
    if (key === 'another' && !(text || '').trim()) { setOtherOpen(true); return }
    setBusy(true); setErr(null)
    const res = await fetch('/api/reader-vi', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ party: key, otherText: key === 'another' ? (text || '').trim() : undefined }),
    })
    setBusy(false)
    if (res.status === 401) { login(); return }
    const d = await res.json()
    if (!res.ok) { setErr(d.error || 'Could not record your vote.'); return }
    apply(d); setOtherOpen(false); setOtherText('')
  }

  const pct = (k: string) => (total > 0 ? Math.round(((tally[k] || 0) / total) * 100) : 0)
  const voted = userVote !== null
  const currentLabel = userVote ? (userVote === 'another' && userVoteText ? userVoteText : VI_PARTIES.find((p) => p.key === userVote)?.label ?? userVote) : ''

  return (
    <div id="poll-73" style={{ scrollMarginTop: '90px', position: 'relative', background: 'transparent', color: INK, border: `3px double ${INK}`, boxShadow: '2px 3px 6px rgba(20,16,13,0.14)', transform: `rotate(${tilt}deg)`, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, width: '34px', borderRight: '2px dashed rgba(20,16,13,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 0' }}>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.06em', color: ACCENT, fontWeight: 'bold', whiteSpace: 'nowrap' }}>No. 0073</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
        <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '8px' }}>
          Voting intention
        </div>
        <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '18px', fontWeight: 'bold', lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0 }}>
          If a general election were held tomorrow, how would you vote?
        </h3>
        <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', fontStyle: 'italic', color: INK_SOFT, letterSpacing: '0.03em', borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '9px' }}>
          Mark one box with a cross. You can change it any time.
        </div>
        <div>
          {VI_PARTIES.map((p) => (
            <button key={p.key} onClick={() => cast(p.key)} disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer', textAlign: 'left' }}>
              <span aria-hidden style={{ width: '11px', height: '11px', borderRadius: '2px', background: p.colour, flexShrink: 0 }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 'bold', color: INK }}>{p.label}</span>
              <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${INK_HAIRLINE}`, alignSelf: 'flex-end', marginBottom: '6px' }} />
              <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK_SOFT, fontVariantNumeric: 'tabular-nums', minWidth: '38px', textAlign: 'right' }}>{pct(p.key)}%</span>
              <span style={{ width: '26px', height: '26px', border: `1.5px solid ${INK}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', lineHeight: 1, color: ACCENT, flexShrink: 0 }}>
                {userVote === p.key ? '✗' : ''}
              </span>
            </button>
          ))}
          {otherOpen && (
            <div style={{ display: 'flex', gap: '8px', margin: '6px 0 0' }}>
              <input type="text" value={otherText} onChange={(e) => setOtherText(e.target.value)} maxLength={60} placeholder="Which party?"
                style={{ flex: 1, fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK, padding: '6px 9px', border: `1px solid ${INK_HAIRLINE}`, background: '#fff' }} />
              <button onClick={() => cast('another', otherText)} disabled={busy}
                style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: '#f4e8d4', background: INK, border: `1px solid ${INK}`, padding: '6px 12px', cursor: 'pointer' }}>Vote</button>
            </div>
          )}
        </div>
        {err && <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: DANGER, margin: 0 }}>{err}</p>}
        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '9px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>The count so far</span>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', letterSpacing: '0.08em', color: INK_SOFT }}>{total.toLocaleString()} votes</span>
          </div>
          {voted && (
            <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK_SOFT, margin: '6px 0 0' }}>
              You last voted {currentLabel}{votedAt ? ` on ${fmtVIDate(votedAt)}` : ''}.
            </p>
          )}
          {!user && (
            <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK_SOFT, margin: '6px 0 0' }}>Log in to cast your vote.</p>
          )}
        </div>
      </div>
      {voted && (
        <div aria-hidden style={{ position: 'absolute', top: '12px', right: '12px', transform: 'rotate(-13deg)', border: `3px double ${ACCENT}`, padding: '2px 9px', color: ACCENT, fontFamily: 'Special Elite, monospace', fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.18em', textTransform: 'uppercase', pointerEvents: 'none' }}>Voted</div>
      )}
    </div>
  )
}
