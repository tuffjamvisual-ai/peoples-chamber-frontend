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
    // With more than two groups (Parliament) the groups are named; otherwise every link.
    description: `${intro(s.item.label)} ${(groups(s.item.children!).length > 2 ? groups(s.item.children!).map((g) => g.title) : s.item.children!.map((c) => c.label)).join(', ')}.`,
    alternates: { canonical: `/sections/${slug}` },
  };
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

// A subheading's anchor: "MPs" is #mps, "Money & Power" is #money-power.
function anchor(title: string) {
  return title.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// The 15 party cards (report 62): a compact grid, so the Parliament page stays scannable.
const COMPACT_CSS = '.og-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 14px;margin-top:6px}@media (max-width:900px){.og-cards{grid-template-columns:repeat(2,1fr)}}@media (max-width:520px){.og-cards{grid-template-columns:1fr}}';

// The links in their order, split into their subheadings (Accountability has two, Parliament four).
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
  const grouped = groups(item.children!);
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

      <style>{TWO_COLUMN_GRID_CSS + COMPACT_CSS}</style>
      {/* With more than two groups (Parliament), a row of links to each group first. */}
      {grouped.length > 2 && (
        <nav aria-label="On this page" style={{ margin: '0 0 22px', fontFamily: MONO, fontSize: '15px', lineHeight: 1.5 }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '14px', marginRight: '8px' }}>On this page</span>
          {grouped.map((g, i) => (
            <span key={g.title} style={{ whiteSpace: 'nowrap' }}>
              {i > 0 && <span aria-hidden style={{ margin: '0 6px' }}>·</span>}
              <a href={`#${anchor(g.title!)}`} className="no-hover-scale" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px', display: 'inline-block', padding: '4px 0' }}>{g.title}</a>
            </span>
          ))}
        </nav>
      )}
      {grouped.map((g) => (
        <section key={g.title ?? 'all'} id={g.title ? anchor(g.title) : undefined} aria-label={g.title ?? undefined} style={{ marginBottom: '28px', scrollMarginTop: '16px' }}>
          {g.title && (
            <h2 style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.12em', color: INK, margin: '0 0 6px' }}>{g.title}</h2>
          )}
          <div className="og-grid2">
            {g.links.filter((l) => !l.compact).map((l) => (
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
          {g.links.some((l) => l.compact) && (
            <div className="og-cards">
              {g.links.filter((l) => l.compact).map((l) => (
                <Link
                  key={`${l.href}-${l.label}`}
                  href={l.href}
                  className="no-hover-scale"
                  style={{ display: 'block', textDecoration: 'none', color: INK, border: `1px solid ${HAIRLINE}`, padding: '10px 12px 12px', minHeight: '44px' }}
                >
                  <div style={{ fontFamily: MONO, fontSize: '17px', fontWeight: 'bold', marginBottom: l.desc ? '4px' : 0 }}>
                    {l.label} <span style={{ color: ACCENT }}>→</span>
                  </div>
                  {l.desc && <p style={{ fontSize: '14px', lineHeight: 1.5, color: INK, margin: 0 }}>{l.desc}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </OpenGovShell>
  );
}
