'use client';
// 'Find your area' on /council-areas/lowest-scores (Cowork ENTRY 415 LAYOUT CHANGE): a postcode through the site's existing
// /api/councils/lookup (postcodes.io; no new service, no key) gives the council's slug; the page passes every ranked
// council area's rank, score and name by slug, so the result needs no other request. Postcodes outside England (and
// postcodes not found) get a plain message that the list covers England only. Phone: the box and the button full width.
import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';
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
      <form onSubmit={onSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '0 0 10px' }}>
        <input id="ls-postcode" name="postcode" aria-label="Your postcode" placeholder="Your postcode" autoComplete="postal-code" inputMode="text" value={postcode} onChange={(e) => setPostcode(e.target.value)}
          style={{ ...text, flex: '1 1 16em', minWidth: 0, minHeight: '48px', padding: '0 12px', border: `1.5px solid ${INK}`, background: '#fff', boxSizing: 'border-box' }} />
        <button type="submit" disabled={busy}
          style={{ ...text, flex: '1 1 8em', minHeight: '48px', padding: '0 18px', border: `1.5px solid ${INK}`, background: INK, color: '#fff', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {busy ? 'Looking up' : 'Find'}
        </button>
      </form>
      <div aria-live="polite">
        {result?.kind === 'area' && (
          <p style={{ ...text, margin: 0 }}>
            <strong>{result.name}</strong>: rank {result.rank} of {ranked} (1 is the lowest score), score {result.score.toFixed(1)}.{' '}
            <Link href={`/council-areas/lowest-scores/${result.slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>See what pulls it down or up</Link>
          </p>
        )}
        {result?.kind === 'message' && <p style={{ ...text, margin: 0 }}>{result.text}</p>}
      </div>
      <noscript><p style={{ ...text, margin: '8px 0 0' }}>The postcode search needs JavaScript.</p></noscript>
    </div>
  );
}
