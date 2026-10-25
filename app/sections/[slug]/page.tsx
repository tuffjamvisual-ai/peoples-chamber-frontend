import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { SECTION_PAGES, type NavLink } from '@/lib/site-nav';
import { TWO_COLUMN_GRID_CSS } from '@/lib/balance-columns';

// Section pages (owner's design, 25 Oct 2026, report 60): a top level menu item opens its own page listing every link in
// that section, instead of a hover dropdown. Built from lib/site-nav.ts, the same list as the header, the phone panel and
// the "In this section" rows, so they cannot drift. Each link's line comes from its destination's meta description.
// Static: every section is rendered at build time and the page has no client code of its own.

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTION_PAGES.map((s) => ({ slug: s.slug }));
}

function find(slug: string) {
  return SECTION_PAGES.find((s) => s.slug === slug);
}

function intro(label: string) {
  return `Every page in the ${label} section of Open Govt.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = find(slug);
  if (!s) return {};
  return {
    title: s.item.label,
    description: `${intro(s.item.label)} ${s.item.children!.map((c) => c.label).join(', ')}.`,
    alternates: { canonical: `/sections/${slug}` },
  };
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

// The links in their order, split into their subheadings (only Accountability has any).
function groups(links: NavLink[]): { title: string | null; links: NavLink[] }[] {
  const out: { title: string | null; links: NavLink[] }[] = [];
  for (const l of links) {
    const title = l.group ?? null;
    if (!out.length || out[out.length - 1].title !== title) out.push({ title, links: [] });
    out[out.length - 1].links.push(l);
  }
  return out;
}

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = find(slug);
  if (!s) notFound();
  const { item } = s;
  return (
    <OpenGovShell pageStamp={item.label}>
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: item.label, path: `/sections/${slug}` }])} />
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          {item.label}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK, margin: 0 }}>{intro(item.label)}</p>
      </header>

      <style>{TWO_COLUMN_GRID_CSS}</style>
      {groups(item.children!).map((g) => (
        <section key={g.title ?? 'all'} aria-label={g.title ?? undefined} style={{ marginBottom: '28px' }}>
          {g.title && (
            <h2 style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.12em', color: INK, margin: '0 0 6px' }}>{g.title}</h2>
          )}
          <div className="og-grid2">
            {g.links.map((l) => (
              <Link
                key={`${l.href}-${l.label}`}
                href={l.href}
                className="no-hover-scale"
                style={{ display: 'block', textDecoration: 'none', color: INK, borderTop: `1px solid ${HAIRLINE}`, padding: '14px 0 16px', minHeight: '44px' }}
              >
                <div style={{ fontFamily: MONO, fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 'bold', marginBottom: l.desc ? '6px' : 0 }}>
                  {l.label} <span style={{ color: ACCENT }}>→</span>
                </div>
                {l.desc && <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>{l.desc}</p>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </OpenGovShell>
  );
}
