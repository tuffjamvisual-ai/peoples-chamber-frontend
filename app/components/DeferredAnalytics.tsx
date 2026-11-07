'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import { computeRoute, pageview } from '@vercel/analytics';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Vercel Web Analytics counting rule (owner, 7 Nov 2026). A page view is sent for a page on whichever comes first:
//   (a) the visitor's first real interaction on it: a scroll, click, tap or key press; or
//   (b) 10 seconds with the page open AND visible (document.visibilityState "visible"); the timer pauses while the tab
//       is hidden, so a background tab sends nothing until it has been visible for 10 seconds.
// So a bot that fetches a page and leaves sends nothing, and a reader who reads without scrolling is still counted.
// At most one page view per page: each client side navigation starts the same rule afresh for the new page. The script
// is told not to track page views itself (route is passed), so every page view comes from here.
// Speed Insights stays as before: it loads on the first interaction only. Nothing here is visible; PostHog and the
// cookie banner's choice are not affected.
//
// A scroll event alone is not proof of a person: the browser scrolls by itself to restore a position, reach a #link or
// go to the top after a navigation. So scroll events count only from a moment after the page has loaded or the
// navigation happened; wheel, touch, pointer and key events always count.
const AFTER_LOAD_MS = 500;
const VISIBLE_MS = 10_000;
const INPUT_EVENTS = ['pointerdown', 'touchstart', 'touchmove', 'wheel', 'keydown'] as const;

export default function DeferredAnalytics() {
  const pathname = usePathname();
  const params = useParams();
  const [loaded, setLoaded] = useState(false);       // the Analytics script is on the page
  const [interacted, setInteracted] = useState(false); // Speed Insights loads after the first interaction
  const [counted, setCounted] = useState<{ path: string; route: string; n: number } | null>(null);
  const sent = useRef(0);
  // The route pattern, such as /bills/[id], as the Next.js Analytics component works it out.
  const route = computeRoute(pathname, params as Record<string, string | string[]>) ?? pathname;

  // The rule, once for each page: the first page and every client side navigation.
  useEffect(() => {
    if (!pathname) return;
    let done = false;
    const options: AddEventListenerOptions = { passive: true, capture: true };
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let visibleTimer: ReturnType<typeof setTimeout> | undefined;
    let visibleLeft = VISIBLE_MS;
    let visibleSince = 0;

    const stop = () => {
      for (const e of INPUT_EVENTS) window.removeEventListener(e, onInput, options);
      window.removeEventListener('scroll', onInput, options);
      window.removeEventListener('load', armScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(scrollTimer);
      clearTimeout(visibleTimer);
    };
    const count = (byInteraction: boolean) => {
      if (done) return;
      done = true;
      stop();
      if (byInteraction) setInteracted(true);
      setLoaded(true);
      setCounted((c) => ({ path: pathname, route, n: (c?.n ?? 0) + 1 }));
    };
    function onInput() { count(true); }
    function armScroll() { scrollTimer = setTimeout(() => window.addEventListener('scroll', onInput, options), AFTER_LOAD_MS); }
    const startVisible = () => { visibleSince = Date.now(); visibleTimer = setTimeout(() => count(false), visibleLeft); };
    function onVisibility() {
      if (document.visibilityState === 'visible') { if (!visibleTimer) startVisible(); }
      else if (visibleTimer) { clearTimeout(visibleTimer); visibleTimer = undefined; visibleLeft -= Date.now() - visibleSince; }
    }

    for (const e of INPUT_EVENTS) window.addEventListener(e, onInput, options);
    if (document.readyState === 'complete') armScroll();
    else window.addEventListener('load', armScroll);
    document.addEventListener('visibilitychange', onVisibility);
    if (document.visibilityState === 'visible') startVisible();
    return stop;
  }, [pathname, route]);

  // Send the page view once the script is mounted (Analytics' own effects run first, setting up its queue).
  useEffect(() => {
    if (!counted || counted.n === sent.current) return;
    sent.current = counted.n;
    pageview({ route: counted.route, path: counted.path });
  }, [counted]);

  if (!loaded) return null;
  return (
    <>
      {/* route={null}: the script sends no page view of its own; they all come from the rule above. */}
      <Analytics route={null} path={null} />
      {/* Speed Insights, free tier only (owner's approval, 21 Oct 2026): one visit in five is sampled to stay within
          the 10,000 events a rolling 30 days allows; Speed Insights Plus is not enabled. */}
      {interacted && <SpeedInsights sampleRate={0.2} />}
    </>
  );
}
