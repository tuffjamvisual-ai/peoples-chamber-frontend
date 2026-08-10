'use client';

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

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

const INK = '#14100d';
const CREAM = '#ebe5d8';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';

// Parchment form controls, matching the opengovt Polls search/sort styling.
const field: CSSProperties = {
  padding: '10px 14px',
  background: 'rgba(20,16,13,0.05)',
  color: INK,
  border: `1px solid ${INK_HAIRLINE}`,
  borderRadius: 0,
  fontFamily: 'Special Elite, monospace',
  fontSize: '15px',
  outline: 'none',
};

function toggle(active: boolean): CSSProperties {
  return {
    padding: '9px 14px',
    background: active ? INK : 'transparent',
    color: active ? CREAM : INK,
    border: `1px solid ${active ? INK : INK_HAIRLINE}`,
    borderRadius: 0,
    fontFamily: 'Special Elite, monospace',
    fontSize: '15px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  };
}

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
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', alignItems: 'baseline' }}>
        <input
          type="text"
          placeholder="Search bills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...field, flex: '1 1 280px', maxWidth: '420px' }}
        />

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
          <option value="trending">Most voted</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        <select value={house} onChange={(e) => setHouse(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
          <option value="">House: All</option>
          <option value="Commons">Commons</option>
          <option value="Lords">Lords</option>
        </select>

        <select value={session} onChange={(e) => setSession(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
          <option value="">Session: All</option>
          <option value="39">Session 39</option>
          <option value="38">Session 38</option>
          <option value="37">Session 37</option>
          <option value="36">Session 36</option>
          <option value="35">Session 35</option>
        </select>

        <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
          <option value="">Stage: All</option>
          <option value="1st reading">1st Reading</option>
          <option value="2nd reading">2nd Reading</option>
          <option value="Committee stage">Committee Stage</option>
          <option value="Report stage">Report Stage</option>
          <option value="3rd reading">3rd Reading</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => setParliamentVoted(!parliamentVoted)} style={toggle(parliamentVoted)}>
          Parliament voted
        </button>
        <button onClick={() => setYouVoted(!youVoted)} style={toggle(youVoted)}>
          You voted
        </button>
        <button onClick={() => setHasSummary(!hasSummary)} style={toggle(hasSummary)}>
          Has summary
        </button>
      </div>
    </div>
  );
}
