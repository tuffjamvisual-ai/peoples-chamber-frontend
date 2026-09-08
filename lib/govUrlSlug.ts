// Derives the /news/[slug] route parameter from a gov_url by taking the last
// path segment (stripping query-string and fragment first) and removing any
// characters that are not alphanumeric or hyphens.
//
// This is the canonical derivation used by both:
//   - app/news/[slug]/page.tsx  (generateStaticParams + getPressRelease lookup)
//   - app/page.tsx              (Whitehall strip links)
//
// Returns null when the URL yields no usable segment.
export function govUrlToSlug(govUrl: string): string | null {
  const segment = govUrl.split(/[?#]/)[0].split('/').filter(Boolean).pop()
  if (!segment) return null
  const slug = segment.replace(/[^a-z0-9-]/gi, '')
  return slug || null
}
