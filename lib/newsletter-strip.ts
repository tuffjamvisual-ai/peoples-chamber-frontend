// Browser storage for the newsletter strip (app/components/NewsletterStrip.tsx, report 78). Every read and write is
// wrapped in try/catch: with storage blocked the strip still works, it just shows again on the next visit.

export const STRIP_EVENT = 'og-strip'; // detail: the strip's height in px (0 when hidden)

const SUBSCRIBED = 'og_nl_subscribed';           // this browser has signed up for, or confirmed, the newsletter
const CLOSED_UNTIL = 'og_nl_strip_closed_until'; // the strip was closed; hidden until this time (ms)
const CLOSE_FOR_MS = 30 * 24 * 60 * 60 * 1000;

export function newsletterStripBlocked(): boolean {
  try {
    if (localStorage.getItem(SUBSCRIBED)) return true;
    const until = Number(localStorage.getItem(CLOSED_UNTIL) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function closeNewsletterStrip() {
  try { localStorage.setItem(CLOSED_UNTIL, String(Date.now() + CLOSE_FOR_MS)); } catch { /* storage blocked */ }
}

export function markNewsletterSubscribed() {
  try { localStorage.setItem(SUBSCRIBED, '1'); } catch { /* storage blocked */ }
}
