'use client'

import { useState } from 'react'

const SAMPLE_POLLS = [
  {
    id: 1,
    question: 'Should the UK join the US and Israel in military action against Iran?',
    yes: 699,
    no: 302,
    daysAgo: 25,
    constituency: 'Stratford and Bow'
  },
  {
    id: 2,
    question: 'Should the UK ban social media for under 16s?',
    yes: 305,
    no: 569,
    daysAgo: 22,
    constituency: 'Tonbridge'
  },
  {
    id: 3,
    question: 'Should the government increase the minimum wage to £15 per hour?',
    yes: 1204,
    no: 433,
    daysAgo: 18,
    constituency: 'Birmingham Ladywood'
  },
  {
    id: 4,
    question: 'Should the UK rejoin the European Union?',
    yes: 876,
    no: 921,
    daysAgo: 15,
    constituency: 'Edinburgh South'
  },
  {
    id: 5,
    question: 'Should tuition fees be abolished for UK universities?',
    yes: 1543,
    no: 287,
    daysAgo: 10,
    constituency: 'Leeds Central'
  },
  {
    id: 6,
    question: 'Should the NHS be fully nationalised with no private involvement?',
    yes: 2103,
    no: 654,
    daysAgo: 7,
    constituency: 'Manchester Gorton'
  },
]

type SortOption = 'newest' | 'popular'

export default function PollsClient() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('popular')

  const totalVotesAll = SAMPLE_POLLS.reduce((acc, p) => acc + p.yes + p.no, 0)

  const filtered = SAMPLE_POLLS
    .filter(p => p.question.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return a.daysAgo - b.daysAgo
      return (b.yes + b.no) - (a.yes + a.no)
    })

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Polls</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Have your say on the issues that matter. Vote on questions about policy, politics and public life.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-white">{SAMPLE_POLLS.length}</div>
          <div className="text-gray-400 text-sm mt-1">Total Polls</div>
        </div>
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-white">{totalVotesAll.toLocaleString()}</div>
          <div className="text-gray-400 text-sm mt-1">Total Votes</div>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search polls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div className="text-gray-500 text-sm mb-4">{filtered.length} polls</div>

      {/* Polls Grid - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((poll) => {
          const total = poll.yes + poll.no
          const yesPercent = Math.round((poll.yes / total) * 100)
          const noPercent = 100 - yesPercent

          return (
            <div key={poll.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-800/40">Poll</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{poll.daysAgo}d ago</span>
                  {poll.constituency && (
                    <span className="text-xs px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-800/40">
                      {poll.constituency}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-white font-semibold text-sm mb-4 leading-snug">
                {poll.question}
              </h3>

              {/* Vote bar */}
              <div className="h-8 bg-gray-800 rounded-full overflow-hidden flex mb-2">
                <div
                  className="bg-green-500 h-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ width: `${yesPercent}%` }}
                >
                  {yesPercent}%
                </div>
                <div
                  className="bg-rose-500 h-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ width: `${noPercent}%` }}
                >
                  {noPercent}%
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  Yes ({poll.yes.toLocaleString()})
                </span>
                <span className="text-gray-500">{total.toLocaleString()} votes</span>
                <span className="flex items-center gap-1">
                  No ({poll.no.toLocaleString()})
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                </span>
              </div>
            </div>
          )
        })}
      </div>

    </main>
  )
}
