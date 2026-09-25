import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink';
import RelatedLinks from '../../components/RelatedLinks';
import { govUrlToSlug } from '@/lib/govUrlSlug'
import { resolveOrgToDeptSlug } from '@/lib/govOrgSlug'
import { getDeptContext } from '../../api/department-context/route'

export const revalidate = 3600

const SERIF = '"Georgia", "Charter", "Times New Roman", serif'
const INK = '#14100d'
const ACCENT = '#6b2417'

type PressRelease = {
  id: number
  title: string
  description: string | null
  organisation: string | null
  published_at: string | null
  gov_url: string | null
  body: string | null
  removed_upstream: boolean | null
}

async function getPressRelease(slug: string): Promise<PressRelease | null> {
  // The press_releases table doesn't have a slug column. Match against the
  // last path segment of gov_url, which is the GOV.UK-canonical news slug.
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '')
  if (!safeSlug) return null
  const { data } = await supabase
    .from('press_releases')
    .select('id, title, description, organisation, published_at, gov_url, body, removed_upstream')
    .ilike('gov_url', `%/${safeSlug}`)
    .limit(1)
    .maybeSingle()
  return data
}

// Prerender a small set of article pages at build time. The list does NOT
// need to be complete — its presence is what enables ISR caching for the
// whole route. Pages not listed here render on first request and are cached
// from then on (see revalidate above, 1h). press_releases has no slug column,
// so slugs are derived from the last path segment of gov_url, matching the
// lookup in getPressRelease.
export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('press_releases')
    .select('gov_url')
    .not('gov_url', 'is', null)
    .not('body', 'is', null)
    .ilike('gov_url', '%gov.uk%')
    .limit(100)
  if (error) {
    throw new Error(
      `generateStaticParams(/news/[slug]) query failed: ${error.message}`
    )
  }
  if (!data || data.length === 0) {
    throw new Error(
      'generateStaticParams(/news/[slug]): press_releases returned no rows'
    )
  }
  const seen = new Set<string>()
  for (const row of data) {
    if (!row.gov_url) continue
    const slug = govUrlToSlug(row.gov_url)
    if (slug) seen.add(slug)
    if (seen.size >= 20) break
  }
  if (seen.size === 0) {
    throw new Error(
      'generateStaticParams(/news/[slug]): no usable slugs derived from gov_url'
    )
  }
  return Array.from(seen).map((slug) => ({ slug }))
}

