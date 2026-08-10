'use client';

// Soft registration prompt for visitors arriving from an EXTERNAL referrer
// (social, search engines, any non-site domain). They read their landing page
// uninterrupted; the first time they click an internal link to another page we
// intercept it and offer a free account or to continue as a guest.
//
// Does NOT trigger for: direct visits (no referrer), internal referrers (same
// host), logged-in users, or once the session dismiss cookie is set. Also skips
// when the current or destination page is /signup, /login, /about or /privacy.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const PAPER = '#f4e8d4';
const INK = '#14100d';
const ACCENT = '#7a1612';
const SERIF = '"EB Garamond", Garamond, Georgia, "Times New Roman", serif';
const COOKIE = 'og_soft_prompt_seen';
const EXCLUDED = ['/signup', '/login', '/about', '/privacy', '/terms'];

function hasDismissCookie() {
  return typeof document !== 'undefined' && document.cookie.split('; ').some((c) => c.startsWith(COOKIE + '='));
}
function isExcluded(pathname: string) {
  return EXCLUDED.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function SoftRegisterPrompt() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);
  const externalRef = useRef(false);
  const intendedRef = useRef<string | null>(null);

  // Decide external arrival once, on first mount (referrer reflects the page
  // they actually landed on; client-side navigation never changes it).
  useEffect(() => {
    try {
      const ref = document.referrer;
      externalRef.current = !!ref && new URL(ref).host !== window.location.host;
    } catch {
      externalRef.current = false;
    }
  }, []);

  // Arm only for an external, logged-out, not-yet-dismissed visitor. Re-runs
  // when auth resolves so logged-in users never get armed.
  useEffect(() => {
    armedRef.current = externalRef.current && !user && !hasDismissCookie();
  }, [user]);

  // Intercept the first qualifying internal navigation click (capture phase, so
  // it runs before Next's Link handler and can cancel the navigation).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!armedRef.current || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let new-tab / modified clicks through
      const a = (e.target as HTMLElement | null)?.closest?.('a');
      if (!a) return;
      if (a.target && a.target !== '_self') return; // opens in new tab/window
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;            // external link
      if (url.pathname === window.location.pathname) return;        // same page / hash
      if (isExcluded(window.location.pathname) || isExcluded(url.pathname)) return;
      e.preventDefault();
      e.stopPropagation();
      intendedRef.current = url.pathname + url.search + url.hash;
      setOpen(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  function dismissAsGuest() {
    document.cookie = `${COOKIE}=1; path=/; SameSite=Lax`; // session cookie (no expiry)
    armedRef.current = false;
    setOpen(false);
    const to = intendedRef.current;
    intendedRef.current = null;
    if (to) router.push(to);
  }

  function createAccount() {
    armedRef.current = false;
    intendedRef.current = null;
    setOpen(false);
    router.push('/signup');
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') dismissAsGuest(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to opengovt"
      onClick={dismissAsGuest}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: PAPER, color: INK, fontFamily: SERIF, maxWidth: '440px', width: '100%', padding: '30px 30px 26px', border: `2px solid ${INK}`, boxShadow: '0 18px 50px rgba(0,0,0,0.45)' }}
      >
        <h2 style={{ fontFamily: SERIF, fontSize: '27px', fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.01em', color: INK }}>
          Welcome to opengovt
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: '17px', lineHeight: 1.65, margin: '0 0 24px', color: INK }}>
          To vote on parliamentary divisions, participate in polls and access all features, create a free account. Or continue browsing as a guest.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={createAccount}
            style={{ flex: '1 1 180px', fontFamily: SERIF, fontSize: '16px', fontWeight: 700, color: '#fff', background: ACCENT, border: `2px solid ${ACCENT}`, padding: '12px 18px', cursor: 'pointer' }}
          >
            Create free account
          </button>
          <button
            type="button"
            onClick={dismissAsGuest}
            style={{ flex: '1 1 180px', fontFamily: SERIF, fontSize: '16px', fontWeight: 700, color: INK, background: 'transparent', border: `2px solid ${INK}`, padding: '12px 18px', cursor: 'pointer' }}
          >
            Browse as guest
          </button>
        </div>
      </div>
    </div>
  );
}
