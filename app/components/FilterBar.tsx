'use client';

import { useState, useEffect } from 'react';

type FilterBarProps = {
  onFiltersChange: (filters: {
    house: string;
    session: string;
    stage: string;
    sortBy: string;
    parliamentVoted: boolean;
    youVoted: boolean;
    notVoted: boolean;
    hasSummary: boolean;
    search: string;
  }) => void;
};

export default function FilterBar({ onFiltersChange }: FilterBarProps) {
  const [house, setHouse] = useState('');
  const [session, setSession] = useState('');
  const [stage, setStage] = useState('');
  const [sortBy, setSortBy] = useState('trending');
  const [parliamentVoted, setParliamentVoted] = useState(false);
  const [youVoted, setYouVoted] = useState(false);
  const [notVoted, setNotVoted] = useState(false);
  const [hasSummary, setHasSummary] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    onFiltersChange({ house, session, stage, sortBy, parliamentVoted, youVoted, notVoted, hasSummary, search });
  }, [house, session, stage, sortBy, parliamentVoted, youVoted, notVoted, hasSummary, search]);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3 mb-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 bg-[#1c3849] text-white text-sm rounded border border-[#1c3849] focus:border-[#ffffff] focus:outline-none"
        >
          <option value="trending">Trending</option>
          <option value="newest">Date Updated (Newest First)</option>
          <option value="oldest">Date Updated (Oldest First)</option>
        </select>

        <select
          value={house}
          onChange={(e) => setHouse(e.target.value)}
          className="px-3 py-2 bg-[#1c3849] text-white text-sm rounded border border-[#1c3849] focus:border-[#ffffff] focus:outline-none"
        >
          <option value="">House: All</option>
          <option value="Commons">Commons</option>
          <option value="Lords">Lords</option>
        </select>

        <select
          value={session}
          onChange={(e) => setSession(e.target.value)}
          className="px-3 py-2 bg-[#1c3849] text-white text-sm rounded border border-[#1c3849] focus:border-[#ffffff] focus:outline-none"
        >
          <option value="">Session: All</option>
          <option value="39">Session 39</option>
          <option value="38">Session 38</option>
          <option value="37">Session 37</option>
          <option value="36">Session 36</option>
          <option value="35">Session 35</option>
        </select>

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="px-3 py-2 bg-[#1c3849] text-white text-sm rounded border border-[#1c3849] focus:border-[#ffffff] focus:outline-none"
        >
          <option value="">Stage: All</option>
          <option value="1st reading">1st Reading</option>
          <option value="2nd reading">2nd Reading</option>
          <option value="Committee stage">Committee Stage</option>
          <option value="Report stage">Report Stage</option>
          <option value="3rd reading">3rd Reading</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setParliamentVoted(!parliamentVoted)}
          className={'px-3 py-2 text-sm rounded transition-colors ' + (parliamentVoted ? 'bg-[#ffffff] text-white' : 'bg-[#405b6b] text-[#c9c9c9] hover:bg-[#405b6b]')}
        >
          Parliament Voted
        </button>
        <button
          onClick={() => setYouVoted(!youVoted)}
          className={'px-3 py-2 text-sm rounded transition-colors ' + (youVoted ? 'bg-[#ffffff] text-white' : 'bg-[#405b6b] text-[#c9c9c9] hover:bg-[#405b6b]')}
        >
          You Voted
        </button>
        <input
          type="text"
          placeholder="Search bills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{width: '340px'}}
          className="px-4 py-2 bg-[#1c3849] text-white rounded border border-[#1c3849] focus:border-[#ffffff] focus:outline-none text-sm"
        />
      </div>
    </div>
  );
}
