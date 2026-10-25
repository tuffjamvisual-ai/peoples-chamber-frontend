'use client';

// The sign up note above the search results (lib/search-note.ts). Hidden unless its data-show attribute is "1", which
// only the note's own script sets (before hydration on a full load, so suppressHydrationWarning). Wording: alerts and
// saved searches do not exist yet, so the note offers voting (owner: update the wording when alerts launch).
import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { SEARCH_NOTE_ID, SEARCH_NOTE_DISMISS_KEY, SEARCH_NOTE_DAYS, noteSearch } from '@/lib/search-note';

export const SEARCH_NOTE_TEXT = 'Sign up free to vote on bills and polls.';

export default function SignupNote({ q, returnTo }: { q: string; returnTo: string }) {
  const { user } = useAuth();

  // Reached by a link inside the site (not a full load and not the search box): count this search too.
  useEffect(() => { noteSearch(q); }, [q]);
  // Signed in after the note appeared: hide it.
  useEffect(() => {
    if (user) document.getElementById(SEARCH_NOTE_ID)?.setAttribute('data-show', '0');
  }, [user]);

  function dismiss() {
    try { localStorage.setItem(SEARCH_NOTE_DISMISS_KEY, String(Date.now() + SEARCH_NOTE_DAYS * 24 * 60 * 60 * 1000)); } catch {}
    document.getElementById(SEARCH_NOTE_ID)?.setAttribute('data-show', '0');
  }

  return (
    <div id={SEARCH_NOTE_ID} className="og-snote" suppressHydrationWarning role="note">
      <span>
        {SEARCH_NOTE_TEXT}{' '}
        <Link href={`/login?mode=signup&returnTo=${encodeURIComponent(returnTo)}`} className="no-hover-scale" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Sign up</Link>
      </span>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="og-snote-x">×</button>
    </div>
  );
}
