'use client';

// Newsletter strip (owner's approval, 26 Oct 2026, report 78): replaces the sign up pop up that interrupted the first
// internal link click. A small strip fixed to the bottom of the screen, never more than 80 px tall on phones, offering
// Open Govt Weekly by email. It uses /api/newsletter/subscribe (the same double opt in, validation, rate limit and
// messages as the newsletter form).
//
// Shown once the visitor has scrolled through 60% of a page or spent 45 seconds on it, whichever comes first. Never on
// the pages in EXCLUDED, to signed in members, or in a browser that has subscribed or confirmed (lib/newsletter-strip).
// Closing it hides it for 30 days. Without browser storage it still works: closed stays closed for this visit, and it
// shows again next visit. It never takes focus. While it shows, the page gets matching bottom padding so nothing is
// hidden behind it, and the scroll arrow is lifted above it (the 'og-strip' event).

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { STRIP_EVENT, markNewsletterSubscribed, newsletterStripBlocked, closeNewsletterStrip } from '@/lib/newsletter-strip';

const PAPER = '#f4e8d4';
const INK = '#14100d';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';
const EXCLUDED = ['/signup', '/login', '/newsletter', '/privacy', '/terms', '/commission', '/account', '/reset-password'];
const SCROLL_SHARE = 0.6;
const DWELL_MS = 45_000;
const DONE_MS = 5_000;
// The folder the strip lines up with (report 82): .og-dossier in OpenGovShell, .pca-folder in DossierShell.
const FOLDER_SELECTOR = '.og-dossier, .pca-folder';

// Kept outside the component so a closed strip stays closed across page changes in this visit, even without storage.
let closedThisVisit = false;

function isExcluded(pathname: string) {
  return EXCLUDED.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function NewsletterStrip() {
  const pathname = usePathname() || '/';
  const { user, authLoading } = useAuth();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const boxRef = useRef<HTMLElement>(null);

  const eligible = !authLoading && !user && !isExcluded(pathname);

  // Arm on each page: show after 60% of the page has been scrolled through, or after 45 seconds.
  useEffect(() => {
    if (!eligible || closedThisVisit || newsletterStripBlocked()) return;
    let done = false;
    const reveal = () => { if (!done) { done = true; setShow(true); } };
    const onScroll = () => {
      const doc = document.documentElement;
      const total = Math.max(doc.scrollHeight, document.body.scrollHeight);
      if (window.scrollY > 0 && (window.scrollY + window.innerHeight) / total >= SCROLL_SHARE) reveal();
    };
    const timer = window.setTimeout(reveal, DWELL_MS);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { done = true; window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, [eligible, pathname]);

  const visible = show && eligible;

  // While visible: the same left edge and width as the folder (report 82), set before the strip is drawn so it never
  // appears at one width and then moves. Pages with no folder keep the CSS default in globals.css (the folder's own
  // width rules). Re-measured on resize, orientation change and any change in the folder's size.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!visible || !box) return;
    const folder = document.querySelector<HTMLElement>(FOLDER_SELECTOR);
    if (!folder) return;
    const place = () => {
      const r = folder.getBoundingClientRect();
      box.style.left = `${r.left}px`;
      box.style.width = `${r.width}px`;
      box.style.right = 'auto';
      box.style.marginLeft = '0';
      box.style.marginRight = '0';
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('orientationchange', place);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    ro?.observe(folder);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('orientationchange', place);
      ro?.disconnect();
    };
  }, [visible]);

  // While visible: bottom padding on the page equal to the strip's height, and tell the scroll arrow to lift.
  useEffect(() => {
    const box = boxRef.current;
    if (!visible || !box) return;
    const body = document.body;
    const before = body.style.paddingBottom;
    const apply = () => {
      const h = Math.ceil(box.getBoundingClientRect().height);
      body.style.paddingBottom = `${h}px`;
      window.dispatchEvent(new CustomEvent(STRIP_EVENT, { detail: h }));
    };
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    ro?.observe(box);
    return () => {
      ro?.disconnect();
      body.style.paddingBottom = before;
      window.dispatchEvent(new CustomEvent(STRIP_EVENT, { detail: 0 }));
    };
  }, [visible]);

  function close() {
    closedThisVisit = true;
    closeNewsletterStrip();
    setShow(false);
  }

  // Escape closes it when focus is in the strip or on nothing in particular (never while another control has focus).
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const a = document.activeElement;
      if (!a || a === document.body || boxRef.current?.contains(a)) close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, source: 'strip' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState('sent');
        markNewsletterSubscribed();
        closedThisVisit = true;
        window.setTimeout(() => setShow(false), DONE_MS);
        return;
      }
      setState('error');
      setMessage(data.error || 'Something went wrong. Please try again.');
    } catch {
      setState('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (!visible) return null;

  return (
    <section ref={boxRef} className="og-strip" aria-labelledby="og-strip-text" style={{ background: PAPER, color: INK, fontFamily: FONT }}>
      <form className="og-strip-inner" onSubmit={submit} noValidate>
        {state === 'sent' ? (
          <p id="og-strip-text" role="status" className="og-strip-text" style={{ fontWeight: 700 }}>Check your email to confirm.</p>
        ) : state === 'error' ? (
          <p id="og-strip-text" role="alert" className="og-strip-text" style={{ color: ACCENT }}>{message}</p>
        ) : (
          <p id="og-strip-text" className="og-strip-text">Get Open Govt Weekly by email</p>
        )}
        {state !== 'sent' && (
          <div className="og-strip-row">
            <label htmlFor="og-strip-email" className="og-strip-sr">Your email address</label>
            <input
              id="og-strip-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="og-strip-input"
              style={{ fontFamily: FONT, color: INK, border: `1px solid ${INK}` }}
            />
            <button
              type="submit"
              disabled={state === 'sending'}
              className="og-strip-submit"
              style={{ fontFamily: FONT, border: `1px solid ${ACCENT}`, background: ACCENT, color: '#f4efe6', cursor: state === 'sending' ? 'wait' : 'pointer' }}
            >
              {state === 'sending' ? 'Sending…' : 'Sign up'}
            </button>
            {/* Honeypot: off-screen, skipped by keyboard and screen readers. */}
            <div aria-hidden="true" className="og-strip-sr">
              <label>Leave this empty<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
            </div>
          </div>
        )}
        <button type="button" aria-label="Close" onClick={close} className="og-strip-close" style={{ fontFamily: FONT, color: INK }}>
          ×
        </button>
      </form>
    </section>
  );
}
