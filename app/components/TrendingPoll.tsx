'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

type Poll = {
  id: number
  question: string
  vote_count_yes: number
  vote_count_no: number
}

export default function TrendingPoll() {
  const { user } = useAuth()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [userVote, setUserVote] = useState<string | null>(null)
  const [showAuth, setShowAuth] = useState(false)

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
    if (!user) { window.dispatchEvent(new CustomEvent('openAuth', { detail: 'signup' })); return; }
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

  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-800/40 whitespace-nowrap">Trending Poll</span>
          <p className="text-sm text-white flex-1 min-w-[200px]">{poll.question}</p>
          <div className="flex items-center gap-3 flex-shrink-0">
            {total > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                  <div className="bg-green-500 h-full" style={{ width: yesPercent + '%' }} />
                  <div className="bg-rose-500 h-full" style={{ width: noPercent + '%' }} />
                </div>
                <span>{total} votes</span>
              </div>
            )}
            <button
              onClick={() => handleVote('yes')}
              disabled={!!userVote}
              className={'px-3 py-1 rounded text-xs font-medium transition-colors ' + (userVote === 'yes' ? 'bg-green-700 text-white' : userVote ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-800 hover:bg-green-700 text-white')}
            >
              {userVote === 'yes' ? '✓ Yes' : 'Yes'}
            </button>
            <button
              onClick={() => handleVote('no')}
              disabled={!!userVote}
              className={'px-3 py-1 rounded text-xs font-medium transition-colors ' + (userVote === 'no' ? 'bg-rose-700 text-white' : userVote ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-rose-800 hover:bg-rose-700 text-white')}
            >
              {userVote === 'no' ? '✓ No' : 'No'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
