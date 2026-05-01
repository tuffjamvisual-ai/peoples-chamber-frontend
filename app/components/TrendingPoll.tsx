'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

type Poll = {
  id: number
  question: string
  constituency: string | null
  vote_count_yes: number
  vote_count_no: number
}

export default function TrendingPoll() {
  const { user } = useAuth()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [userVote, setUserVote] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/polls')
      .then(r => r.json())
      .then(d => {
        const polls = d.polls || []
        if (polls.length === 0) return
        const trending = polls.sort((a: Poll, b: Poll) =>
          (b.vote_count_yes + b.vote_count_no) - (a.vote_count_yes + a.vote_count_no)
        )[0]
        setPoll(trending)
      })
  }, [])

  useEffect(() => {
    if (!user || !poll) return
    fetch('/api/polls/vote?userId=' + user.id)
      .then(r => r.json())
      .then(d => setUserVote(d.votes?.[poll.id] || null))
  }, [user, poll])

  const handleVote = async (choice: 'yes' | 'no') => {
    if (!user) return
    if (userVote) return
    const res = await fetch('/api/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, pollId: poll!.id, choice })
    })
    if (res.ok) {
      setUserVote(choice)
      setPoll(prev => prev ? {
        ...prev,
        vote_count_yes: prev.vote_count_yes + (choice === 'yes' ? 1 : 0),
        vote_count_no: prev.vote_count_no + (choice === 'no' ? 1 : 0),
      } : prev)
    }
  }

  if (!poll) return null

  const total = poll.vote_count_yes + poll.vote_count_no
  const yesPercent = total > 0 ? Math.round((poll.vote_count_yes / total) * 100) : 50
  const noPercent = 100 - yesPercent
  const hasVoted = !!userVote

  return (
    <div className="w-full">
      <div className="text-xs text-white uppercase tracking-wider mb-2">Trending People's Poll</div>
      <div className="bg-[#001520] border border-[#1c3849] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs px-2 py-0.5 bg-white/10 text-[#ffffff] rounded border border-white/30">Poll</span>
          {poll.constituency && (
            <span className="text-xs px-2 py-0.5 bg-[#1c3849] text-white rounded border border-[#405b6b]">{poll.constituency}</span>
        )}
        </div>

        <h3 className="text-white font-semibold text-sm mb-3 leading-snug">{poll.question}</h3>

        {(
          <>
            <div className="h-8 bg-[#1c3849] rounded-full overflow-hidden flex mb-2">
              <div className="bg-[#4a8a3a] h-full transition-all" style={{ width: yesPercent + '%' }} />
              <div className="bg-[#8a3a3a] h-full transition-all" style={{ width: noPercent + '%' }} />
            </div>
            <div className="flex justify-between text-xs text-white mb-3">
              <span>Yes {yesPercent}% · {poll.vote_count_yes}</span>
              <span>{total} votes</span>
              <span>{poll.vote_count_no} · No {noPercent}%</span>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => handleVote('yes')}
            disabled={hasVoted}
            className={'px-4 py-1.5 rounded text-xs font-medium transition-colors ' + (hasVoted ? (userVote === 'yes' ? 'bg-[#405b6b] text-white' : 'bg-[#405b6b] text-white cursor-not-allowed') : 'bg-[#1c3849] hover:bg-[#405b6b] text-white')}
          >
            {userVote === 'yes' ? '✓ Yes' : 'Yes'}
          </button>
          <button
            onClick={() => handleVote('no')}
            disabled={hasVoted}
            className={'px-4 py-1.5 rounded text-xs font-medium transition-colors ' + (hasVoted ? (userVote === 'no' ? 'bg-[#8a3a3a] text-white' : 'bg-[#405b6b] text-white cursor-not-allowed') : 'bg-[#8a3a3a] hover:bg-[#8a3a3a] text-white')}
          >
            {userVote === 'no' ? '✓ No' : 'No'}
          </button>
        </div>
      </div>
    </div>
  )
}
