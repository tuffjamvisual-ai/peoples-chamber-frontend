'use client';

// Cookie banner (owner's approval, 29 Oct 2026), modelled on the GOV.UK cookie banner: shown until a choice is made,
// then a confirmation with a link to /cookies and a "Hide cookie message" button. It is in the page from the first
// paint; for a visitor who has already chosen, CSS hides it before it paints (CONSENT_HEAD_SCRIPT, globals.css), so it
// never moves the page. The choice is saved by writeConsent (lib/cookie-consent.ts).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { CONSENT_EVENT, bannerHiddenNow, readConsent, writeConsent } from '@/lib/cookie-consent';

const INK = '#14100d';
const PAPER = '#fbf4e6';
const MONO = 'var(--font-special-elite), monospace';

type State = 'initial' | 'ask' | 'accepted' | 'rejected' | 'hidden';

const button: React.CSSProperties = {
  fontFamily: MONO, fontSize: '16px', lineHeight: 1.3, color: PAPER, background: INK, border: `2px solid ${INK}`,
  padding: '8px 14px', cursor: 'pointer', maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left',
};
const text: React.CSSProperties = { fontFamily: MONO, fontSize: '16px', lineHeight: 1.6, color: INK, margin: '0 0 10px', maxWidth: '46em' };
const link: React.CSSProperties = { color: INK, textDecoration: 'underline' };

export default function CookieBanner() {
  const [state, setState] = useState<State>('initial');
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The browser's cookie is read after hydration; the server always renders the question. Before
    // COOKIE_BANNER_HIDDEN_UNTIL (checked here, in the browser) the banner is not shown to anyone.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readConsent() || bannerHiddenNow() ? 'hidden' : 'ask');
    // A choice saved on /cookies while the banner is open closes it.
    const onChoice = () => setState((s) => (s === 'ask' || s === 'initial' ? 'hidden' : s));
    window.addEventListener(CONSENT_EVENT, onChoice);
    return () => window.removeEventListener(CONSENT_EVENT, onChoice);
  }, []);

  useEffect(() => {
    if (state === 'accepted' || state === 'rejected') confirmRef.current?.focus();
  }, [state]);

  if (state === 'hidden') return null;

  const choose = (analytics: boolean) => {
    // The confirmation is set first, so this banner's own choice does not close it through CONSENT_EVENT.
    setState(analytics ? 'accepted' : 'rejected');
    writeConsent(analytics);
    // How many visitors accept or reject, as totals only (Vercel Web Analytics custom event, cookieless; owner, 29 Oct
    // 2026). Sent once per click, whatever the choice; nothing else is sent with it.
    track('Cookie choice', { choice: analytics ? 'accepted' : 'rejected', where: 'banner' });
  };

  return (
    <div
      className="og-cookie-banner"
      data-state={state}
      role="region"
      aria-label="Cookies on Open Govt"
      style={{ background: PAPER, borderBottom: `2px solid ${INK}`, padding: '16px', boxSizing: 'border-box', width: '100%' }}
    >
      <div style={{ maxWidth: '1144px', margin: '0 auto' }}>
        {state === 'accepted' || state === 'rejected' ? (
          <div ref={confirmRef} tabIndex={-1} style={{ outline: 'none' }}>
            <p style={text}>
              {state === 'accepted' ? 'You’ve accepted additional cookies.' : 'You’ve rejected additional cookies.'}{' '}
              You can <Link href="/cookies" className="focus-ring" style={link}>change your cookie settings</Link> at any time.
            </p>
            <button type="button" className="focus-ring" style={button} onClick={() => setState('hidden')}>
              Hide cookie message
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: MONO, fontSize: '20px', fontWeight: 'bold', lineHeight: 1.3, color: INK, margin: '0 0 10px' }}>
              Cookies on Open Govt
            </h2>
            <p style={text}>We use some essential cookies to make this site work.</p>
            <p style={text}>We&rsquo;d like to set additional cookies to understand how you use Open Govt, so we can improve it.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
              <button type="button" className="focus-ring" style={button} onClick={() => choose(true)}>
                Accept additional cookies
              </button>
              <button type="button" className="focus-ring" style={button} onClick={() => choose(false)}>
                Reject additional cookies
              </button>
              <Link href="/cookies" className="focus-ring" style={{ ...link, fontFamily: MONO, fontSize: '16px' }}>View cookies</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
