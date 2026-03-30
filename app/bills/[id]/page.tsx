'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../../components/AuthModal';
import Navigation from '../../components/Navigation';

type Stage = {
  id: number;
  description: string;
  house: string;
  stageSittings: { date: string }[];
  sortOrder: number;
};

type Bill = {
  id: number;
  parliament_id: number | null;
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
  is_act: boolean;
  is_defeated: boolean;
  bill_withdrawn: string | null;
  plain_summary: string | null;
  support_explanation: string | null;
  oppose_explanation: string | null;
  ai_generated: boolean | null;
  commons_ayes: number | null;
  commons_noes: number | null;
  votes: { yes: number; no: number; abstain: number };
  stages: Stage[];
  user_vote: string | null;
};

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const billId = params.id as string;
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    async function fetchBill() {
      try {
        setLoading(true);
        const response = await fetch(`/api/bills/${billId}`);
        if (!response.ok) throw new Error('Bill not found');
        const data: Bill = await response.json();
        setBill(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    if (billId) fetchBill();
  }, [billId]);

  useEffect(() => {
    async function fetchUserVote() {
      if (!user || !billId) return;
      try {
        const response = await fetch(`/api/vote?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setUserVote(data.votes?.[parseInt(billId)] || null);
        }
      } catch {}
    }
    fetchUserVote();
  }, [user, billId]);

  const handleVote = async (choice: 'yes' | 'no' | 'abstain') => {
    if (!user) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }
    if (userVote || voting) return;
    setVoting(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, billId: parseInt(billId), choice })
      });
      if (response.ok) {
        setUserVote(choice);
        setBill(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            votes: {
              ...prev.votes,
              yes: prev.votes.yes + (choice === 'yes' ? 1 : 0),
              no: prev.votes.no + (choice === 'no' ? 1 : 0),
              abstain: prev.votes.abstain + (choice === 'abstain' ? 1 : 0),
            }
          };
        });
      }
    } catch {}
    setVoting(false);
  };

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
        <div className="bg-gray-800/50 rounded-lg p-8 max-w-md border border-gray-700/50">
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400">{error || 'Bill not found'}</p>
          <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
            Back to Bills
          </button>
        </div>
      </div>
    );
  }

  const totalVotes = bill.votes.yes + bill.votes.no + bill.votes.abstain;
  const yesPercent = totalVotes > 0 ? Math.round((bill.votes.yes / totalVotes) * 100) : 0;
  const noPercent = totalVotes > 0 ? Math.round((bill.votes.no / totalVotes) * 100) : 0;

  const totalMPVotes = (bill.commons_ayes || 0) + (bill.commons_noes || 0);
  const mpAyePercent = totalMPVotes > 0 ? Math.round(((bill.commons_ayes || 0) / totalMPVotes) * 100) : 0;
  const mpNoePercent = totalMPVotes > 0 ? Math.round(((bill.commons_noes || 0) / totalMPVotes) * 100) : 0;

  const democraticGap = totalMPVotes > 0 && totalVotes > 0 ? Math.abs(yesPercent - mpAyePercent) : null;
  const outcomeMismatch = democraticGap !== null && ((yesPercent > 50 && mpAyePercent < 50) || (yesPercent < 50 && mpAyePercent > 50));

  const keyStages = bill.stages.filter(s =>
    ['1st reading', '2nd reading', 'Committee stage', 'Report stage', '3rd reading', 'Royal Assent'].includes(s.description)
  );

  const commonsStages = keyStages.filter(s => s.house === 'Commons');
  const lordsStages = keyStages.filter(s => s.house === 'Lords');
  const royalAssent = bill.stages.find(s => s.description === 'Royal Assent');

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">

        {/* Status Badge */}
        <div className="flex flex-wrap gap-2 mb-4">
          {bill.is_act && (
            <span className="inline-block px-3 py-1 bg-green-900/40 text-green-300 rounded text-sm font-medium border border-green-800/40">
              ✓ Passed into Law
            </span>
          )}
          {bill.is_defeated && (
            <span className="inline-block px-3 py-1 bg-red-900/40 text-red-300 rounded text-sm font-medium border border-red-800/40">
              ✗ Defeated
            </span>
          )}
          {bill.bill_withdrawn && (
            <span className="inline-block px-3 py-1 bg-gray-700/40 text-gray-400 rounded text-sm font-medium border border-gray-600/40">
              Withdrawn
            </span>
          )}
          {!bill.is_act && !bill.is_defeated && !bill.bill_withdrawn && (
            <span className="inline-block px-3 py-1 bg-blue-900/40 text-blue-300 rounded text-sm font-medium border border-blue-800/40">
              {bill.category}
            </span>
          )}
          {bill.originating_house && (
            <span className="inline-block px-3 py-1 bg-gray-800/60 text-gray-400 rounded text-sm border border-gray-700/40">
              {bill.originating_house}
            </span>
          )}
          {bill.current_stage && (
            <span className="inline-block px-3 py-1 bg-gray-800/60 text-gray-400 rounded text-sm border border-gray-700/40">
              {bill.current_stage}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
          {bill.title}
        </h1>

        {/* Plain Summary */}
        {bill.plain_summary && (
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-5 mb-6">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">Summary</h3>
            <p className="text-gray-300 leading-relaxed">{bill.plain_summary}</p>
          </div>
        )}

        {/* Support / Oppose */}
        {(bill.support_explanation || bill.oppose_explanation) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {bill.support_explanation && (
              <div className="bg-teal-900/20 border border-teal-800/30 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">A vote to support means</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{bill.support_explanation}</p>
              </div>
            )}
            {bill.oppose_explanation && (
              <div className="bg-rose-900/20 border border-rose-800/30 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-rose-300 mb-2">A vote to oppose means</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{bill.oppose_explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Sponsor */}
        {bill.sponsor_name && (
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 mb-6">
            <div className="text-xs text-gray-500 mb-3">Sponsored by</div>
            <div className="flex items-center gap-3">
              {bill.sponsor_photo ? (
                <img src={bill.sponsor_photo} alt={bill.sponsor_name} className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-sm text-gray-400">
                  {bill.sponsor_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <div className="text-white font-medium">{bill.sponsor_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {bill.sponsor_party && (
                    <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: `#${bill.sponsor_party_colour}` || '#6b7280' }}>
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

        {/* Cast Your Vote */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cast Your Vote</h2>

          {/* Public vote bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>People's Vote</span>
              <span>{totalVotes.toLocaleString()} votes</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
              {yesPercent > 0 && <div className="bg-teal-600 h-full" style={{ width: `${yesPercent}%` }} />}
              {noPercent > 0 && <div className="bg-rose-600 h-full" style={{ width: `${noPercent}%` }} />}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{yesPercent}% Support · {bill.votes.yes.toLocaleString()}</span>
              <span>{noPercent}% Oppose · {bill.votes.no.toLocaleString()}</span>
            </div>
          </div>

          {/* MP vote bar */}
          {totalMPVotes > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Parliament's Vote</span>
                <span>{totalMPVotes.toLocaleString()} MPs</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
                {mpAyePercent > 0 && <div className="bg-teal-800 h-full" style={{ width: `${mpAyePercent}%` }} />}
                {mpNoePercent > 0 && <div className="bg-rose-800 h-full" style={{ width: `${mpNoePercent}%` }} />}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{mpAyePercent}% Ayes · {bill.commons_ayes?.toLocaleString()}</span>
                <span>{mpNoePercent}% Noes · {bill.commons_noes?.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Democratic Gap */}
          {democraticGap !== null && (
            <div className={`rounded-lg p-3 mb-4 border ${outcomeMismatch ? 'bg-amber-900/20 border-amber-700/40' : 'bg-gray-800/40 border-gray-700/40'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{outcomeMismatch ? '⚠️' : '✓'}</span>
                <div>
                  <div className="text-sm font-medium text-white">
                    Democratic Gap: {democraticGap}% {democraticGap > 20 ? '— Large gap' : democraticGap > 10 ? '— Moderate gap' : '— Small gap'}
                  </div>
                  {outcomeMismatch && (
                    <div className="text-xs text-amber-300 mt-0.5">
                      Outcome mismatch — the public would {yesPercent > 50 ? 'pass' : 'block'} this bill, but Parliament {mpAyePercent > 50 ? 'passed' : 'rejected'} it
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vote buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleVote('yes')}
              disabled={!!userVote || voting}
              className={`py-3 rounded-lg font-medium transition-colors text-sm ${
                userVote === 'yes' ? 'bg-teal-600 text-white' :
                userVote ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                'bg-teal-700 hover:bg-teal-600 text-white'
              }`}
            >
              {userVote === 'yes' ? '✓ Supported' : 'Support'}
            </button>
            <button
              onClick={() => handleVote('no')}
              disabled={!!userVote || voting}
              className={`py-3 rounded-lg font-medium transition-colors text-sm ${
                userVote === 'no' ? 'bg-rose-600 text-white' :
                userVote ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                'bg-rose-700 hover:bg-rose-600 text-white'
              }`}
            >
              {userVote === 'no' ? '✓ Opposed' : 'Oppose'}
            </button>
            <button
              onClick={() => handleVote('abstain')}
              disabled={!!userVote || voting}
              className={`py-3 rounded-lg font-medium transition-colors text-sm ${
                userVote === 'abstain' ? 'bg-gray-500 text-white' :
                userVote ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            >
              {userVote === 'abstain' ? '✓ Abstained' : 'Abstain'}
            </button>
          </div>
        </div>

        {/* Bill Passage Timeline */}
        {bill.stages.length > 0 && (
          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Bill Passage</h2>
            <div className="space-y-4">
              {/* Commons */}
              {commonsStages.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Commons</div>
                  <div className="space-y-2">
                    {commonsStages.map((stage) => (
                      <div key={stage.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm text-gray-300">{stage.description}</span>
                          {stage.stageSittings[0]?.date && (
                            <span className="text-xs text-gray-500">
                              {new Date(stage.stageSittings[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Lords */}
              {lordsStages.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Lords</div>
                  <div className="space-y-2">
                    {lordsStages.map((stage) => (
                      <div key={stage.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm text-gray-300">{stage.description}</span>
                          {stage.stageSittings[0]?.date && (
                            <span className="text-xs text-gray-500">
                              {new Date(stage.stageSittings[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Royal Assent */}
              {royalAssent && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-700/50">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-green-300 font-medium">Royal Assent</span>
                    {royalAssent.stageSittings[0]?.date && (
                      <span className="text-xs text-gray-500">
                        {new Date(royalAssent.stageSittings[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Description */}
        {bill.description && bill.description !== bill.title && (
          <details className="bg-gray-800/30 rounded-lg border border-gray-700/50 mb-6">
            <summary className="px-6 py-4 cursor-pointer hover:bg-gray-800/50 transition-colors">
              <span className="text-base font-semibold text-white">Full Bill Description</span>
              <span className="text-gray-500 text-sm ml-2">(click to expand)</span>
            </summary>
            <div className="px-6 pb-6">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{bill.description}</p>
            </div>
          </details>
        )}

      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </div>
  );
}
