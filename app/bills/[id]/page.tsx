'use client';
export const revalidate = 86400; // 24 hours in seconds


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Bill = {
  id: number;
  title: string;
  long_title: string | null;
  description: string;
  category: string;
  current_stage: string;
  stage_date: string | null;
  sponsor_name: string | null;
  sponsor_party: string | null;
  sponsor_party_colour: string | null;
  sponsor_photo: string | null;
  sponsor_constituency: string | null;
  originating_house: string | null;
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
  user_vote: string | null;
};

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBill() {
      try {
        setLoading(true);
        const response = await fetch(
          `https://peoples-chamber-1.onrender.com/api/bills/${billId}`
        );
        
        if (!response.ok) {
          throw new Error('Bill not found');
        }
        
        const data: Bill = await response.json();
        setBill(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (billId) {
      fetchBill();
    }
  }, [billId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-6">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-lg p-8 max-w-md border border-gray-700/50">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400">{error || 'Bill not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Back to Bills
          </button>
        </div>
      </div>
    );
  }

  const totalVotes = bill.votes.yes + bill.votes.no + bill.votes.abstain;
  const yesPercent = totalVotes > 0 ? Math.round((bill.votes.yes / totalVotes) * 100) : 0;
  const noPercent = totalVotes > 0 ? Math.round((bill.votes.no / totalVotes) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Top Navigation */}
      <nav className="bg-black/40 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white"
            >
              <span>←</span>
              <span className="text-sm">Back to Bills</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-blue-600 rounded"></div>
              <h1 className="text-lg font-bold text-white">People's Chamber</h1>
            </div>

            <div className="flex items-center space-x-3">
              <button className="px-3 py-1.5 text-gray-300 text-sm">Login</button>
              <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">Sign Up</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Category Badge */}
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-blue-900/40 text-blue-300 rounded text-sm">
            {bill.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
          {bill.title}
        </h1>

        {/* Long Title */}
        {bill.long_title && (
          <p className="text-lg text-gray-400 mb-6 leading-relaxed">
            {bill.long_title}
          </p>
        )}

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-1">Current Stage</div>
            <div className="text-sm text-white">{bill.current_stage || 'Unknown'}</div>
          </div>
          
          {bill.originating_house && (
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              <div className="text-xs text-gray-500 mb-1">Originating House</div>
              <div className="text-sm text-white">{bill.originating_house}</div>
            </div>
          )}
        </div>

        {/* Sponsor Info */}
        {bill.sponsor_name && (
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 mb-6">
            <div className="text-xs text-gray-500 mb-3">Sponsored by</div>
            <div className="flex items-center gap-3">
              {bill.sponsor_photo ? (
                <img src={bill.sponsor_photo} alt={bill.sponsor_name} className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-sm text-gray-400">
                  {bill.sponsor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <div className="text-white font-medium">{bill.sponsor_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {bill.sponsor_party && (
                    <span
                      className="text-xs px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: bill.sponsor_party_colour || '#6b7280' }}
                    >
                      {bill.sponsor_party}
                    </span>
                  )}
                  {bill.sponsor_constituency && (
                    <span className="text-xs text-gray-500">{bill.sponsor_constituency}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Bill Description</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {bill.description}
          </p>
        </div>

        {/* Voting Section */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Public Opinion</h2>
          
          {/* Vote Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">{bill.votes.yes}</div>
              <div className="text-sm text-gray-500">Support</div>
              <div className="text-xs text-gray-600">{yesPercent}%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-400">{bill.votes.no}</div>
              <div className="text-sm text-gray-500">Oppose</div>
              <div className="text-xs text-gray-600">{noPercent}%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{bill.votes.abstain}</div>
              <div className="text-sm text-gray-500">Abstain</div>
            </div>
          </div>

          {/* Vote Bar */}
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-6">
            <div className="h-full flex">
              {yesPercent > 0 && (
                <div className="bg-teal-600" style={{ width: `${yesPercent}%` }} />
              )}
              {noPercent > 0 && (
                <div className="bg-rose-600" style={{ width: `${noPercent}%` }} />
              )}
            </div>
          </div>

          {/* Vote Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button className="bg-teal-700 hover:bg-teal-600 text-white py-3 rounded-lg font-medium transition-colors">
              Support
            </button>
            <button className="bg-rose-700 hover:bg-rose-600 text-white py-3 rounded-lg font-medium transition-colors">
              Oppose
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors">
              Abstain
            </button>
          </div>

          {bill.user_vote && (
            <div className="mt-4 text-center text-sm text-gray-400">
              You voted: <span className="text-white font-medium">{bill.user_vote}</span>
            </div>
          )}
        </div>

        {/* House of Commons Placeholder */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
          <h2 className="text-lg font-semibold text-white mb-2">House of Commons Vote</h2>
          <p className="text-sm text-gray-500">MP voting data not yet available for this bill.</p>
        </div>

      </main>
    </div>
  );
}
