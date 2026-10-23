import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink';
import RelatedLinks from '../../components/RelatedLinks'
import { metaDescription } from '@/lib/meta-description'
import ReadNext, { splitAfterParagraph } from '../../components/ReadNext'
import { newsReadNext } from '@/lib/read-next';
import { resolveOrgToDeptSlug } from '@/lib/govOrgSlug'
import { getDeptContext } from '../../api/department-context/route'
import { piecesExaminingRelease } from '@/lib/editorials/release-links'
import { withoutEmDashes } from '@/lib/no-em-dash'
import type { EditorialEntry } from '@/lib/editorials/types'

// Plain text of an HTML fragment, for comparing the summary with the body's opening.
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

export const revalidate = 3600

const SERIF = 'Special Elite, monospace'
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
  // Indexed slug column (migration 2026-10-16k). A database error throws rather than
  // returning null, so a slow moment can never be served, and cached, as a 404.
  const { data, error } = await supabase
    .from('press_releases')
    .select('id, title, description, organisation, published_at, gov_url, body, removed_upstream')
    .eq('news_slug', safeSlug.toLowerCase())
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`press_releases lookup failed: ${error.message}`)
  return data
}

// No article pages are built ahead (owner's approval, 21 Oct 2026: build reliability; the build prerendered 100,
// each making several reads at once against the database). generateStaticParams returning [] keeps the route
// cached: each page renders on its first visit and is kept for an hour (revalidate above).
export function generateStaticParams() { return [] }

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
    return data.details?.body ? withoutEmDashes(data.details.body) : null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const release = await getPressRelease(slug)
  if (!release) return { title: 'Press release' }
  // Search title and description (owner's approval, 23 Oct 2026). The GOV.UK headline is kept as written, with
  // doubled and trailing spaces removed. The description says only what this page shows: the issuing department
  // and date, then the minister (the Secretary of State in Related) and Open Govt's reports when it shows them.
  const org = release.organisation?.replace(/\s+/g, ' ').trim() || null
  const deptSlug = org ? resolveOrgToDeptSlug(org) : null
  // The Related box shows today's Secretary of State. The line says "with the minister responsible" only when the
  // release is dated on or after the day they took that post, from their GOV.UK record (person_cache, the same
  // person the Related box shows); otherwise, or with no start date, it is left out (owner's approval, 23 Oct 2026).
  let hasMinister = false
  if (deptSlug && release.published_at) {
    const { data: sos, error: sosErr } = await supabase.from('dept_ministers').select('slug, role')
      .eq('dept_slug', deptSlug).eq('is_secretary_of_state', true).neq('resigned', true).maybeSingle()
    if (sosErr && sosErr.code !== 'PGRST116') throw new Error(`/news/[slug] metadata minister: ${sosErr.message}`)
    if (sos?.slug) {
      const { data: person, error: personErr } = await supabase.from('person_cache').select('current_roles').eq('slug', sos.slug).maybeSingle()
      if (personErr && personErr.code !== 'PGRST116') throw new Error(`/news/[slug] metadata minister start: ${personErr.message}`)
      const post = ((person?.current_roles as { title?: string; startDate?: string }[] | null) || [])
        .find((r) => (r.title || '').trim().toLowerCase() === String(sos.role || '').trim().toLowerCase())
      const started = post?.startDate ? new Date(post.startDate) : null
      hasMinister = !!started && !Number.isNaN(started.getTime()) && new Date(release.published_at) >= started
    }
  }
  const hasReports = piecesExaminingRelease(release.title, release.gov_url).length > 0
  const date = release.published_at
    ? new Date(release.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
    : null
  let description = [org ? `${org} announcement` : 'Announcement', date].filter(Boolean).join(', ')
  if (hasMinister && hasReports) description += ', with the minister responsible and Open Govt’s related reports.'
  else if (hasMinister) description += ', with the minister responsible.'
  else if (hasReports) description += ', with Open Govt’s related reports.'
  else description += deptSlug ? '. Linked to the department’s record on Open Govt.' : '.'
  return {
    title: release.title.replace(/\s+/g, ' ').trim(),
    description: metaDescription(description),
    alternates: { canonical: `/news/${slug}` },
    // A word-for-word copy of a GOV.UK release: kept for readers, never indexed, so the
    // GOV.UK original is the one search engines show (Search Console review, 16 Oct 2026).
    robots: { index: false, follow: true },
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
  // Hidden with the department About tab (owner's instruction, 18 Oct 2026); the
  // department pages' SHOW_DEPARTMENT_ABOUT flag brings both back.
  const SHOW_DEPARTMENT_ABOUT = false;
  if (!SHOW_DEPARTMENT_ABOUT || !organisation) return null;
  const deptSlug = resolveOrgToDeptSlug(organisation);
  if (!deptSlug) return null;

  const { street_context } = await getDeptContext(deptSlug);
  if (!street_context) return null;

  // First two sentences only (audit reassessment: the full paragraph pushed the release down).
  const firstPara = (street_context.split(/\n\n+/)[0]?.trim() ?? '')
    .split(/(?<=[.!?])\s+(?=[A-Z])/).slice(0, 2).join(' ');
  if (!firstPara) return null;

  return (
    <aside
      aria-label={`About ${organisation}`}
      style={{ marginTop: '36px', paddingTop: '18px', borderTop: '2px solid rgba(20,16,13,0.18)', maxWidth: '680px' }}
    >
      <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 10px' }}>
        About this department
      </p>
      <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '15px', lineHeight: 1.7, color: '#14100d', margin: '0 0 12px' }}>
        {firstPara}
      </p>
      <Link
        href={`/departments/${deptSlug}`}
        style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px', letterSpacing: '0.04em' }}
      >
        Full department profile →
      </Link>
    </aside>
  );
}

