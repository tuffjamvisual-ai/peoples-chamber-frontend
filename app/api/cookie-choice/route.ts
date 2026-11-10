// The cookie banner's Accept and Reject with JavaScript off (UX2o, owner approved through Cowork, 10 Nov 2026): the two
// buttons are a POST form to here. Saves the choice in the same cookie the banner writes with JavaScript on
// (lib/cookie-consent.ts), then sends the reader back to the page they were on, with #og-cookies-done, which hides the
// banner on that page (globals.css). Pages are cached, so without JavaScript a later page cannot read the cookie and the
// banner shows again there; with JavaScript the head script hides it everywhere.
import { NextResponse, type NextRequest } from 'next/server';
import { CONSENT_COOKIE } from '@/lib/cookie-consent';

const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const choice = form?.get('analytics');
  // Back to the page the form was on: same site only.
  let back = '/';
  const ref = req.headers.get('referer');
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.host === req.nextUrl.host) back = `${u.pathname}${u.search}`;
    } catch { /* no usable referrer: the home page */ }
  }
  const res = NextResponse.redirect(new URL(`${back}#og-cookies-done`, req.url), 303);
  if (choice === 'yes' || choice === 'no') {
    // Written as writeConsent writes it, so readConsent (one decodeURIComponent) reads it.
    const secure = req.nextUrl.protocol === 'https:' ? '; Secure' : '';
    res.headers.append('Set-Cookie', `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ analytics: choice === 'yes' }))}; Max-Age=${ONE_YEAR_SEC}; Path=/; SameSite=Lax${secure}`);
  }
  return res;
}
