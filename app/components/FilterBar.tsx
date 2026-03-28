'use client';

import { useState } from 'react';

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
  }) => void;
};

export default function FilterBar({ onFiltersChange }: FilterBarProps) {
  const [house, setHouse] = useState('');
  const [session, setSession] = useState('');
  const [stage, setStage] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [parliamentVoted, setParliamentVoted] = useState(false);
  const [youVoted, setYouVoted] = useState(false);
  const [notVoted, setNotVoted] = useState(false);
  const [hasSummary, setHasSummary] = useState(false);

  const handleFilterChange = (updates: any) => {
    const newFilters = {
      house,
      session,
      stage,
      sortBy,
      parliamentVoted,
      youVoted,
      notVoted,
      hasSummary,
      ...updates
    };
    
    Object.keys(updates).forEach(key => {
      const value = updates[key];
      if (key === 'house') setHouse(value);
      if (key === 'session') setSession(value);
      if (key === 'stage') setStage(value);
      if (key === 'sortBy') setSortBy(value);
      if (key === 'parliamentVoted') setParliamentVoted(value);
      if (key === 'youVoted') setYouVoted(value);
      if (key === 'notVoted') setNotVoted(value);
      if (key === 'hasSummary') setHasSummary(value);
    });
    
    onFiltersChange(newFilters);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3 mb-3">
        <select
          value={sortBy}
          onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
          className="px-3 py-2 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="newest">📅 Date Updated (Newest First)</option>
          <option value="oldest">📅 Date Updated (Oldest First)</option>
        </select>

        <select
          value={house}
          onChange={(e) => handleFilterChange({ house: e.target.value })}
          className="px-3 py-2 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">🏛️ House: All</option>
          <option value="Commons">Commons (3,048)</option>
          <option value="Lords">Lords (817)</option>
        </select>

        <select
          value={session}
          onChange={(e) => handleFilterChange({ session: e.target.value })}
          className="px-3 py-2 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">📊 Session: All</option>
          <option value="39">Session 39 (Current - 368)</option>
          <option value="38">Session 38 (225)</option>
          <option value="37">Session 37 (350)</option>
          <option value="36">Session 36 (294)</option>
          <option value="35">Session 35 (333)</option>
        </select>

        <select
          value={stage}
          onChange={(e) => handleFilterChange({ stage: e.target.value })}
          className="px-3 py-2 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">🎯 Stage: All</option>
          <option value="1st reading">1st Reading (246)</option>
          <option value="2nd reading">2nd Reading (2,704)</option>
          <option value="Committee stage">Committee Stage (76)</option>
          <option value="Report stage">Report Stage (37)</option>
          <option value="3rd reading">3rd Reading (34)</option>
          <option value="Royal Assent">Royal Assent (683)</option>
          <option value="Withdrawn">Withdrawn (67)</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange({ parliamentVoted: !parliamentVoted })}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            parliamentVoted
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ✓ Parliament Voted
        </button>

        <button
          onClick={() => handleFilterChange({ youVoted: !youVoted })}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            youVoted
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ✓ You Voted
        </button>
      </div>
    </div>
  );
}
