'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
};

type ApiResponse = {
  bills: Bill[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
};

export default function HomePage() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    async function fetchBills() {
      try {
        setLoading(true);
        
        let url = `https://peoples-chamber-1.onrender.com/api/bills?page=${page}&per_page=21`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bills');
        }
        
        const data: ApiResponse = await response.json();
        setBills(data.bills);
        setTotalPages(data.pagination.pages);
        setTotalBills(data.pagination.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchBills();
  }, [page, searchTerm, categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  if (loading && bills.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
          <p className="text-gray-400 mt-6">Loading bills...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-lg p-8 max-w-md border border-gray-700/50">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Top Navigation */}
      <nav className="bg-black/40 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-blue-600 rounded"></div>
              <h1 className="text-lg font-bold text-white">People's Chamber</h1>
            </div>
            
            <div className="flex space-x-1">
              <a href="#" className="px-3 py-1.5 text-blue-400 font-medium text-sm">Bills</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">Laws</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">Polls</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">MPs</a>
              <a href="#" className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">About</a>
            </div>

            <div className="flex items-center space-x-3">
              <button className="px-3 py-1.5 text-gray-300 text-sm">Login</button>
              <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">Sign Up</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        
        {/* Search and Filters */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
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
                onClick={() => { setSearchTerm(''); setCategoryFilter(''); setPage(1); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Clear
              </button>
            )}
          </form>
          
          <div className="text-sm text-gray-500">
            {loading ? 'Loading...' : `Showing ${bills.length} of ${totalBills.toLocaleString()} bills`}
          </div>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bills.map((bill) => {
            const totalVotes = bill.votes.yes + bill.votes.no + bill.votes.abstain;
            const yesPercent = totalVotes > 0 ? Math.round((bill.votes.yes / totalVotes) * 100) : 0;
            
            return (
              <div
                key={bill.id}
                onClick={() => router.push(`/bills/${bill.id}`)}
                className="bg-[#1a1f2e] rounded-lg p-4 border border-gray-800/50 hover:border-gray-700 transition-all cursor-pointer group"
              >
                {/* Top row: Title and Category */}
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-white font-semibold text-sm leading-tight flex-1 pr-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                    {bill.title}
                  </h2>
                  <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded whitespace-nowrap ml-2">
                    {bill.category}
                  </span>
                </div>

                {/* Stage info */}
                <div className="text-xs text-gray-500 mb-3">
                  {bill.current_stage || 'Unknown stage'}
                  {bill.stage_date && ` · ${bill.stage_date}`}
                </div>

                {/* Sponsor */}
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

                {/* People's Chamber Votes */}
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

                {/* House of Commons Votes - Placeholder */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">House of Commons</span>
                    <span className="text-[10px] text-gray-600">No data</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full" />
                  <div className="text-center mt-1 text-[9px] text-gray-600">
                    Passed on voice vote
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className="flex-1 bg-teal-800 hover:bg-teal-700 text-white py-2 rounded text-xs font-medium transition-colors"
                  >
                    Support
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className="flex-1 bg-rose-800 hover:bg-rose-700 text-white py-2 rounded text-xs font-medium transition-colors"
                  >
                    Oppose
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {bills.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400">No bills found matching your search.</p>
          </div>
        )}

        {/* Pagination */}
        {bills.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              First
            </button>
            
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium">
              {page} / {totalPages}
            </div>
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
            
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
