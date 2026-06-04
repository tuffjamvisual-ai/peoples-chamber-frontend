import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';

// Static /transparency/press-releases route. Lives outside the dynamic
// [section] route because press releases aren't a tabular dataset — each
// one is an individual document with its own /news/[slug] detail page.
// Static wins over dynamic in Next routing, so this file takes precedence
// over [section]/page.tsx for the press-releases slug. The transparency
// hub at /transparency carries the 7th card pointing here. Sitemap has
// the index URL + every /news/[slug] URL it lists, so Google can crawl
// the release pages from the transparency surface. Added 2026-06-04.

export const revalidate = 3600;

const INK = '#14100d';
const ACCENT = '#6b2417';

type Release = {
  id: number;
  title: string;
  description: string | null;
  organisation: string | null;
  published_at: string | null;
  gov_url: string | null;
};

function slugFromGovUrl(govUrl: string | null): string | null {
  if (!govUrl) return null;
  const m = govUrl.match(/\/([a-z0-9-]+)\/?$/i);
  return m ? m[1] : null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const metadata: Metadata = {
  title: 'Press Releases',
  description:
    'Most recent UK Government press releases, drawn from the GOV.UK content API. Each release links through to a full-text page.',
  alternates: { canonical: '/transparency/press-releases' },
};

export default async function PressReleasesIndexPage() {
  const { data: rows } = await supabase
    .from('press_releases')
    .select('id, title, description, organisation, published_at, gov_url')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);

  const releases = (rows || []) as Release[];

  // Group by month for a more readable column. Most recent first.
  const grouped = new Map<string, Release[]>();
  for (const r of releases) {
    const monthLabel = r.published_at
      ? new Date(r.published_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : 'Undated';
    if (!grouped.has(monthLabel)) grouped.set(monthLabel, []);
    grouped.get(monthLabel)!.push(r);
  }

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/transparency"
        label="← Transparency Hub"
        className="no-hover-scale"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '-6%',
          marginBottom: '12px',
          color: INK,
          textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />

      <header style={{ marginBottom: '5%' }}>
        <p
          style={{
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 500,
            marginBottom: '12px',
            color: ACCENT,
          }}
        >
          Dataset
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
          }}
        >
          Press Releases
        </h1>
        <p className="text-[#14100d] text-[14px] leading-[1.7] max-w-2xl">
          <span className="font-mono text-[#14100d] text-base font-bold">{releases.length.toLocaleString()}</span>
          {' '}most recent UK Government press releases, drawn from the GOV.UK content API every day. Each entry links to a full-text page with the original announcement.
        </p>
      </header>

      <div>
        {Array.from(grouped.entries()).map(([month, items]) => (
          <section key={month} style={{ marginBottom: '40px' }}>
            <h2
              style={{
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: ACCENT,
                marginBottom: '16px',
                fontWeight: 600,
                borderBottom: '1px solid rgba(20,16,13,0.18)',
                paddingBottom: '6px',
              }}
            >
              {month} · {items.length} {items.length === 1 ? 'release' : 'releases'}
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((r) => {
                const slug = slugFromGovUrl(r.gov_url);
                const href = slug ? `/news/${slug}` : null;
                const inner = (
                  <>
                    <div
                      style={{
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.18em',
                        color: ACCENT,
                        marginBottom: '4px',
                      }}
                    >
                      {r.organisation || 'UK Government'}
                      {r.published_at ? ` · ${fmtDate(r.published_at)}` : ''}
                    </div>
                    <p
                      style={{
                        fontSize: '17px',
                        lineHeight: 1.35,
                        color: INK,
                        fontWeight: 600,
                        marginBottom: r.description ? '6px' : 0,
                      }}
                    >
                      {r.title}
                    </p>
                    {r.description && (
                      <p style={{ fontSize: '14px', lineHeight: 1.6, color: INK, opacity: 0.85, margin: 0 }}>
                        {r.description}
                      </p>
                    )}
                  </>
                );

                return (
                  <li
                    key={r.id}
                    style={{
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(20,16,13,0.12)',
                    }}
                  >
                    {href ? (
                      <Link href={href} style={{ display: 'block', textDecoration: 'none', color: INK }} className="press-card no-hover-scale">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <style>{`
        .press-card { transition: opacity 140ms ease; }
        .press-card:hover { opacity: 0.7; }
      `}</style>
    </DossierShell>
  );
}
