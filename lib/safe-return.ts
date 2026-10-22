// Same-origin check for ?returnTo= and the signup's stored return path (owner's approval, 22 Oct 2026).
// A plain "starts with / but not //" test let "/\evil.com" through, which browsers read as "//evil.com".
// Parse the value against a fixed base: it must be a path on that same origin, with no backslashes or
// control characters anywhere. Returns the path, query and hash, or null if the value is not safe.

const BASE = 'https://www.opengovt.uk';

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