// "Read our investigation" box (audit reassessment, 16 Oct 2026): shown under the headline,
// and again after the release, when an Open Govt piece cites this exact release in its
// "How this piece was checked" list.
function InvestigationBox({ pieces, placement }: { pieces: EditorialEntry[]; placement: 'top' | 'end' }) {
  if (!pieces.length) return null
  const one = pieces.length === 1
  return (
    <aside
      aria-label="Open Govt investigation of this announcement"
      style={{ margin: placement === 'top' ? '0 0 28px' : '36px 0 0', padding: '14px 16px', border: `1.5px solid ${ACCENT}`, borderLeft: `5px solid ${ACCENT}`, background: 'rgba(107,36,23,0.05)', maxWidth: '680px' }}
    >
      <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7a1612', margin: '0 0 8px' }}>
        {one ? 'Read our report on this announcement' : 'Read our reports on this announcement'}
      </p>
      {pieces.map((e) => (
        <p key={e.slug} style={{ fontFamily: "'Special Elite', monospace", fontSize: '16px', lineHeight: 1.5, margin: '0 0 6px' }}>
          <Link href={`/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`} style={{ color: INK, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{e.headline} →</Link>
        </p>
      ))}
    </aside>
  )
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

  const examined = piecesExaminingRelease(release.title, release.gov_url)
  // Read next after the third paragraph (or after the body when it has fewer than five), lib/read-next.ts.
  const readNext = await newsReadNext({ id: release.id, title: release.title, organisation: release.organisation, body: release.body, description: release.description })
  const bodyParts = bodyHtml ? splitAfterParagraph(bodyHtml, 3, 5) : null

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
          <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7a1612', margin: '0 0 10px', display: 'inline-block', border: '1px solid #7a1612', padding: '2px 7px 1px' }}>
            Source: GOV.UK
          </p>
          <p className="text-[15px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>
            {release.organisation || 'UK Government'}{dateLabel ? ` · ${dateLabel}` : ''}
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.1, color: INK, transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
            {release.title}
          </h1>
          {/* A1 — original source, linked (owner's decision, 16 Oct 2026; previously plain text). */}
          {release.gov_url && !release.removed_upstream && (
            <p style={{ marginTop: '14px', fontFamily: "'Special Elite', monospace", fontSize: '14px', color: ACCENT, letterSpacing: '0.04em', wordBreak: 'break-all' }}>
              Original: <a href={release.gov_url} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{release.gov_url.replace(/^https?:\/\//, '')}</a>
            </p>
          )}
        </header>

        <InvestigationBox pieces={examined} placement="top" />

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

        {/* The summary is left out when the body's opening repeats it (audit E4: the opening
            paragraph used to appear twice). The first 1,500 characters are checked because
            many releases open with a bullet list before the first paragraph. */}
        {release.description && !(bodyHtml && plain(bodyHtml).slice(0, 1500).includes(plain(release.description).slice(0, 80))) && (
          <p
            className="text-[17px] sm:text-[19px] leading-[1.55] text-[#14100d]/95 mb-6"
            style={{ fontFamily: SERIF, fontStyle: 'italic' }}
          >
            {release.description}
          </p>
        )}

        {bodyHtml && bodyParts ? (
          <>
            <div className="prose max-w-none text-[15px] leading-[1.7] text-[#14100d]" dangerouslySetInnerHTML={{ __html: bodyParts[0] }} />
            <ReadNext links={readNext} />
            <div className="prose max-w-none text-[15px] leading-[1.7] text-[#14100d]" dangerouslySetInnerHTML={{ __html: bodyParts[1] }} />
          </>
        ) : bodyHtml ? (
          <>
            <div
              className="prose max-w-none text-[15px] leading-[1.7] text-[#14100d]"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
            <ReadNext links={readNext} />
          </>
        ) : (
          <p className="text-[15px] text-[#14100d]/80 leading-[1.7]">
            Full content for this release isn&apos;t available in our archive yet. The summary above is taken from the original announcement.
          </p>
        )}

      </article>

      <InvestigationBox pieces={examined} placement="end" />

      {/* B1 — department context, after the release so the release itself comes first. */}
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
