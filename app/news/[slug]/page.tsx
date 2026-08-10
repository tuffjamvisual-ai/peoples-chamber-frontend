import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink';

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
          <p className="text-[15px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>
            {release.organisation || 'UK Government'}{dateLabel ? ` · ${dateLabel}` : ''}
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.1, color: INK, transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
            {release.title}
          </h1>
        </header>

        {release.removed_upstream && (
          <div
            className="text-[15px] leading-[1.6] mb-6"
            style={{ padding: '12px 16px', border: `1px solid rgba(20,16,13,0.25)`, borderLeft: `3px solid ${ACCENT}`, background: 'rgba(107,36,23,0.04)', color: INK }}
          >
            {bodyHtml
              ? 'This release has been removed from GOV.UK. Shown from opengovt’s archived copy.'
              : 'This release has been removed from GOV.UK and is no longer available.'}
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
    </OpenGovShell>
  )
}
