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
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Trending People's Poll</div>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-800/40">Poll</span>
          {poll.constituency && (
            <span className="text-xs px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-800/40">{poll.constituency}</span>
          )}
        </div>

        <h3 className="text-white font-semibold text-sm mb-3 leading-snug">{poll.question}</h3>

        {total > 0 && (
          <>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex mb-1">
              <div className="bg-green-500 h-full transition-all" style={{ width: yesPercent + '%' }} />
              <div className="bg-rose-500 h-full transition-all" style={{ width: noPercent + '%' }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mb-3">
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
            className={'px-4 py-1.5 rounded text-xs font-medium transition-colors ' + (hasVoted ? (userVote === 'yes' ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed') : 'bg-green-800 hover:bg-green-700 text-white')}
          >
            {userVote === 'yes' ? '✓ Yes' : 'Yes'}
          </button>
          <button
            onClick={() => handleVote('no')}
            disabled={hasVoted}
            className={'px-4 py-1.5 rounded text-xs font-medium transition-colors ' + (hasVoted ? (userVote === 'no' ? 'bg-rose-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed') : 'bg-rose-800 hover:bg-rose-700 text-white')}
          >
            {userVote === 'no' ? '✓ No' : 'No'}
          </button>
        </div>
      </div>
    </div>
  )
}
