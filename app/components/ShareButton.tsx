'use client';

// Share a report from a phone (owner, 5 Nov 2026), under 640px only: the phone's own share menu where it has one
// (navigator.share), otherwise "Copy link" with a "Link copied" confirmation. No third party scripts and no tracking: the
// address goes nowhere unless the reader sends it. With JavaScript off nothing shows (html.og-js). Styles are in globals.css.
import { useState, useSyncExternalStore } from 'react';

const noChange = () => () => {};

export default function ShareButton({ title }: { title: string }) {
  // The server renders "Share", the common case, so most phones see no change of label when the page wakes up.
  const canShare = useSyncExternalStore(noChange, () => typeof navigator.share === 'function', () => true);
  const [note, setNote] = useState('');

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNote('Link copied');
    } catch {
      setNote('Could not copy the link');
    }
    setTimeout(() => setNote(''), 4000);
  }

  async function onClick() {
    const url = location.origin + location.pathname;
    if (!canShare) return copy(url);
    try {
      await navigator.share({ title, url });
    } catch (e) {
      // The reader closing the share menu is not a failure.
      if ((e as Error).name !== 'AbortError') await copy(url);
    }
  }

  return (
    <div className="art-share">
      <button type="button" onClick={onClick}>{canShare ? 'Share' : 'Copy link'}</button>
      <span role="status">{note}</span>
    </div>
  );
}
