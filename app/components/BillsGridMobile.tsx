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
    let filtered = bills;

    // Filter out withdrawn bills and Acts (no longer active)
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
      filtered = filtered.sort((a: any, b: any) => {
        const totalA = a.vote_count_yes + a.vote_count_no + a.vote_count_abstain;
        const totalB = b.vote_count_yes + b.vote_count_no + b.vote_count_abstain;
        return totalB - totalA;
      });
    } else if (activeTab === 'controversial') {
      filtered = filtered
        .filter((bill: any) => {
          const total = bill.vote_count_yes + bill.vote_count_no;
          return total > 100;
        })
        .sort((a: any, b: any) => {
          const ratioA = Math.abs(0.5 - (a.vote_count_yes / (a.vote_count_yes + a.vote_count_no)));
          const ratioB = Math.abs(0.5 - (b.vote_count_yes / (b.vote_count_yes + b.vote_count_no)));
          return ratioA - ratioB;
        });
    } else if (activeTab === 'latest') {
      filtered = filtered.sort((a: any, b: any) => 
        new Date(b.last_update).getTime() - new Date(a.last_update).getTime()
      );
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
      <div className="sticky top-16 z-40 bg-[#0a0f1a] px-4 py-3 border-b border-gray-800">
        <input
          type="text"
          placeholder="Search bills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="sticky top-[124px] z-40 bg-[#0a0f1a] border-b border-gray-800 overflow-x-auto">
        <div className="flex space-x-1 px-4 min-w-max">
          <button
            onClick={() => setActiveTab('latest')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'latest'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400'
            }`}
          >
            🆕 Latest
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'trending'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400'
            }`}
          >
            🔥 Trending
          </button>
          <button
            onClick={() => setActiveTab('controversial')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'controversial'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400'
            }`}
          >
            📊 Controversial
          </button>
          <button
            onClick={() => setActiveTab('voted')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'voted'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400'
            }`}
          >
            ✅ You Voted
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredBills.map((bill: any) => {
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
              <h3 className="text-white font-medium text-sm leading-snug mb-3">
                {bill.title}
              </h3>

              <div className="mb-3">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                  <div className="bg-green-600" style={{ width: `${yesPercent}%` }} />
                  <div className="bg-red-600" style={{ width: `${noPercent}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
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
                        : 'bg-gray-700 text-gray-500'
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
                        : 'bg-gray-700 text-gray-500'
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
          <p className="text-gray-400">No active bills found.</p>
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
