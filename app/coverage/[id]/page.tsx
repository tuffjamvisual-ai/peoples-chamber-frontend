import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink';

export const revalidate = 60

const INK = '#14100d'
const ACCENT = '#6b2417'
const SERIF = '"Georgia", "Charter", "Times New Roman", serif'

type CoverageRow = {
  id: number
  source_url: string
  source_outlet: string
  source_title: string
  source_excerpt: string | null
  published_at: string | null
  commentary: string | null
  related_link_href: string | null
  related_link_label: string | null
}

async function getRow(id: number): Promise<CoverageRow | null> {
  const { data } = await supabase
    .from('uk_political_news')
    .select('id, source_url, source_outlet, source_title, source_excerpt, published_at, commentary, related_link_href, related_link_label')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const n = parseInt(id, 10)
  if (!Number.isFinite(n)) return { title: 'Coverage' }
  const row = await getRow(n)
  if (!row) return { title: 'Coverage' }
  return {
    title: `${row.source_title}, via ${row.source_outlet}`,
    description: row.commentary || row.source_excerpt || `${row.source_outlet} coverage with People's Chamber commentary.`,
    alternates: { canonical: `/coverage/${row.id}` },
  }
}

export default async function CoveragePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const n = parseInt(id, 10)
  if (!Number.isFinite(n)) notFound()
  const row = await getRow(n)
  if (!row) notFound()

  const dateLabel = row.published_at
    ? new Date(row.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <OpenGovShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <article>
        <header className="mb-6 pb-6 border-b border-[#14100d]/20">
          <p className="text-[13px] uppercase tracking-[0.25em] mb-3 font-semibold text-[#14100d]">
            {row.source_outlet}{dateLabel ? ` · ${dateLabel}` : ''}
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight text-[#14100d]"
            style={{ fontFamily: SERIF }}
          >
            {row.source_title}
          </h1>
        </header>

        {/* Source standfirst — short fair-dealing excerpt */}
        {row.source_excerpt && (
          <p className="text-[16px] sm:text-[18px] leading-[1.55] text-[#14100d]/90 mb-8" style={{ fontFamily: SERIF, fontStyle: 'italic' }}>
            {row.source_excerpt}
          </p>
        )}

        {/* People's Chamber commentary — our editorial */}
        {row.commentary && (
          <section
            className="my-8 p-6 border-l-4"
            style={{ borderLeftColor: ACCENT }}
            aria-label="People's Chamber commentary"
          >
            <p className="text-[12px] uppercase tracking-[0.25em] text-[#14100d]/70 mb-3 font-semibold">
              The People&apos;s Chamber · Commentary
            </p>
            <p className="text-[16px] sm:text-[17px] leading-[1.6] text-[#14100d]" style={{ fontFamily: SERIF }}>
              {row.commentary}
            </p>
            {row.related_link_href && row.related_link_label && (
              <Link
                href={row.related_link_href}
                className="inline-block mt-4 text-[13px] uppercase tracking-[0.2em] text-[#14100d] hover:underline font-semibold"
              >
                {row.related_link_label} →
              </Link>
            )}
          </section>
        )}

        {/* Outbound link to source — large, unmissable */}
        <a
          href={row.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-6 py-3 text-[12px] font-bold uppercase tracking-[0.15em] hover:opacity-90 transition-opacity"
          style={{ background: ACCENT, color: '#f4ecd8' }}
        >
          Read full story at {new URL(row.source_url).hostname.replace(/^www\./, '')} →
        </a>

        <footer
          className="mt-10 pt-5 text-[13px] uppercase tracking-[0.2em] text-[#14100d]/60"
          style={{ borderTop: `1px solid ${INK}33` }}
        >
          Headline and standfirst quoted under fair dealing for news reporting (CDPA s.30(2)). The full
          story remains the property of {row.source_outlet}; click through to read it.
        </footer>
      </article>
    </OpenGovShell>
  )
}
