'use client';

// Cookie banner (owner's approval, 29 Oct 2026), modelled on the GOV.UK cookie banner: shown until a choice is made,
// then a confirmation with a link to /cookies and a "Hide cookie message" button. It is in the page from the first
// paint; for a visitor who has already chosen, CSS hides it before it paints (CONSENT_HEAD_SCRIPT, globals.css), so it
// never moves the page. The choice is saved by writeConsent (lib/cookie-consent.ts).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { CONSENT_EVENT, readConsent, writeConsent } from '@/lib/cookie-consent';
import { phoneUpTo, wideFrom, PHONE } from '@/lib/breakpoints';

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

// Which wording shows at which width (owner, 4 Nov 2026). Kept here, in the banner's own HTML, as well as in
// globals.css, so the banner can never show both wordings at once: on 4 Nov the live stylesheet lacked these rules and
// every visitor saw both labels in each button and "View cookies" twice. Wide screens: the two paragraphs, the long
// button labels and the "View cookies" link beside the buttons. Under 480px: one sentence ending in an inline "View
// cookies" link, and "Accept analytics" and "Reject analytics" side by side, each on one line and 44px tall.
const BANNER_CSS = `
.og-cookie-banner .og-cb-short, .og-cookie-banner .og-cb-narrow { display: none; }
.og-cb-form { display: contents; }
/* Phones (UX2o, owner approved through Cowork, 10 Nov 2026): fixed at the foot of the screen, out of the page flow, so it
   never pushes the page down, and at most 120px tall at 320px wide: the heading is kept for screen readers, one short
   sentence with the "View cookies" link, then Accept and Reject side by side, equal, 44px tall. The page gets the same
   space at its foot so nothing ends up behind the banner. From 640px up, at the top of the page as before. */
@media ${PHONE} {
  .og-cookie-banner { position: fixed !important; left: 0; right: 0; bottom: 0; z-index: 50; border-bottom: none !important; border-top: 2px solid ${INK}; padding: 8px 12px !important; box-shadow: 0 -2px 8px rgba(20,16,13,0.15); }
  .og-cookie-banner h2 { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; margin: 0 !important; }
  .og-cookie-banner .og-cb-long, .og-cookie-banner .og-cb-wide, .og-cookie-banner .og-cb-link, .og-cookie-banner .og-cb-short-full { display: none !important; }
  .og-cookie-banner .og-cb-short { display: block; font-size: 15px !important; line-height: 1.35 !important; margin-bottom: 6px !important; }
  .og-cookie-banner .og-cb-narrow { display: inline; }
  .og-cookie-banner .og-cb-actions { gap: 8px !important; margin-top: 0 !important; flex-wrap: nowrap !important; }
  .og-cookie-banner .og-cb-btn { flex: 1 1 0; min-width: 0; min-height: 44px; text-align: center !important; white-space: nowrap !important; font-size: 15px !important; padding: 0 6px !important; }
  body:has(.og-cookie-banner:not([data-state="initial"])), html:not(.og-cookies-set) body:has(.og-cookie-banner) { padding-bottom: 130px; }
}
/* Tablet and desktop (T1-7ab, owner via Cowork, 10 Nov 2026): the same idea as UX2o, a slim bar fixed to the foot of the
   screen, out of the page flow, so it never pushes the page down or covers the top of it. One line of text ending in
   "View cookies", then Accept and Reject side by side, the same size, 44px tall. The heading is kept for screen
   readers. From 1024px the long button labels and the two-part sentence; from 640 to 1023px the shorter ones. The page
   gets the same space at its foot so nothing ends up behind the bar. */
@media ${wideFrom(768)} {
  .og-cookie-banner { position: fixed !important; left: 0; right: 0; bottom: 0; z-index: 50; border-bottom: none !important; border-top: 2px solid ${INK}; padding: 10px 24px !important; box-shadow: 0 -2px 10px rgba(20,16,13,0.18); }
  .og-cookie-banner .og-cb-inner, .og-cookie-banner .og-cb-confirm { display: flex; align-items: center; gap: 12px 24px; }
  .og-cookie-banner h2 { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; margin: 0 !important; }
  .og-cookie-banner .og-cb-long, .og-cookie-banner .og-cb-link { display: none !important; }
  .og-cookie-banner .og-cb-short, .og-cookie-banner .og-cb-confirm p { display: block; flex: 1 1 auto; min-width: 0; font-size: 15px !important; line-height: 1.4 !important; margin: 0 !important; }
  .og-cookie-banner .og-cb-actions { display: grid !important; grid-template-columns: 1fr 1fr; gap: 12px !important; margin: 0 !important; flex: none; }
  .og-cookie-banner .og-cb-btn { min-height: 44px; text-align: center !important; white-space: nowrap !important; font-size: 15px !important; padding: 6px 14px !important; flex: none; }
  body:has(.og-cookie-banner:not([data-state="initial"])), html:not(.og-cookies-set) body:has(.og-cookie-banner) { padding-bottom: 96px; }
}
@media ${wideFrom(768)} {
  .og-cookie-banner .og-cb-wide, .og-cookie-banner .og-cb-short-full { display: none; }
  .og-cookie-banner .og-cb-narrow, .og-cookie-banner .og-cb-short-phone { display: inline; }
}
@media ${wideFrom(1024)} {
  .og-cookie-banner .og-cb-wide, .og-cookie-banner .og-cb-short-full { display: inline; }
  .og-cookie-banner .og-cb-narrow, .og-cookie-banner .og-cb-short-phone { display: none; }
}
/* With JavaScript off, a choice made in the banner comes back with #og-cookies-done, which hides it, at every width. */
html:has(#og-cookies-done:target) .og-cookie-banner { display: none !important; }
html:has(#og-cookies-done:target) body { padding-bottom: 0 !important; }
@media ${phoneUpTo(479)} {
  .og-cookie-banner { padding: 8px 12px !important; }
  .og-cookie-banner h2 { font-size: 16px !important; line-height: 1.25 !important; margin-bottom: 4px !important; }
  .og-cookie-banner .og-cb-long, .og-cookie-banner .og-cb-wide, .og-cookie-banner .og-cb-link { display: none !important; }
  .og-cookie-banner .og-cb-short { display: block; font-size: 15px !important; line-height: 1.35 !important; margin-bottom: 8px !important; }
  .og-cookie-banner .og-cb-narrow { display: inline; }
  .og-cookie-banner .og-cb-actions { gap: 8px !important; margin-top: 0 !important; flex-wrap: nowrap !important; }
  .og-cookie-banner .og-cb-btn { flex: 1 1 0; min-width: 0; min-height: 44px; text-align: center !important; white-space: nowrap !important; font-size: 15px !important; padding: 0 6px !important; }
}`;

