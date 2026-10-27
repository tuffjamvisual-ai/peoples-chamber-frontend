'use client';

// Follow button on MP, bill and donor pages (job 74). Signed out, it leads to sign up and back to the page. Signed in,
// one click follows or unfollows. A member's first follow (or saved search) first shows the consent box: unticked,
// plain wording, linked to the privacy page; nothing is stored until it is ticked (lib/member-data.ts).
//
// variant="sidebar" (owner, 27 Oct 2026): on MP profiles Follow is the last item of the profile sections nav
// (MagazineProfileSections), drawn exactly like a section button with a thin rule above it, so it stays in view in the
// sticky sidebar. "Follow this MP", or "✓ Following" (a click unfollows). The consent box and any message open in a
// panel over the page (a portal on document.body), so the nav, which scrolls sideways on phones, cannot clip them.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import ConsentBox from './ConsentBox';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

type Kind = 'mp' | 'bill' | 'donor';
type State = { following: boolean; consented: boolean } | null;

export default function FollowButton({ kind, targetKey, label, variant = 'inline' }: { kind: Kind; targetKey: string; label: string; variant?: 'inline' | 'sidebar' }) {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>(null);
  const [busy, setBusy] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    fetch(`/api/follows?kind=${kind}&key=${encodeURIComponent(targetKey)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d) setState({ following: !!d.following, consented: !!d.consented }); })
      .catch(() => {});
    return () => { live = false; };
  }, [user, kind, targetKey]);

  async function follow(consent: boolean) {
    setBusy(true); setMessage(null);
    try {
      const r = await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, key: targetKey, consent }) });
      if (r.status === 409) { setAskConsent(true); return; }
      if (r.status === 422) { setMessage('You follow the most pages allowed (100). Unfollow something on your preferences page first.'); return; }
      if (!r.ok) { setMessage('That did not work. Please try again.'); return; }
      setAskConsent(false);
      setState({ following: true, consented: true });
    } finally { setBusy(false); }
  }

  async function unfollow() {
    setBusy(true); setMessage(null);
    try {
      const r = await fetch('/api/follows', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, key: targetKey }) });
      if (!r.ok) { setMessage('That did not work. Please try again.'); return; }
      setState((s) => ({ following: false, consented: s?.consented ?? true }));
    } finally { setBusy(false); }
  }

  const buttonStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: '15px', letterSpacing: '0.06em', color: '#fff', background: ACCENT, border: `1.5px solid ${ACCENT}`,
    borderRadius: '3px', padding: '7px 14px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', lineHeight: 1.3,
  };
  const quietStyle: React.CSSProperties = { ...buttonStyle, color: ACCENT, background: 'transparent' };

  if (variant === 'sidebar') {
    const following = !!user && !!state?.following;
    const waiting = authLoading || (!!user && !state) || busy;
    const chip: React.CSSProperties = {
      display: 'block', width: '100%', boxSizing: 'border-box', padding: '12px 16px', margin: '8px 0 0', border: 'none',
      borderTop: '1px solid rgba(20,16,13,0.25)', borderLeft: '4px solid transparent', background: 'transparent',
      fontWeight: following ? 'bold' : 'normal', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em',
      color: INK, fontFamily: 'inherit', textAlign: 'left', cursor: waiting ? 'progress' : 'pointer',
    };
    const onClick = () => {
      if (authLoading) return;
      if (!user) { router.push(`/login?mode=login&returnTo=${encodeURIComponent(window.location.pathname)}`); return; }
      if (!state || busy) return;
      if (state.following) unfollow(); else follow(false);
    };
    const close = () => { setAskConsent(false); setMessage(null); };
    const panel = (askConsent || message) && typeof document !== 'undefined' ? createPortal(
      <div role="dialog" aria-modal="true" aria-label={askConsent ? 'Your agreement' : 'Follow'} onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,16,13,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <div style={{ background: '#ebe5d8', width: '100%', maxWidth: '640px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '4px 14px 14px', boxSizing: 'border-box' }}>
          {askConsent && <ConsentBox onAgree={() => follow(true)} onCancel={close} busy={busy} />}
          {message && (
            <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, paddingTop: '12px' }}>
              <p role="status" style={{ margin: '0 0 10px' }}>{message}</p>
              <button type="button" onClick={close} autoFocus style={{ ...quietStyle, padding: '5px 12px' }}>Close</button>
            </div>
          )}
        </div>
      </div>,
      document.body,
    ) : null;
    return (
      <>
        <button type="button" className="mp-follow-chip" onClick={onClick} aria-pressed={following}
          aria-label={following ? `Following ${label}. Unfollow` : `Follow ${label}`} title={following ? 'You get a weekly email when this MP changes. Click to unfollow.' : undefined} style={chip}>
          {following ? '✓ Following' : 'Follow this MP'}
        </button>
        {panel}
      </>
    );
  }

  if (authLoading) return <div style={{ minHeight: '38px' }} aria-hidden="true" />;

  if (!user) {
    const here = typeof window !== 'undefined' ? window.location.pathname : '/';
    return (
      <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 16px' }}>
        <Link href={`/login?mode=signup&returnTo=${encodeURIComponent(here)}`} className="no-hover-scale" style={quietStyle}>Follow</Link>
        <span style={{ marginLeft: '10px' }}>Sign up free for a weekly email when this changes.</span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 16px' }}>
      {state?.following ? (
        <>
          <button type="button" onClick={unfollow} disabled={busy} aria-pressed="true" aria-label={`Unfollow ${label}`} style={quietStyle}>Following. Unfollow</button>
          <span style={{ marginLeft: '10px' }}>You get a weekly email when something changes. <Link href="/preferences" style={{ color: ACCENT }}>Preferences</Link></span>
        </>
      ) : (
        <>
          <button type="button" onClick={() => follow(false)} disabled={busy || !state} aria-pressed="false" aria-label={`Follow ${label}`} style={{ ...buttonStyle, opacity: busy || !state ? 0.6 : 1 }}>Follow</button>
          <span style={{ marginLeft: '10px' }}>Get a weekly email when this changes.</span>
        </>
      )}
      {askConsent && <ConsentBox onAgree={() => follow(true)} onCancel={() => setAskConsent(false)} busy={busy} />}
      {message && <p role="status" style={{ margin: '8px 0 0' }}>{message}</p>}
    </div>
  );
}
