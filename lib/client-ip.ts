// The reader's address for the app's own rate limits (Cowork ENTRY 795, owner yes 28 Nov 2026; READINESS-791 item B).
// Behind the Option D Worker every request reaches Vercel from Cloudflare, and Vercel overwrites x-forwarded-for and x-real-ip
// with the connecting address (vercel.com/docs/headers/request-headers), so all readers would share Cloudflare's few addresses.
// The Worker therefore sends the reader's address (from cf-connecting-ip) in x-optd-client-ip together with x-optd-proxy-secret.
// That address is used ONLY when the secret header equals OPTD_PROXY_SECRET (compared in constant time); otherwise, and whenever
// OPTD_PROXY_SECRET is not set, the order is exactly as before: x-forwarded-for's first value, then x-real-ip, then 'unknown'.
// No imports: proxy.ts may run on the edge runtime.
export const CLIENT_IP_HEADER = 'x-optd-client-ip';
export const PROXY_SECRET_HEADER = 'x-optd-proxy-secret';

// Constant time for equal lengths; a length difference is answered at once (the length of the secret is not a secret worth hiding).
export function sameSecret(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

type HeaderSource = { get(name: string): string | null };
export function clientIp(h: HeaderSource, secret: string | undefined = process.env.OPTD_PROXY_SECRET): string {
  if (secret) {
    const given = h.get(PROXY_SECRET_HEADER);
    const ip = h.get(CLIENT_IP_HEADER)?.trim();
    if (given && ip && sameSecret(given, secret)) return ip;
  }
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}
