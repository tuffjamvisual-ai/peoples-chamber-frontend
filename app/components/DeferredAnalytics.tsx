'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Vercel Web Analytics and Speed Insights load only after the visitor's first real interaction (owner, 6 Nov 2026): a scroll, click,
// tap or key press, so a bot that fetches a page and leaves sends nothing. The Analytics script sends the first page view when it
// loads, reading the path and referrer itself, and later page views as it always has. Nothing here is visible; PostHog has its own
// consent rules and is not affected.
//
// A scroll event alone is not proof of a person: the browser scrolls by itself to restore a position or reach a #link. So scroll events
// count only from a moment after the page has loaded; wheel, touch, pointer and key events always count.
const AFTER_LOAD_MS = 500;
const INPUT_EVENTS = ['pointerdown', 'touchstart', 'touchmove', 'wheel', 'keydown'] as const;

// If the first interaction is a click on a link, the script can arrive after the site has moved to the next page, and would count only
// that one. So the first page view is sent for the page the visitor landed on, then one for where they are now.
type Event = { type: 'pageview' | 'event'; url: string };
function countLandingPage(landing: string) {
  let first = true;
  return <T extends Event>(event: T): T => {
    if (!first || event.type !== 'pageview') return event;
    first = false;
    if (new URL(event.url).pathname === new URL(landing).pathname) return event;
    const va = (window as unknown as { va?: (name: string, data: object) => void }).va;
    setTimeout(() => va?.('pageview', {}), 0);
    return { ...event, url: landing };
  };
}

export default function DeferredAnalytics() {
  const [landing, setLanding] = useState<string | null>(null);
  useEffect(() => {
    const options: AddEventListenerOptions = { passive: true, capture: true };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      for (const e of INPUT_EVENTS) window.removeEventListener(e, start, options);
      window.removeEventListener('scroll', start, options);
      window.removeEventListener('load', armScroll);
      clearTimeout(timer);
    };
    const start = () => { stop(); setLanding(window.location.href); };
    const armScroll = () => { timer = setTimeout(() => window.addEventListener('scroll', start, options), AFTER_LOAD_MS); };
    for (const e of INPUT_EVENTS) window.addEventListener(e, start, options);
    if (document.readyState === 'complete') armScroll();
    else window.addEventListener('load', armScroll);
    return stop;
  }, []);
  if (!landing) return null;
  return (
    <>
      <Analytics beforeSend={countLandingPage(landing)} />
      {/* Speed Insights, free tier only (owner's approval, 21 Oct 2026): one visit in five is sampled to stay within
          the 10,000 events a rolling 30 days allows; Speed Insights Plus is not enabled. */}
      <SpeedInsights sampleRate={0.2} />
    </>
  );
}
