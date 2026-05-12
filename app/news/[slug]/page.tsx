import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Navigation from '../../components/Navigation'
import Link from 'next/link'

export const revalidate = 3600

const SERIF = '"Georgia", "Charter", "Times New Roman", serif'
const ACCENT = '#ffffff'
const BORDER = '#5a5a5a'
const MUTED = '#9a9a9a'

type PressRelease = {
  id: number
  title: string
  description: string | null
  organisation: string | null
  published_at: string | null
  gov_url: string | null
}

async function getPressRelease(slug: string): Promise<PressRelease | null> {
  // The press_releases table doesn't have a slug column. Match against the
  // last path segment of gov_url, which is the GOV.UK-canonical news slug.
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '')
  if (!safeSlug) return null
  const { data } = await supabase
    .from('press_releases')
    .select('id, title, description, organisation, published_at, gov_url')
    .ilike('gov_url', `%/${safeSlug}`)
    .limit(1)
    .maybeSingle()
  return data
}

async function getBodyHtml(govUrl: string): Promise<string | null> {
  if (!govUrl) return null
  // gov.uk content API mirrors the page path under /api/content
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

  const bodyHtml = await getBodyHtml(release.gov_url || '')

  const dateLabel = release.published_at
    ? new Date(release.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div style={{ minHeight: '100vh', background: '#505050', color: '#fff' }}>
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-white opacity-80 hover:opacity-100 mb-8"
        >
          ← Back to home
        </Link>

        <article>
          <header className="mb-6 pb-6 border-b border-[#5a5a5a]">
            <p className="text-[11px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>
              {release.organisation || 'UK Government'}{dateLabel ? ` · ${dateLabel}` : ''}
            </p>
            <h1
              className="text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight text-white"
              style={{ fontFamily: SERIF }}
            >
              {release.title}
            </h1>
          </header>

          {release.description && (
            <p
              className="text-[17px] sm:text-[19px] leading-[1.55] text-white opacity-95 mb-6"
              style={{ fontFamily: SERIF, fontStyle: 'italic' }}
            >
              {release.description}
            </p>
          )}

          {bodyHtml ? (
            <div
              className="prose prose-invert max-w-none text-[15px] leading-[1.7]"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <p className="text-[14px] text-white opacity-80 leading-[1.7]">
              Full content for this release isn&apos;t available in our archive yet. The summary above is taken from the original announcement.
            </p>
          )}

          <footer
            className="mt-10 pt-5 text-[11px] uppercase tracking-[0.2em]"
            style={{ borderTop: `1px solid ${BORDER}`, color: MUTED }}
          >
            Source: GOV.UK · {release.organisation || 'UK Government'}
          </footer>
        </article>
      </main>
    </div>
  )
}
