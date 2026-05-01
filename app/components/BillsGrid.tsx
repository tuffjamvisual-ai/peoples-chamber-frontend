'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import FilterBar from './FilterBar';

type Props = {
  initialBills: any[];
};

export default function BillsGrid({ initialBills }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
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
  
  const billsPerPage = 21;

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
    if (!user) { setAuthMode('signup'); setShowAuthModal(true); return; }
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

  const totalPages = Math.ceil(filteredBills.length / billsPerPage);
  const paginatedBills = filteredBills.slice((currentPage - 1) * billsPerPage, currentPage * billsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, houseFilter, sessionFilter, stageFilter, parliamentVotedFilter, youVotedFilter, notVotedFilter, hasSummaryFilter]);

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

      <div className="flex items-center justify-between mb-4 text-sm text-[#7697a2]">
        <div>Showing {paginatedBills.length} of {filteredBills.length} bills</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {paginatedBills.map((bill: any) => {
          const totalVotes = bill.vote_count_yes + bill.vote_count_no + bill.vote_count_abstain;
          const yesPercent = totalVotes > 0 ? Math.round((bill.vote_count_yes / totalVotes) * 100) : 0;
          const noPercent = totalVotes > 0 ? Math.round((bill.vote_count_no / totalVotes) * 100) : 0;
          const hasVoted = !!userVotes[bill.id];

          return (
            <div
              key={bill.id}
              onClick={() => router.push(`/bills/${bill.id}`)}
              className="bg-[#001520] border border-[#1c3849] rounded-lg p-4 cursor-pointer hover:border-[#ffffff] transition-colors"
            >
              <h3 className="text-white font-medium text-sm mb-3 line-clamp-2">{bill.title}</h3>

              <div className="mb-3">
                <div className="h-2 bg-[#1c3849] rounded-full overflow-hidden flex">
                  <div className="bg-[#4a8a3a]" style={{ width: `${yesPercent}%` }} />
                  <div className="bg-[#8a3a3a]" style={{ width: `${noPercent}%` }} />
                </div>
                <div className="flex justify-between text-xs text-[#7697a2] mt-1">
                  <span>✓ {yesPercent}%</span>
                  <span>{totalVotes.toLocaleString()} votes</span>
                  <span>✗ {noPercent}%</span>
                </div>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleVote(bill.id, 'yes')}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-xs font-medium ${hasVoted ? userVotes[bill.id] === 'yes' ? 'bg-[#405b6b] text-white' : 'bg-[#405b6b] text-[#7697a2]' : 'bg-[#1c3849] hover:bg-[#405b6b] text-white'}`}
                >
                  {hasVoted && userVotes[bill.id] === 'yes' ? '✓ Supported' : 'Support'}
                </button>
                <button
                  onClick={() => handleVote(bill.id, 'no')}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-xs font-medium ${hasVoted ? userVotes[bill.id] === 'no' ? 'bg-[#8a3a3a] text-white' : 'bg-[#405b6b] text-[#7697a2]' : 'bg-[#8a3a3a] hover:bg-[#8a3a3a] text-white'}`}
                >
                  {hasVoted && userVotes[bill.id] === 'no' ? '✓ Opposed' : 'Oppose'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {paginatedBills.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#7697a2]">No bills found matching your filters.</p>
        </div>
      )}

      {paginatedBills.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1.5 bg-[#1c3849] text-[#c9c9c9] rounded text-sm hover:bg-[#405b6b] disabled:opacity-30">First</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-[#1c3849] text-[#c9c9c9] rounded text-sm hover:bg-[#405b6b] disabled:opacity-30">Previous</button>
          <div className="px-4 py-1.5 bg-[#ffffff] text-white rounded text-sm font-medium">{currentPage} / {totalPages}</div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-[#1c3849] text-[#c9c9c9] rounded text-sm hover:bg-[#405b6b] disabled:opacity-30">Next</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-[#1c3849] text-[#c9c9c9] rounded text-sm hover:bg-[#405b6b] disabled:opacity-30">Last</button>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode={authMode} />
    </>
  );
}