// Fallback for rows that pre-date the body-column rollout. Once the backfill
// has run and the next sync cycle has populated `body` for every retained
// row, this path stops firing in practice — but we keep it as a safety net
// against future schema or sync drift. Removed from the hot path in the
// happy case where `release.body` is non-null. 2026-06-04.
async function getBodyHtmlLive(govUrl: string): Promise<string | null> {
  if (!govUrl) return null
  const path = govUrl.replace(/^https?:\/\/[^/]+/, '')
  if (!path) return null
  try {
    const res = await fetch(`https://www.gov.uk/api/content${path}`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'PeoplesChamber/1.0', Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data: { details?: { body?: string } } = await res.json()
    return data.details?.body || null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const release = await getPressRelease(slug)
  if (!release) return { title: 'Press release' }
  return {
    title: release.title,
    description: release.description || `${release.organisation || 'UK Government'} press release.`,
    alternates: { canonical: `/news/${slug}` },
  }
}

// B1 — department context block.
// Resolves the issuing organisation to a dept slug, fetches the first paragraph
// of street_context, and renders a compact "About this department" aside.
//
// KNOWN GAPS — resolveOrgToDeptSlug returns null for:
//   • HM Revenue & Customs (no department_context row)
//   • Department for Science, Innovation & Technology (science-tech slug 404s)
//   • Any org not in DEPT_ORG_TO_SLUG (agencies, arm's-length bodies, etc.)
// In all these cases the component returns null — no error, no empty box.
async function DeptContextBlock({ organisation }: { organisation: string | null }) {
  if (!organisation) return null;
  const deptSlug = resolveOrgToDeptSlug(organisation);
  if (!deptSlug) return null;

  const { street_context } = await getDeptContext(deptSlug);
  if (!street_context) return null;

  const firstPara = street_context.split(/\n\n+/)[0]?.trim() ?? '';
  if (!firstPara) return null;

  return (
    <aside
      aria-label={`About ${organisation}`}
      style={{ marginTop: '36px', paddingTop: '18px', borderTop: '2px solid rgba(20,16,13,0.18)', maxWidth: '680px' }}
    >
      <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 10px' }}>
        About this department
      </p>
      <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '15px', lineHeight: 1.7, color: '#14100d', margin: '0 0 12px' }}>
        {firstPara}
      </p>
      <Link
        href={`/departments/${deptSlug}`}
        style={{ fontFamily: "'Special Elite', monospace", fontSize: '13px', color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px', letterSpacing: '0.04em' }}
      >
        Full department profile →
      </Link>
    </aside>
  );
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const release = await getPressRelease(slug)
  if (!release) notFound()

  // DB-first (Option C): serve our archived body. Once the body backfill is
  // complete every row has one, so GOV.UK is never called on a page view.
  // Only fall back to a live fetch for rows not yet backfilled — and never for
  // releases GOV.UK has removed (that fetch would just 404).
  const bodyHtml = release.body || (release.removed_upstream ? null : await getBodyHtmlLive(release.gov_url || ''))

  const dateLabel = release.published_at
    ? new Date(release.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <OpenGovShell pageStamp="News">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <article>
        <header style={{ marginBottom: '5%', paddingBottom: '24px', borderBottom: `1px solid rgba(20,16,13,0.2)` }}>
          {/* A2 — SOURCE badge: visually separates government content from opengovt reporting */}
          <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 10px', display: 'inline-block', border: '1px solid #7a1612', padding: '2px 7px 1px' }}>
            Source: GOV.UK
          </p>
          <p className="text-[15px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>
            {release.organisation || 'UK Government'}{dateLabel ? ` · ${dateLabel}` : ''}
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.1, color: INK, transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
            {release.title}
          </h1>
          {/* A1 — original source attribution; plain text per no-offsite-links rule */}
          {release.gov_url && !release.removed_upstream && (
            <p style={{ marginTop: '14px', fontFamily: "'Special Elite', monospace", fontSize: '13px', color: ACCENT, letterSpacing: '0.04em', wordBreak: 'break-all' }}>
              Original: {release.gov_url}
            </p>
          )}
        </header>

        {release.removed_upstream && (
          <div
            className="text-[15px] leading-[1.6] mb-6"
            style={{ padding: '12px 16px', border: `1px solid rgba(20,16,13,0.25)`, borderLeft: `3px solid ${ACCENT}`, background: 'rgba(107,36,23,0.04)', color: INK }}
          >
            {bodyHtml
              ? "This release has been removed from GOV.UK. Shown from opengovt's archived copy."
              : "This release has been removed from GOV.UK and is no longer available."}
          </div>
        )}

        {release.description && (
          <p
            className="text-[17px] sm:text-[19px] leading-[1.55] text-[#14100d]/95 mb-6"
            style={{ fontFamily: SERIF, fontStyle: 'italic' }}
          >
            {release.description}
          </p>
        )}

        {bodyHtml ? (
          <div
            className="prose max-w-none text-[15px] leading-[1.7] text-[#14100d]"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p className="text-[15px] text-[#14100d]/80 leading-[1.7]">
            Full content for this release isn&apos;t available in our archive yet. The summary above is taken from the original announcement.
          </p>
        )}

      </article>

      {/* B1 — department context: first paragraph of street_context for the issuing dept */}
      <DeptContextBlock organisation={release.organisation} />

      {/* A6 — department / SoS / more-from-org related links */}
      <RelatedLinks
        variant="pressRelease"
        organisation={release.organisation}
        currentGovUrl={release.gov_url}
      />
    </OpenGovShell>
  )
}
