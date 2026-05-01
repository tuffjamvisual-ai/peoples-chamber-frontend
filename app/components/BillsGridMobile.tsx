'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

type Props = {
  initialBills: any[];
};

type TabType = 'trending' | 'controversial' | 'latest' | 'voted';

export default function BillsGridMobile({ initialBills }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [bills, setBills] = useState(initialBills);

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

    return filtered.slice(0, 50);
  }, [bills, searchTerm, activeTab, userVotes]);

  const handleVote = async (billId: number, choice: 'yes' | 'no' | 'abstain') => {
    if (!user) {
      setShowAuthModal(true);
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
      <div className="sticky top-20 z-40 bg-[#0a140a] px-4 py-3 border-b border-gray-800">
        <input
          type="text"
          placeholder="Search bills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xl mx-auto block px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#4a7a3a] focus:outline-none"
        />
      </div>

      <div className="sticky top-[108px] z-40 bg-[#0a140a] border-b border-gray-800 overflow-x-auto">
        <div className="flex space-x-1 px-4 min-w-max">
          <button
            onClick={() => setActiveTab('latest')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'latest'
                ? 'text-[#4a7a3a] border-b-2 border-[#4a7a3a]'
                : 'text-gray-200'
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'trending'
                ? 'text-[#4a7a3a] border-b-2 border-[#4a7a3a]'
                : 'text-gray-200'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveTab('controversial')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'controversial'
                ? 'text-[#4a7a3a] border-b-2 border-[#4a7a3a]'
                : 'text-gray-200'
            }`}
          >
            Controversial
          </button>
          <button
            onClick={() => setActiveTab('voted')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'voted'
                ? 'text-[#4a7a3a] border-b-2 border-[#4a7a3a]'
                : 'text-gray-200'
            }`}
          >
            You Voted
          </button>
        </div>
        
        {/* Debug indicator - shows which tab is active and bill count */}
        <div className="px-4 py-1 text-xs text-gray-200">
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
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 active:bg-gray-800"
            >
              {/* Show position number and total votes for debugging */}
              <div className="text-xs text-gray-200 mb-1">
                #{index + 1} | {totalVotes} total votes | Updated: {new Date(bill.last_update).toLocaleDateString()}
              </div>
              
              <h3 className="text-white font-medium text-sm leading-snug mb-3">
                {bill.title}
              </h3>

              <div className="mb-3">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                  <div className="bg-green-600" style={{ width: `${yesPercent}%` }} />
                  <div className="bg-red-600" style={{ width: `${noPercent}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-200 mt-1">
                  <span>✓ {yesPercent}%</span>
                  <span>{totalVotes.toLocaleString()} votes</span>
                  <span>✗ {noPercent}%</span>
                </div>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleVote(bill.id, 'yes')}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-xs font-medium ${
                    hasVoted
                      ? userVotes[bill.id] === 'yes'
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-700 text-gray-200'
                      : 'bg-green-800 active:bg-green-700 text-white'
                  }`}
                >
                  {hasVoted && userVotes[bill.id] === 'yes' ? '✓ Supported' : 'Support'}
                </button>
                <button
                  onClick={() => handleVote(bill.id, 'no')}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-xs font-medium ${
                    hasVoted
                      ? userVotes[bill.id] === 'no'
                        ? 'bg-red-700 text-white'
                        : 'bg-gray-700 text-gray-200'
                      : 'bg-red-800 active:bg-red-700 text-white'
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
          <p className="text-gray-200">No active bills found.</p>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode="login"
      />
    </>
  );
}
