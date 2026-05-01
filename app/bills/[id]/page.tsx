'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../../components/AuthModal';
import Navigation from '../../components/Navigation';

const ACCENT = '#4a7a3a';
const SUCCESS = '#34d399';
const DANGER = '#f87171';
const WARN = '#fbbf24';

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
        body: JSON.stringify({ userId: user.id, billId: parseInt(billId), choice }),
      });
      if (response.ok) {
        setUserVote(choice);
        setBill((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            votes: {
              ...prev.votes,
              yes: prev.votes.yes + (choice === 'yes' ? 1 : 0),
              no: prev.votes.no + (choice === 'no' ? 1 : 0),
              abstain: prev.votes.abstain + (choice === 'abstain' ? 1 : 0),
            },
          };
        });
      }
    } catch {}
    setVoting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a140a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-[#4a7a3a] border-[#1a2e1a] mx-auto"></div>
          <p className="text-gray-200 text-[10px] uppercase tracking-[0.25em] mt-6">Loading bill…</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-[#0a140a] text-white flex items-center justify-center">
        <div className="bg-[#0f1a0f] border border-[#1a2e1a] border-l-2 border-l-[#f87171] p-6 max-w-md">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-2 font-semibold" style={{ color: DANGER }}>Error</p>
          <h2 className="text-xl font-black tracking-tight text-white mb-2">Bill unavailable</h2>
          <p className="text-gray-200 text-[13px] leading-[1.7] mb-4">{error || 'Bill not found'}</p>
          <button
            onClick={() => router.push('/bills')}
            className="px-4 py-2 bg-[#4a7a3a] text-[#0a140a] text-[12px] uppercase tracking-[0.2em] font-bold rounded-sm"
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

  const totalMPVotes = (bill.commons_ayes || 0) + (bill.commons_noes || 0);
  const mpAyePercent = totalMPVotes > 0 ? Math.round(((bill.commons_ayes || 0) / totalMPVotes) * 100) : 0;
  const mpNoePercent = totalMPVotes > 0 ? Math.round(((bill.commons_noes || 0) / totalMPVotes) * 100) : 0;

  const democraticGap = totalMPVotes > 0 && totalVotes > 0 ? Math.abs(yesPercent - mpAyePercent) : null;
  const outcomeMismatch = democraticGap !== null && ((yesPercent > 50 && mpAyePercent < 50) || (yesPercent < 50 && mpAyePercent > 50));

  const keyStages = bill.stages.filter((s) =>
    ['1st reading', '2nd reading', 'Committee stage', 'Report stage', '3rd reading', 'Royal Assent'].includes(s.description),
  );

  const commonsStages = keyStages.filter((s) => s.house === 'Commons');
  const lordsStages = keyStages.filter((s) => s.house === 'Lords');
  const royalAssent = bill.stages.find((s) => s.description === 'Royal Assent');

  return (
    <div className="min-h-screen bg-[#0a140a] text-white">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {bill.is_act && <Tag colour={SUCCESS}>✓ Passed into Law</Tag>}
          {bill.is_defeated && <Tag colour={DANGER}>✗ Defeated</Tag>}
          {bill.bill_withdrawn && <Tag colour="#9ca3af">Withdrawn</Tag>}
          {!bill.is_act && !bill.is_defeated && !bill.bill_withdrawn && <Tag colour={ACCENT}>{bill.category}</Tag>}
          {bill.originating_house && <Tag colour="#9ca3af">{bill.originating_house}</Tag>}
          {bill.current_stage && <Tag colour="#9ca3af">{bill.current_stage}</Tag>}
        </div>

        {/* Title */}
        <header className="border-b border-[#1a2e1a] pb-8 mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: ACCENT }}>
            UK Parliament · Bill
          </p>
          <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight text-white">{bill.title}</h1>
        </header>

        {/* Plain Summary */}
        {bill.plain_summary && (
          <section className="bg-[#0f1a0f] border-l-2 p-5 mb-8" style={{ borderLeftColor: ACCENT }}>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-2 font-semibold" style={{ color: ACCENT }}>Summary</p>
            <p className="text-white text-[14px] leading-[1.7]">{bill.plain_summary}</p>
          </section>
        )}

        {/* Support / Oppose */}
        {(bill.support_explanation || bill.oppose_explanation) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1a2e1a] border border-[#1a2e1a] mb-8">
            {bill.support_explanation && (
              <div className="bg-[#0f1a0f] p-5 border-l-2" style={{ borderLeftColor: SUCCESS }}>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: SUCCESS }}>
                  A vote to support means
                </p>
                <ul className="space-y-2">
                  {((() => {
                    try { const p = JSON.parse(bill.support_explanation!); return Array.isArray(p) ? p : [bill.support_explanation!]; } catch { return bill.support_explanation!.split('\n').filter(Boolean); }
                  })()).map((point: string, i: number) => (
                    <li key={i} className="flex gap-2 text-[13px] text-gray-200 leading-[1.7]">
                      <span className="flex-shrink-0 mt-0.5" style={{ color: SUCCESS }}>—</span>
                      <span>{point.replace(/^[-–]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {bill.oppose_explanation && (
              <div className="bg-[#0f1a0f] p-5 border-l-2" style={{ borderLeftColor: DANGER }}>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: DANGER }}>
                  A vote to oppose means
                </p>
                <ul className="space-y-2">
                  {((() => {
                    try { const p = JSON.parse(bill.oppose_explanation!); return Array.isArray(p) ? p : [bill.oppose_explanation!]; } catch { return bill.oppose_explanation!.split('\n').filter(Boolean); }
                  })()).map((point: string, i: number) => (
                    <li key={i} className="flex gap-2 text-[13px] text-gray-200 leading-[1.7]">
                      <span className="flex-shrink-0 mt-0.5" style={{ color: DANGER }}>—</span>
                      <span>{point.replace(/^[-–]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Sponsor */}
        {bill.sponsor_name && (
          <section className="bg-[#0f1a0f] border border-[#1a2e1a] border-l-2 border-l-[#4a7a3a] p-5 mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>Sponsored by</p>
            <div className="flex items-center gap-4">
              {bill.sponsor_photo ? (
                <img src={bill.sponsor_photo} alt={bill.sponsor_name} className="w-12 h-12 rounded-full bg-[#111827]" style={{ border: `1px solid ${ACCENT}` }} />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#111827] flex items-center justify-center text-[10px] uppercase tracking-wider text-gray-200" style={{ border: `1px solid ${ACCENT}` }}>
                  {bill.sponsor_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <div className="text-white font-bold text-[14px] leading-snug">{bill.sponsor_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {bill.sponsor_party && (
                    <span
                      className="text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-sm text-white"
                      style={{ backgroundColor: `#${bill.sponsor_party_colour}` || '#6b7280' }}
                    >
                      {bill.sponsor_party}
                    </span>
                  )}
                  {bill.sponsor_constituency && (
                    <span className="text-[11px] text-gray-200 font-mono">{bill.sponsor_constituency}</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cast Your Vote */}
        <section className="bg-[#0f1a0f] border border-[#1a2e1a] p-6 mb-8">
          <h2 className="text-2xl font-black tracking-tight text-white mb-6">Cast Your Vote</h2>

          <div className="mb-4">
            <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-gray-200 mb-1.5 font-mono">
              <span>People&apos;s Vote</span>
              <span>{totalVotes.toLocaleString()} votes</span>
            </div>
            <div className="h-2 bg-[#1a2e1a] flex">
              {yesPercent > 0 && <div className="h-full" style={{ width: `${yesPercent}%`, backgroundColor: SUCCESS }} />}
              {noPercent > 0 && <div className="h-full" style={{ width: `${noPercent}%`, backgroundColor: DANGER }} />}
            </div>
            <div className="flex justify-between text-[11px] mt-1.5 font-mono">
              <span style={{ color: SUCCESS }}>{yesPercent}% Support · {bill.votes.yes.toLocaleString()}</span>
              <span style={{ color: DANGER }}>{noPercent}% Oppose · {bill.votes.no.toLocaleString()}</span>
            </div>
          </div>

          {totalMPVotes > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-gray-200 mb-1.5 font-mono">
                <span>Parliament&apos;s Vote</span>
                <span>{totalMPVotes.toLocaleString()} MPs</span>
              </div>
              <div className="h-2 bg-[#1a2e1a] flex">
                {mpAyePercent > 0 && <div className="h-full" style={{ width: `${mpAyePercent}%`, backgroundColor: SUCCESS, opacity: 0.7 }} />}
                {mpNoePercent > 0 && <div className="h-full" style={{ width: `${mpNoePercent}%`, backgroundColor: DANGER, opacity: 0.7 }} />}
              </div>
              <div className="flex justify-between text-[11px] mt-1.5 font-mono">
                <span style={{ color: SUCCESS }}>{mpAyePercent}% Ayes · {bill.commons_ayes?.toLocaleString()}</span>
                <span style={{ color: DANGER }}>{mpNoePercent}% Noes · {bill.commons_noes?.toLocaleString()}</span>
              </div>
            </div>
          )}

          {democraticGap !== null && (
            <div
              className="border-l-2 px-4 py-3 mb-6 bg-[#111827]"
              style={{ borderLeftColor: outcomeMismatch ? WARN : ACCENT }}
            >
              <p className="text-[10px] uppercase tracking-[0.25em] mb-1 font-semibold" style={{ color: outcomeMismatch ? WARN : ACCENT }}>
                Democratic Gap
              </p>
              <p className="text-white text-[13px] font-semibold leading-snug">
                {democraticGap}% {democraticGap > 20 ? '— Large gap' : democraticGap > 10 ? '— Moderate gap' : '— Small gap'}
              </p>
              {outcomeMismatch && (
                <p className="text-[12px] mt-1 leading-[1.7]" style={{ color: WARN }}>
                  Outcome mismatch — the public would {yesPercent > 50 ? 'pass' : 'block'} this bill, but Parliament {mpAyePercent > 50 ? 'passed' : 'rejected'} it
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <VoteButton
              label="Support"
              activeLabel="✓ Supported"
              onClick={() => handleVote('yes')}
              disabled={!!userVote || voting}
              active={userVote === 'yes'}
              colour={SUCCESS}
            />
            <VoteButton
              label="Oppose"
              activeLabel="✓ Opposed"
              onClick={() => handleVote('no')}
              disabled={!!userVote || voting}
              active={userVote === 'no'}
              colour={DANGER}
            />
            <VoteButton
              label="Abstain"
              activeLabel="✓ Abstained"
              onClick={() => handleVote('abstain')}
              disabled={!!userVote || voting}
              active={userVote === 'abstain'}
              colour="#9ca3af"
            />
          </div>
        </section>

        {/* Bill Passage Timeline */}
        {bill.stages.length > 0 && (
          <section className="bg-[#0f1a0f] border border-[#1a2e1a] p-6 mb-8">
            <h2 className="text-2xl font-black tracking-tight text-white mb-6">Bill Passage</h2>
            <div className="space-y-6">
              {commonsStages.length > 0 && (
                <StageGroup label="Commons" colour={ACCENT} stages={commonsStages} />
              )}
              {lordsStages.length > 0 && (
                <StageGroup label="Lords" colour={DANGER} stages={lordsStages} />
              )}
              {royalAssent && (
                <div className="flex items-center gap-3 pt-4 border-t border-[#1a2e1a]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SUCCESS }} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[13px] font-bold" style={{ color: SUCCESS }}>Royal Assent</span>
                    {royalAssent.stageSittings[0]?.date && (
                      <span className="text-[11px] text-gray-200 font-mono uppercase tracking-[0.15em]">
                        {new Date(royalAssent.stageSittings[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Full Description */}
        {bill.description && bill.description !== bill.title && (
          <details className="bg-[#0f1a0f] border border-[#1a2e1a]">
            <summary className="px-6 py-4 cursor-pointer hover:bg-[#111827] transition-colors text-[12px] uppercase tracking-[0.2em] font-semibold text-white">
              Full Bill Description
              <span className="text-gray-200 text-[11px] ml-2 normal-case tracking-normal">(click to expand)</span>
            </summary>
            <div className="px-6 pb-6">
              <p className="text-gray-200 text-[13px] leading-[1.7] whitespace-pre-wrap">{bill.description}</p>
            </div>
          </details>
        )}
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode={authMode} />
    </div>
  );
}

function Tag({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-2 py-1 text-[10px] uppercase tracking-[0.15em] font-semibold rounded-sm"
      style={{ color: colour, backgroundColor: colour + '22', border: `1px solid ${colour}55` }}
    >
      {children}
    </span>
  );
}

function VoteButton({
  label,
  activeLabel,
  onClick,
  disabled,
  active,
  colour,
}: {
  label: string;
  activeLabel: string;
  onClick: () => void;
  disabled: boolean;
  active: boolean;
  colour: string;
}) {
  const baseClasses = 'py-3 text-[12px] uppercase tracking-[0.2em] font-bold transition-colors rounded-sm';
  const style: React.CSSProperties = active
    ? { backgroundColor: colour, color: '#0a140a' }
    : disabled
    ? { backgroundColor: '#1a2e1a', color: '#4b5563', cursor: 'not-allowed' }
    : { backgroundColor: colour + '22', color: colour, border: `1px solid ${colour}55` };

  return (
    <button onClick={onClick} disabled={disabled} className={baseClasses} style={style}>
      {active ? activeLabel : label}
    </button>
  );
}

function StageGroup({ label, colour, stages }: { label: string; colour: string; stages: Stage[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: colour }}>{label}</p>
      <ul className="space-y-2">
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-[13px] text-white">{stage.description}</span>
              {stage.stageSittings[0]?.date && (
                <span className="text-[11px] text-gray-200 font-mono uppercase tracking-[0.15em]">
                  {new Date(stage.stageSittings[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
