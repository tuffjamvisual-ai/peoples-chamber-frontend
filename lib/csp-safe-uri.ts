// Used by /api/csp-report (F10; Cowork ENTRY 191). Kept out of the route file: a route file may export only its handlers
// and route settings.
const clip = (v: unknown) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 300);
// An address is logged as its origin and path only, never its query string or fragment (Cowork ENTRY 191, T2): a page
// such as /reset-password?token= or /newsletter/unsubscribe?token= would otherwise put a token into Vercel's logs.
// Values that are not addresses ('inline', 'eval', 'self') pass through.
export function safeUri(v: unknown): string {
  const raw = String(v ?? '');
  try {
    const u = new URL(raw);
    return clip(`${u.origin}${u.pathname}`);
  } catch {
    return clip(raw.split(/[?#]/)[0]);
  }
}
