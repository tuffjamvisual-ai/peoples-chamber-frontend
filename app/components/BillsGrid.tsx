'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import type { CSSProperties } from 'react';
import FilterBar from './FilterBar';
import BillCoverCard from './BillCoverCard';

const INK = '#14100d';
const CREAM = '#ebe5d8';
const pageBtn = (disabled: boolean): CSSProperties => ({
  padding: '6px 14px',
  background: 'transparent',
  color: INK,
  border: `1px solid ${INK}`,
  borderRadius: 0,
  fontFamily: 'Special Elite, monospace',
  fontSize: '13px',
  letterSpacing: '0.06em',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.3 : 1,
});

type Props = {
  initialBills: any[];
  currentPage: number;
  totalPages: number;
};

export default function BillsGrid({ initialBills, currentPage, totalPages }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [bills, setBills] = useState(initialBills);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});

  const [houseFilter, setHouseFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortBy, setSortBy] = useState('trending');
  const [parliamentVotedFilter, setParliamentVotedFilter] = useState(false);
  const [youVotedFilter, setYouVotedFilter] = useState(false);
  const [notVotedFilter, setNotVotedFilter] = useState(false);
  const [hasSummaryFilter, setHasSummaryFilter] = useState(false);

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    router.push(clamped === 1 ? '/bills' : `/bills?page=${clamped}`);
  };

  useEffect(() => {
    async function fetchUserVotes() {
      if (!user) { setUserVotes({}); return; }
      try {
        const response = await fetch(`/api/vote?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setUserVotes(data.votes || {});
        }
      } catch (error) {
        console.error('Error fetching user votes:', error);
      }
    }
    fetchUserVotes();
  }, [user]);

  const handleVote = async (billId: number, choice: 'yes' | 'no') => {
    if (!user) { router.push(`/login?mode=signup&returnTo=${encodeURIComponent(window.location.pathname)}`); return; }
    if (userVotes[billId]) return;
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, billId, choice })
      });
      if (!response.ok) return;
      setUserVotes(prev => ({ ...prev, [billId]: choice }));
      setBills(prev => prev.map((bill: any) => {
        if (bill.id !== billId) return bill;
        return {
          ...bill,
          vote_count_yes: bill.vote_count_yes + (choice === 'yes' ? 1 : 0),
          vote_count_no: bill.vote_count_no + (choice === 'no' ? 1 : 0),
        };
      }));
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const filteredBills = useMemo(() => {
    let filtered = [...bills];

    filtered = filtered.filter((bill: any) => !bill.bill_withdrawn && !bill.is_act);

    if (searchTerm) {
      filtered = filtered.filter((bill: any) =>
        bill.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (houseFilter) filtered = filtered.filter((bill: any) => bill.originating_house === houseFilter);
    if (sessionFilter) filtered = filtered.filter((bill: any) => bill.introduced_session_id?.toString() === sessionFilter);
    if (stageFilter) filtered = filtered.filter((bill: any) => bill.current_stage === stageFilter);
    if (parliamentVotedFilter) filtered = filtered.filter((bill: any) => bill.commons_ayes !== null && bill.commons_noes !== null);
    if (youVotedFilter) filtered = filtered.filter((bill: any) => userVotes[bill.id]);
    if (notVotedFilter) filtered = filtered.filter((bill: any) => !userVotes[bill.id]);
    if (hasSummaryFilter) filtered = filtered.filter((bill: any) => bill.plain_summary);

    if (sortBy === 'trending') {
      filtered.sort((a: any, b: any) => 
        (b.vote_count_yes + b.vote_count_no + b.vote_count_abstain) - (a.vote_count_yes + a.vote_count_no + a.vote_count_abstain)
      );
    } else if (sortBy === 'newest') {
      filtered.sort((a: any, b: any) => new Date(b.last_update).getTime() - new Date(a.last_update).getTime());
    } else {
      filtered.sort((a: any, b: any) => new Date(a.last_update).getTime() - new Date(b.last_update).getTime());
    }

    return filtered;
  }, [bills, searchTerm, houseFilter, sessionFilter, stageFilter, sortBy, parliamentVotedFilter, youVotedFilter, notVotedFilter, hasSummaryFilter, userVotes]);

  // Server provides exactly 20 bills for this page already; client-side
  // filters narrow the visible set within that window. To see different
  // bills, navigate to a different ?page=N via the controls below.
  const paginatedBills = filteredBills;

  return (
    <>
      <FilterBar
        onFiltersChange={(filters) => {
          setSearchTerm(filters.search);
          setHouseFilter(filters.house);
          setSessionFilter(filters.session);
          setStageFilter(filters.stage);
          setSortBy(filters.sortBy);
          setParliamentVotedFilter(filters.parliamentVoted);
          setYouVotedFilter(filters.youVoted);
          setNotVotedFilter(filters.notVoted);
          setHasSummaryFilter(filters.hasSummary);
        }}
      />

      <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(20,16,13,0.7)', marginBottom: '16px' }}>
        {paginatedBills.length} of {filteredBills.length} bills shown
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-8">
        {paginatedBills.map((bill: any) => (
          <BillCoverCard
            key={bill.id}
            bill={bill}
            userVote={(userVotes[bill.id] as 'yes' | 'no' | undefined) ?? null}
            onClick={() => router.push(`/bills/${bill.id}`)}
          />
        ))}
      </div>

      {paginatedBills.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: 'rgba(20,16,13,0.7)', fontFamily: 'Special Elite, monospace' }}>No bills found matching your filters.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} style={pageBtn(currentPage === 1)}>First</button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={pageBtn(currentPage === 1)}>Prev</button>
          <span style={{ padding: '6px 14px', background: INK, color: CREAM, fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.06em' }}>{currentPage} / {totalPages}</span>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={pageBtn(currentPage === totalPages)}>Next</button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} style={pageBtn(currentPage === totalPages)}>Last</button>
        </div>
      )}
    </>
  );
}
