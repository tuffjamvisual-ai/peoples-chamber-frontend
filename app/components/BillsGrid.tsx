'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

type Bill = {
  id: number;
  title: string;
  description: string;
  category: string;
  current_stage: string;
  stage_date: string | null;
  sponsor_name: string | null;
  sponsor_party: string | null;
  sponsor_party_colour: string | null;
  sponsor_photo: string | null;
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
  commons_votes?: {
    ayes: number;
    noes: number;
  } | null;
};

type Props = {
  initialBills: Bill[];
};

export default function BillsGrid({ initialBills }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [bills, setBills] = useState(initialBills);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const billsPerPage = 21;

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchesSearch = !searchTerm || 
        bill.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || 
        bill.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [bills, searchTerm, categoryFilter]);

  const totalPages = Math.ceil(filteredBills.length / billsPerPage);
  const startIndex = (currentPage - 1) * billsPerPage;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + billsPerPage);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setCurrentPage(1);
  };

  const handleVote = async (billId: number, choice: 'yes' | 'no') => {
    if (!user) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    if (userVotes[billId]) {
      alert('You have already voted on this bill');
      return;
    }

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          billId,
          choice
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to submit vote');
        return;
      }

      setUserVotes(prev => ({ ...prev, [billId]: choice }));
      setBills(prev => prev.map(bill =>
        bill.id === billId
          ? { ...bill, votes: data.votes }
          : bill
      ));

    } catch (error) {
      console.error('Vote error:', error);
      alert('Failed to submit vote');
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Constitutional and political">Constitutional and political</option>
            <option value="Health">Health</option>
            <option value="Social welfare">Social welfare</option>
            <option value="Education">Education</option>
            <option value="Transport">Transport</option>
            <option value="Environment">Environment</option>
            <option value="Justice">Justice</option>
            <option value="Other">Other</option>
          </select>
          
          {(searchTerm || categoryFilter) && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Clear
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          Showing {paginatedBills.length} of {filteredBills.length} bills
          {(searchTerm || categoryFilter) && ` (filtered from ${bills.length} total)`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedBills.map((bill) => {
          const totalVotes = bill.votes.yes + bill.votes.no + bill.votes.abstain;
          const yesPercent = totalVotes > 0 ? Math.round((bill.votes.yes / totalVotes) * 100) : 0;
          
          const commonsTotal = bill.commons_votes ? bill.commons_votes.ayes + bill.commons_votes.noes : 0;
          const commonsAyesPercent = commonsTotal > 0 ? Math.round((bill.commons_votes!.ayes / commonsTotal) * 100) : 0;
          
          const hasVoted = !!userVotes[bill.id];
          
          return (
            <div
              key={bill.id}
              className="bg-[#1a1f2e] rounded-lg p-4 border border-gray-800/50 hover:border-gray-700 transition-all"
            >
              <div 
                onClick={() => router.push(`/bills/${bill.id}`)}
                className="cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-white font-semibold text-sm leading-tight flex-1 pr-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                    {bill.title}
                  </h2>
                  <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded whitespace-nowrap ml-2">
                    {bill.category}
                  </span>
                </div>

                {/* STAGE - NOW MORE PROMINENT */}
                <div className="mb-3 p-2 bg-gray-800/40 rounded">
                  <div className="text-xs text-gray-400">
                    {bill.current_stage || 'Unknown stage'}
                  </div>
                  {bill.stage_date && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {bill.stage_date}
                    </div>
                  )}
                </div>

                {bill.sponsor_name && (
                  <div className="flex items-center gap-2 mb-3">
                    {bill.sponsor_photo ? (
                      <img src={bill.sponsor_photo} alt={bill.sponsor_name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[9px] text-gray-400">
                        {bill.sponsor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 truncate">{bill.sponsor_name}</span>
                      {bill.sponsor_party && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: bill.sponsor_party_colour || '#6b7280' }}
                        >
                          {bill.sponsor_party}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">People's Chamber</span>
                    <span className="text-[10px] font-medium text-gray-400">{yesPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600"
                      style={{ width: `${yesPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px]">
                    <span className="text-teal-400">{bill.votes.yes} Support</span>
                    <span className="text-rose-400">{bill.votes.no} Oppose</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">House of Commons</span>
                    {bill.commons_votes ? (
                      <span className="text-[10px] font-medium text-gray-400">{commonsAyesPercent}%</span>
                    ) : (
                      <span className="text-[10px] text-gray-600">No data</span>
                    )}
                  </div>
                  {bill.commons_votes ? (
                    <>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600"
                          style={{ width: `${commonsAyesPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px]">
                        <span className="text-green-400">{bill.commons_votes.ayes} Ayes</span>
                        <span className="text-red-400">{bill.commons_votes.noes} Noes</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 bg-gray-800 rounded-full" />
                      <div className="text-center mt-1 text-[9px] text-gray-600">
                        Passed on voice vote
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleVote(bill.id, 'yes'); }}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                    hasVoted 
                      ? userVotes[bill.id] === 'yes' 
                        ? 'bg-teal-700 text-white cursor-default'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-teal-800 hover:bg-teal-700 text-white'
                  }`}
                >
                  {hasVoted && userVotes[bill.id] === 'yes' ? '✓ Supported' : 'Support'}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleVote(bill.id, 'no'); }}
                  disabled={hasVoted}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                    hasVoted 
                      ? userVotes[bill.id] === 'no'
                        ? 'bg-rose-700 text-white cursor-default'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-rose-800 hover:bg-rose-700 text-white'
                  }`}
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
          <p className="text-gray-400">No bills found matching your search.</p>
        </div>
      )}

      {paginatedBills.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            First
          </button>
          
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium">
            {currentPage} / {totalPages}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
          
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </>
  );
}
