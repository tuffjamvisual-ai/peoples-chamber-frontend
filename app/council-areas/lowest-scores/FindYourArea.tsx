'use client';
// 'Find your area' on /council-areas/lowest-scores (Cowork ENTRY 415 LAYOUT CHANGE): a postcode through the site's existing
// /api/councils/lookup (postcodes.io; no new service, no key) gives the council's slug; the page passes every ranked
// council area's rank, score and name by slug, so the result needs no other request. Postcodes outside England (and
// postcodes not found) get a plain message that the list covers England only. The box is the site's shared search box.
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import '@/app/components/search-box-desk.css';
import { plainScoreRank } from './ranks';

const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';
const ACCENT = '#7a1612';
const UNRANKED = new Set(['city-of-london-corporation', 'isles-of-scilly']);
const ENGLAND_ONLY = 'This list covers council areas in England only. Check the postcode, or try one in England.';

type Result = { kind: 'area'; slug: string; rank: number; score: number; name: string } | { kind: 'message'; text: string };

export default function FindYourArea({ ranks, ranked }: { ranks: Record<string, [number, number, string]>; ranked: number }) {
  const [postcode, setPostcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = postcode.trim();
    if (!clean) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/councils/lookup?postcode=' + encodeURIComponent(clean));
      const j = await res.json().catch(() => ({}));
      if (res.status === 502) setResult({ kind: 'message', text: 'The postcode search did not work. Please try again.' });
      else if (!res.ok || !j.slug) setResult({ kind: 'message', text: ENGLAND_ONLY });
      else if (UNRANKED.has(j.slug)) setResult({ kind: 'message', text: `${j.shortName || j.name} is not ranked: too few residents to compare fairly.` });
      else if (!ranks[j.slug]) setResult({ kind: 'message', text: ENGLAND_ONLY });
      else {
        const [rank, score, name] = ranks[j.slug];
        setResult({ kind: 'area', slug: j.slug, rank, score, name });
      }
    } catch {
      setResult({ kind: 'message', text: 'The postcode search did not work. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  const text = { fontFamily: MONO, fontSize: '15px', color: INK, lineHeight: 1.6 } as const;
  return (
    <div>
      {/* The shared search box (owner's standing rule, 18 Nov 2026, Cowork ENTRY 336 and 439): the same markup, classes and
          look as the /councils box (app/components/AreaSearch.tsx, the labelled variant's classes, so phones match /councils too; the section's own heading names it);
          on desktop 323 x 45px, 15px text, the tint and the arrow and 'Search' button; phones and tablets as the shared style
          gives. The rendered check A19 measures it. */}
      <form onSubmit={onSubmit} style={{ margin: '0 0 10px' }}>
        <div className="og-sbox-row" style={{ position: 'relative' }}>
          <input id="ls-postcode" type="text" name="postcode" aria-label="Your postcode" placeholder="Your postcode"
            autoComplete="postal-code" value={postcode} onChange={(e) => setPostcode(e.target.value)}
            className="og-search-input og-sbox-input"
            style={{ width: '100%', padding: '12px 36px 12px 14px', fontFamily: MONO, fontSize: '15px', color: INK, background: '#f4e8d4', border: '1px solid rgba(20,16,13,0.18)', outline: 'none', boxSizing: 'border-box' }} />
          <button type="submit" className="og-search-go og-sbox-btn" aria-label="Find your area" disabled={busy}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', color: ACCENT, fontSize: '18px', lineHeight: 1, padding: '4px' }}>
            <span className="og-sbox-arrow">{busy ? '…' : '→'}</span><span className="og-sbox-word">{busy ? 'Searching…' : 'Search'}</span>
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {result?.kind === 'area' && (
          <p style={{ ...text, margin: 0 }}>
            <strong>{result.name}</strong>: the {plainScoreRank(result.rank, ranked)}, score {result.score.toFixed(1)} out of 100.{' '}
            <Link href={`/council-areas/lowest-scores/${result.slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>See what pulls it down or up</Link>
          </p>
        )}
        {result?.kind === 'message' && <p style={{ ...text, margin: 0 }}>{result.text}</p>}
      </div>
      <noscript><p style={{ ...text, margin: '8px 0 0' }}>The postcode search needs JavaScript.</p></noscript>
    </div>
  );
}
