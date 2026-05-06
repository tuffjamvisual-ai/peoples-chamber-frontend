import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navigation from '../../components/Navigation'

export const revalidate = 60

const SERIF = '"Georgia", "Charter", "Times New Roman", serif'
const BORDER = '#333333'
const MUTED = '#9a9a9a'

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
    title: `${row.source_title} — via ${row.source_outlet}`,
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
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff' }}>
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-white opacity-80 hover:opacity-100 mb-8"
        >
          ← Back to home
        </Link>

        <article>
          <header className="mb-6 pb-6 border-b border-[#333333]">
            <p className="text-[11px] uppercase tracking-[0.25em] mb-3 font-semibold text-white">
              {row.source_outlet}{dateLabel ? ` · ${dateLabel}` : ''}
            </p>
            <h1
              className="text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight text-white"
              style={{ fontFamily: SERIF }}
            >
              {row.source_title}
            </h1>
          </header>

          {/* Source standfirst — short fair-dealing excerpt */}
          {row.source_excerpt && (
            <p className="text-[16px] sm:text-[18px] leading-[1.55] text-white opacity-90 mb-8" style={{ fontFamily: SERIF, fontStyle: 'italic' }}>
              {row.source_excerpt}
            </p>
          )}

          {/* People's Chamber commentary — our editorial */}
          {row.commentary && (
            <section
              className="my-8 p-6 border-l-4 bg-[#111111]"
              style={{ borderLeftColor: '#fff' }}
              aria-label="People's Chamber commentary"
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-white opacity-70 mb-3 font-semibold">
                The People&apos;s Chamber · Commentary
              </p>
              <p className="text-[16px] sm:text-[17px] leading-[1.6] text-white" style={{ fontFamily: SERIF }}>
                {row.commentary}
              </p>
              {row.related_link_href && row.related_link_label && (
                <Link
                  href={row.related_link_href}
                  className="inline-block mt-4 text-[11px] uppercase tracking-[0.2em] text-white hover:underline font-semibold"
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
            className="inline-block mt-4 px-6 py-3 bg-white text-black text-[12px] font-bold uppercase tracking-[0.15em] hover:opacity-90 transition-opacity"
          >
            Read full story at {new URL(row.source_url).hostname.replace(/^www\./, '')} →
          </a>

          <footer
            className="mt-10 pt-5 text-[11px] uppercase tracking-[0.2em]"
            style={{ borderTop: `1px solid ${BORDER}`, color: MUTED }}
          >
            Headline and standfirst quoted under fair dealing for news reporting (CDPA s.30(2)). The full
            story remains the property of {row.source_outlet}; click through to read it.
          </footer>
        </article>
      </main>
    </div>
  )
}
