'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../components/AuthModal'

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

export default function PollsClient() {
  const { user } = useAuth()
  const [polls, setPolls] = useState<Poll[]>([])
  const [userVotes, setUserVotes] = useState<Record<number, string>>({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('popular')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/polls')
      .then(r => r.json())
      .then(d => { setPolls(d.polls || []); setLoading(false); })
  }, [])

  useEffect(() => {
    if (!user) { setUserVotes({}); return; }
    fetch('/api/polls/vote?userId=' + user.id)
      .then(r => r.json())
      .then(d => setUserVotes(d.votes || {}))
  }, [user])

  const handleVote = async (pollId: number, choice: 'yes' | 'no') => {
    if (!user) { setAuthMode('signup'); setShowAuthModal(true); return; }
    if (userVotes[pollId]) return;

    const res = await fetch('/api/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, pollId, choice })
    })

    if (res.ok) {
      setUserVotes(prev => ({ ...prev, [pollId]: choice }))
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p
        return {
          ...p,
          vote_count_yes: p.vote_count_yes + (choice === 'yes' ? 1 : 0),
          vote_count_no: p.vote_count_no + (choice === 'no' ? 1 : 0),
        }
      }))
    }
  }

  const totalVotesAll = polls.reduce((acc, p) => acc + p.vote_count_yes + p.vote_count_no, 0)

  const filtered = polls
    .filter(p => p.question.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return (b.vote_count_yes + b.vote_count_no) - (a.vote_count_yes + a.vote_count_no)
    })

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">

      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">People's Polls</h1>
        <p className="text-white text-sm sm:text-base">
          Have your say on the issues that matter. Vote on questions about policy, politics and public life.
        </p>
      </div>

      <div className="flex gap-6 mb-4">
        <div className="text-sm text-white"><span className="text-white font-semibold">{polls.length}</span> polls</div>
        <div className="text-sm text-white"><span className="text-white font-semibold">{totalVotesAll.toLocaleString()}</span> total votes</div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search polls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[40%] px-4 py-2 bg-[#404040] text-white rounded border border-[#5a5a5a] focus:border-[#ffffff] focus:outline-none text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2 bg-[#404040] text-white text-sm rounded border border-[#5a5a5a] focus:border-[#ffffff] focus:outline-none"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div className="text-white text-sm mb-4">{filtered.length} polls</div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#ffffff] mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((poll) => {
            const total = poll.vote_count_yes + poll.vote_count_no
            const yesPercent = total > 0 ? Math.round((poll.vote_count_yes / total) * 100) : 50
            const noPercent = 100 - yesPercent
            const hasVoted = !!userVotes[poll.id]

            return (
              <div key={poll.id} className="bg-[#505050] border border-[#5a5a5a] rounded-lg p-5 flex flex-col min-h-[180px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm px-2 py-0.5 bg-white/10 text-[#ffffff] rounded border border-white/30">Poll</span>
                  {poll.constituency && (
                    <span className="text-sm px-2 py-0.5 bg-[#404040] text-white rounded border border-[#383838]">
                      {poll.constituency}
                    </span>
                  )}
                </div>

                <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{poll.question}</h3>
                {poll.explainer && (
                  <p className="text-[#c9c9c9] text-sm mb-4 leading-relaxed">{poll.explainer}</p>
                )}

                {/* Vote bar */}
                <div className="mb-1">
                  <div className="h-2 bg-[#404040] rounded-full overflow-hidden flex">
                    <div className="bg-[#4a8a3a] h-full transition-all" style={{ width: yesPercent + '%' }} />
                    <div className="bg-[#8a3a3a] h-full transition-all" style={{ width: noPercent + '%' }} />
                  </div>
                  <div className="flex justify-between text-sm text-white mt-1 mb-3">
                    <span>Yes {yesPercent}% · {poll.vote_count_yes.toLocaleString()}</span>
                    <span>{total.toLocaleString()} votes</span>
                    <span>{poll.vote_count_no.toLocaleString()} · No {noPercent}%</span>
                  </div>
                </div>

                {/* Vote buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote(poll.id, 'yes')}
                    disabled={hasVoted}
                    className={'px-4 py-1.5 rounded text-sm font-medium transition-colors ' + (hasVoted ? (userVotes[poll.id] === 'yes' ? 'bg-[#404040] text-white' : 'bg-[#404040] text-white cursor-not-allowed') : 'bg-[#404040] hover:bg-[#404040] text-white')}
                  >
                    {hasVoted && userVotes[poll.id] === 'yes' ? '✓ Yes' : 'Yes'}
                  </button>
                  <button
                    onClick={() => handleVote(poll.id, 'no')}
                    disabled={hasVoted}
                    className={'px-4 py-1.5 rounded text-sm font-medium transition-colors ' + (hasVoted ? (userVotes[poll.id] === 'no' ? 'bg-[#8a3a3a] text-white' : 'bg-[#404040] text-white cursor-not-allowed') : 'bg-[#8a3a3a] hover:bg-[#8a3a3a] text-white')}
                  >
                    {hasVoted && userVotes[poll.id] === 'no' ? '✓ No' : 'No'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode={authMode} />
    </main>
  )
}
