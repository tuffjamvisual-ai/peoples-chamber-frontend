// Cookie consent (owner's approval, 29 Oct 2026), modelled on GOV.UK. One essential first party cookie,
// og_cookies_policy, holds the visitor's choice as {"analytics":true|false} for a year. Nothing else is set before a
// choice. PostHog (app/components/PostHogLoader.tsx) loads only when analytics is true; the banner
// (app/components/CookieBanner.tsx) and /cookies write the choice through writeConsent, which tells both through
// CONSENT_EVENT. Vercel Web Analytics and Speed Insights set no cookies and are not affected.

export const CONSENT_COOKIE = 'og_cookies_policy';
export const CONSENT_EVENT = 'og-cookie-consent';
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export type ConsentPolicy = { analytics: boolean };

// Runs in <head> before the page paints: a visitor who has already chosen gets the og-cookies-set class on <html>,
// and the banner, which is in the page from the first paint for everyone else, is hidden by CSS. So the banner never
// moves the page when it appears or goes.
export const CONSENT_HEAD_SCRIPT = `try{if(document.cookie.split('; ').some(function(c){return c.indexOf('${CONSENT_COOKIE}=')===0}))document.documentElement.classList.add('og-cookies-set')}catch(e){}`;

export function readConsent(): ConsentPolicy | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1)));
    return typeof v?.analytics === 'boolean' ? { analytics: v.analytics } : null;
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ analytics }))}; Max-Age=${ONE_YEAR_SEC}; Path=/; SameSite=Lax${secure}`;
  document.documentElement.classList.add('og-cookies-set');
  window.dispatchEvent(new CustomEvent<ConsentPolicy>(CONSENT_EVENT, { detail: { analytics } }));
}

// Deletes every ph_* cookie (on this host and each parent domain, where PostHog may set it) and every ph_* key in
// localStorage and sessionStorage. PostHog's own opt out marker (__ph_opt_in_out_*) is kept, so a page that has already
// loaded PostHog stays opted out.
export function clearAnalyticsStorage(): void {
  const host = window.location.hostname;
  const parts = host.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; Domain=.${parts.slice(i).join('.')}`);
  for (const c of document.cookie.split('; ')) {
    const name = c.split('=')[0];
    if (!name.startsWith('ph_')) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; Path=/${d}`;
  }
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (const k of Object.keys(store)) if (k.startsWith('ph_')) store.removeItem(k);
    } catch {
      // Storage can be unavailable (private browsing); nothing to remove then.
    }
  }
}
