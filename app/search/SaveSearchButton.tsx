'use client';

// "Save this search" on /search for signed in members (job 74 Part 5). Saved searches are listed, rerun and deleted
// on /preferences; their weekly alert is off until the member turns it on there. A member's first saved item shows
// the consent box (app/components/ConsentBox.tsx). Signed out, nothing is shown: the sign up note covers it.
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import ConsentBox from '../components/ConsentBox';

const ACCENT = '#7a1612';
const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';

type Params = { q: string; type: string; dept: string | null; from: string | null; to: string | null; sort: string };

export default function SaveSearchButton(params: Params) {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'consent'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  if (!user || params.q.trim().length < 2) return null;

  async function save(consent: boolean) {
    setState('saving'); setMessage(null);
    const r = await fetch('/api/saved-searches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...params, consent }) });
    if (r.status === 409) { setState('consent'); return; }
    if (r.status === 422) { setState('idle'); setMessage('You have 20 saved searches, the most allowed. Delete one on your preferences page first.'); return; }
    if (!r.ok) { setState('idle'); setMessage('That did not work. Please try again.'); return; }
    setState('saved');
  }

  return (
    <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 14px' }}>
      {state === 'saved' ? (
        <span role="status">Saved. <Link href="/preferences" style={{ color: ACCENT }}>See your saved searches</Link></span>
      ) : (
        <button type="button" onClick={() => save(false)} disabled={state === 'saving'} style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, background: 'transparent', border: `1.5px solid ${ACCENT}`, borderRadius: '3px', padding: '5px 12px', cursor: 'pointer' }}>
          Save this search
        </button>
      )}
      {state === 'consent' && <ConsentBox onAgree={() => save(true)} onCancel={() => setState('idle')} busy={false} />}
      {message && <p role="status" style={{ margin: '8px 0 0' }}>{message}</p>}
    </div>
  );
}