export default function CookieBanner() {
  const [state, setState] = useState<State>('initial');
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The browser's cookie is read after hydration; the server always renders the question.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readConsent() ? 'hidden' : 'ask');
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
    <>
    {/* With JavaScript off, a choice comes back to this page with #og-cookies-done, which hides the banner here (UX2o). */}
    <i id="og-cookies-done" aria-hidden style={{ position: 'absolute', top: 0 }} />
    <div
      className="og-cookie-banner"
      data-state={state}
      role="region"
      aria-label="Cookies on opengovt"
      style={{ background: PAPER, borderBottom: `2px solid ${INK}`, padding: '16px', boxSizing: 'border-box', width: '100%' }}
    >
      <style>{BANNER_CSS}</style>
      <div className="og-cb-inner" style={{ maxWidth: '1144px', margin: '0 auto' }}>
        {state === 'accepted' || state === 'rejected' ? (
          <div ref={confirmRef} tabIndex={-1} className="og-cb-confirm" style={{ outline: 'none', flex: '1 1 auto' }}>
            <p style={text}>
              {state === 'accepted' ? 'You’ve accepted additional cookies.' : 'You’ve rejected additional cookies.'}{' '}
              You can <Link href="/cookies" className="focus-ring og-cb-inline" style={link}>change your cookie settings</Link> at any time.
            </p>
            <button type="button" className="focus-ring og-cb-btn" style={button} onClick={() => setState('hidden')}>
              Hide cookie message
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: MONO, fontSize: '20px', fontWeight: 'bold', lineHeight: 1.3, color: INK, margin: '0 0 10px' }}>
              Cookies on opengovt
            </h2>
            <p className="og-cb-long" style={text}>We use some essential cookies to make this site work.</p>
            <p className="og-cb-long" style={text}>We&rsquo;d like to set additional cookies to understand how you use opengovt, so we can improve it.</p>
            {/* Phones under 480px (owner, 4 Nov 2026): one sentence ending in the "View cookies" link, and shorter button
                labels (globals.css shows one wording or the other; wider screens keep theirs). */}
            <p className="og-cb-short" style={text}>
              {/* Phones (UX2o): the shorter sentence keeps the banner within 120px at 320px wide; the essential cookies line is on /cookies. */}
              <span className="og-cb-short-full">We use essential cookies to run the site, and we&rsquo;d like analytics cookies to see how it&rsquo;s used. </span>
              <span className="og-cb-short-phone">Can we use analytics cookies to see how opengovt is used?</span>{' '}
              <Link href="/cookies" className="focus-ring og-cb-inline" style={link}>View cookies</Link>
            </p>
            {/* With JavaScript off the two buttons post the choice (app/api/cookie-choice); with it on, they save it here. */}
            <form method="post" action="/api/cookie-choice" className="og-cb-form" onSubmit={(e) => e.preventDefault()}>
            <div className="og-cb-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
              <button type="submit" name="analytics" value="yes" className="focus-ring og-cb-btn" style={button} onClick={(e) => { e.preventDefault(); choose(true); }}>
                <span className="og-cb-wide">Accept additional cookies</span><span className="og-cb-narrow">Accept analytics</span>
              </button>
              <button type="submit" name="analytics" value="no" className="focus-ring og-cb-btn" style={button} onClick={(e) => { e.preventDefault(); choose(false); }}>
                <span className="og-cb-wide">Reject additional cookies</span><span className="og-cb-narrow">Reject analytics</span>
              </button>
              <Link href="/cookies" className="focus-ring og-cb-link" style={{ ...link, fontFamily: MONO, fontSize: '16px' }}>View cookies</Link>
            </div>
            </form>
          </>
        )}
      </div>
    </div>
    </>
  );
}
