// The address used in links inside account emails (confirm your email, reset your password). Security review L5 (owner
// approved 14 Nov 2026, COWORK-TO-T1 ENTRY 59): in production it is fixed to https://www.opengovt.uk, never taken from
// the request, so a request with a forged Host header cannot make the site email a link to another address. Preview
// and local builds keep NEXT_PUBLIC_SITE_URL or the request's own address, so links there point at that build.
export const PRODUCTION_SITE = 'https://www.opengovt.uk';

export function authLinkBase(request: Request): string {
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_SITE;
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}
