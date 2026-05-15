'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

type Props = {
  initialBills: any[];
  currentPage: number;
  totalPages: number;
};

type TabType = 'trending' | 'controversial' | 'latest' | 'voted';

export default function BillsGridMobile({ initialBills, currentPage, totalPages }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [bills, setBills] = useState(initialBills);

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    router.push(clamped === 1 ? '/bills' : `/bills?page=${clamped}`);
  };

  useEffect(() => {
    async function fetchUserVotes() {
      if (!user) {
        setUserVotes({});
        return;
      }
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

  const filteredBills = useMemo(() => {
    let filtered = [...bills];

    filtered = filtered.filter((bill: any) => 
      !bill.bill_withdrawn && 
      !bill.is_act &&
      bill.current_stage !== 'Royal Assent'
    );

    if (searchTerm) {
      filtered = filtered.filter((bill: any) =>
        bill.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeTab === 'trending') {
      filtered = filtered
        .map((bill: any) => ({
          ...bill,
          totalVotes: bill.vote_count_yes + bill.vote_count_no + bill.vote_count_abstain
        }))
        .sort((a, b) => b.totalVotes - a.totalVotes);
    } else if (activeTab === 'controversial') {
      filtered = filtered
        .filter((bill: any) => {
          const total = bill.vote_count_yes + bill.vote_count_no;
          return total > 100;
        })
        .map((bill: any) => ({
          ...bill,
          controversyScore: Math.abs(0.5 - (bill.vote_count_yes / (bill.vote_count_yes + bill.vote_count_no)))
        }))
        .sort((a, b) => a.controversyScore - b.controversyScore);
    } else if (activeTab === 'latest') {
      filtered = filtered
        .sort((a: any, b: any) => {
          const dateA = new Date(a.last_update).getTime();
          const dateB = new Date(b.last_update).getTime();
          return dateB - dateA;
        });
    } else if (activeTab === 'voted') {
      filtered = filtered.filter((bill: any) => userVotes[bill.id]);
    }

    return filtered;
  }, [bills, searchTerm, activeTab, userVotes]);

  const handleVote = async (billId: number, choice: 'yes' | 'no' | 'abstain') => {
    if (!user) {
      router.push(`/login?mode=login&returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, billId, choice }),
      });

      if (response.ok) {
        setUserVotes(prev => ({ ...prev, [billId]: choice }));
        
        setBills((prev: any) => prev.map((bill: any) => {
          if (bill.id !== billId) return bill;
          return {
            ...bill,
            vote_count_yes: bill.vote_count_yes + (choice === 'yes' ? 1 : 0),
            vote_count_no: bill.vote_count_no + (choice === 'no' ? 1 : 0),
            vote_count_abstain: bill.vote_count_abstain + (choice === 'abstain' ? 1 : 0),
          };
        }));
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  return (
    <>
      <div className="sticky top-20 z-40 bg-[#505050] px-4 py-3 border-b border-[#5a5a5a]">
        <input
          type="text"
          placeholder="Search bills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xl mx-auto block px-4 py-2 bg-[#404040] text-white rounded-lg border border-[#5a5a5a] focus:border-[#ffffff] focus:outline-none"
        />
      </div>

      <div className="sticky top-[108px] z-40 bg-[#505050] border-b border-[#5a5a5a] overflow-x-auto">
        <div className="flex space-x-1 px-4 min-w-max">
          <button
            onClick={() => setActiveTab('latest')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'latest'
                ? 'text-[#ffffff] border-b-2 border-[#ffffff]'
                : 'text-white'
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'trending'
                ? 'text-[#ffffff] border-b-2 border-[#ffffff]'
                : 'text-white'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveTab('controversial')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'controversial'
                ? 'text-[#ffffff] border-b-2 border-[#ffffff]'
                : 'text-white'
            }`}
          >
            Controversial
          </button>
          <button
            onClick={() => setActiveTab('voted')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'voted'
                ? 'text-[#ffffff] border-b-2 border-[#ffffff]'
                : 'text-white'
            }`}
          >
            You Voted
          </button>
        </div>
        
        {/* Debug indicator - shows which tab is active and bill count */}
        <div className="px-4 py-1 text-sm text-white">
          Active: {activeTab} | Showing {filteredBills.length} bills
        </div>
      </div>

      <div className="p-4 space-y-3" key={activeTab}>
        {filteredBills.map((bill: any, index: number) => {
          const totalVotes = bill.vote_count_yes + bill.vote_count_no + bill.vote_count_abstain;
          const yesPercent = totalVotes > 0 ? Math.round((bill.vote_count_yes / totalVotes) * 100) : 0;
          const noPercent = totalVotes > 0 ? Math.round((bill.vote_count_no / totalVotes) * 100) : 0;
          const hasVoted = !!userVotes[bill.id];

          return (
            <div
              key={bill.id}
              onClick={() => router.push(`/bills/${bill.id}`)}
              className="bg-[#505050] border border-[#5a5a5a] rounded-lg p-4 active:bg-[#404040]"
            >
              {/* Show position number and total votes for debugging */}
              <div className="text-sm text-white mb-1">
                #{index + 1} | {totalVotes} total votes | Updated: {new Date(bill.last_update).toLocaleDateString()}
              </div>
              
              <h3 className="text-white font-medium text-sm leading-snug mb-3">
                {bill.title}
              </h3>

              <div className="mb-3">
                <div className="h-2 bg-[#404040] rounded-full overflow-hidden flex">
                  <div className="bg-[#4a8a3a]" style={{ width: `${yesPercent}%` }} />
                  <div className="bg-[#8a3a3a]" style={{ width: `${noPercent}%` }} />
                </div>
                <div className="flex justify-between text-sm text-white mt-1">
                  <span>✓ {yesPercent}%</span>
                  <span>{totalVotes.toLocaleString()} votes</span>
                  <span>✗ {noPercent}%</span>
                </div>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleVote(bill.id, 'yes')}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    hasVoted
                      ? userVotes[bill.id] === 'yes'
                        ? 'bg-[#404040] text-white'
                        : 'bg-[#404040] text-white'
                      : 'bg-[#404040] active:bg-[#404040] text-white'
                  }`}
                >
                  {hasVoted && userVotes[bill.id] === 'yes' ? '✓ Supported' : 'Support'}
                </button>
                <button
                  onClick={() => handleVote(bill.id, 'no')}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    hasVoted
                      ? userVotes[bill.id] === 'no'
                        ? 'bg-[#8a3a3a] text-white'
                        : 'bg-[#404040] text-white'
                      : 'bg-[#8a3a3a] active:bg-[#8a3a3a] text-white'
                  }`}
                >
                  {hasVoted && userVotes[bill.id] === 'no' ? '✓ Opposed' : 'Oppose'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white">No active bills found.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1.5 bg-[#404040] text-[#c9c9c9] rounded text-sm disabled:opacity-30">Previous</button>
          <div className="px-4 py-1.5 bg-[#353535] text-white rounded text-sm font-medium border border-[#5a5a5a]">{currentPage} / {totalPages}</div>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-[#404040] text-[#c9c9c9] rounded text-sm disabled:opacity-30">Next</button>
        </div>
      )}
    </>
  );
}
