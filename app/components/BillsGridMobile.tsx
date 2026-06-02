'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import type { CSSProperties } from 'react';
import BillCoverCard from './BillCoverCard';

const INK = '#14100d';
const CREAM = '#ebe5d8';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const mPageBtn = (disabled: boolean): CSSProperties => ({
  padding: '6px 14px',
  background: 'transparent',
  color: INK,
  border: `1px solid ${INK}`,
  borderRadius: 0,
  fontFamily: 'Special Elite, monospace',
  fontSize: '13px',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.3 : 1,
});

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
  // Live search results from /api/bills/search — see desktop BillsGrid
  // for the reasoning. Replaces `bills` while the user is searching so
  // we cover the whole table, not just the current 20-row page.
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

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

  // Debounced live search — see BillsGrid for rationale.
  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/bills/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!res.ok) { setSearchResults([]); setSearching(false); return; }
        const json = await res.json();
        setSearchResults(json.bills || []);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchTerm]);

  const filteredBills = useMemo(() => {
    // While searching, render the server search results across the whole
    // table — and don't strip Acts / withdrawn / Royal-Assent bills,
    // because the user is hunting a specific named bill.
    const source = searchResults ?? bills;
    let filtered = [...source];

    if (!searchResults) {
      filtered = filtered.filter((bill: any) =>
        !bill.bill_withdrawn &&
        !bill.is_act &&
        bill.current_stage !== 'Royal Assent'
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
  }, [bills, searchResults, activeTab, userVotes]);

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
      <div className="sticky top-20 z-40 px-4 py-3" style={{ background: CREAM, borderBottom: `1px solid ${INK_HAIRLINE}` }}>
        <input
          type="text"
          placeholder="Search bills…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xl mx-auto block w-full"
          style={{ padding: '10px 14px', background: 'rgba(20,16,13,0.05)', color: INK, border: `1px solid ${INK_HAIRLINE}`, borderRadius: 0, fontFamily: 'Special Elite, monospace', fontSize: '15px', outline: 'none' }}
        />
      </div>

      <div className="sticky top-[108px] z-40 overflow-x-auto" style={{ background: CREAM, borderBottom: `1px solid ${INK_HAIRLINE}` }}>
        <div className="flex px-4 min-w-max" style={{ gap: '4px' }}>
          {(['latest', 'trending', 'controversial', 'voted'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 14px',
                whiteSpace: 'nowrap',
                fontFamily: 'Special Elite, monospace',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                background: 'transparent',
                color: activeTab === tab ? INK : 'rgba(20,16,13,0.55)',
                borderBottom: activeTab === tab ? `2px solid ${INK}` : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab === 'latest' ? 'Latest' : tab === 'trending' ? 'Trending' : tab === 'controversial' ? 'Controversial' : 'You voted'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4" key={activeTab}>
        {filteredBills.map((bill: any) => (
          <BillCoverCard
            key={bill.id}
            bill={bill}
            userVote={(userVotes[bill.id] as 'yes' | 'no' | undefined) ?? null}
            onClick={() => router.push(`/bills/${bill.id}`)}
          />
        ))}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: 'rgba(20,16,13,0.7)', fontFamily: 'Special Elite, monospace' }}>
            {searching ? 'Searching…' : searchResults ? `No bills match "${searchTerm.trim()}".` : 'No active bills found.'}
          </p>
        </div>
      )}

      {totalPages > 1 && !searchResults && (
        <div className="flex items-center justify-center gap-2 mt-4" style={{ paddingBottom: '16px' }}>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={mPageBtn(currentPage === 1)}>Prev</button>
          <span style={{ padding: '6px 14px', background: INK, color: CREAM, fontFamily: 'Special Elite, monospace', fontSize: '13px' }}>{currentPage} / {totalPages}</span>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={mPageBtn(currentPage === totalPages)}>Next</button>
        </div>
      )}
    </>
  );
}
