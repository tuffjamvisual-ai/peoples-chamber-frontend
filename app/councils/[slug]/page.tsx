// /councils/[slug] — Per-council dossier page. Sparse on data for now
// (only the seed columns from the MapIt import); will fill out as
// political control, leadership and finance phases land.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';

export const revalidate = 3600;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const PARCHMENT_CREAM = '#efe6d2';
const ACCENT = '#7a1612';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

type CouncilFull = {
  slug: string;
  name: string;
  short_name: string | null;
  type: string;
  type_label: string;
  country: string;
  region: string | null;
  gss_code: string;
  parent_slug: string | null;
  population: number | null;
  political_control: string | null;
  political_control_status: string | null;
  leader_name: string | null;
  leader_party: string | null;
  chief_exec: string | null;
  council_tax_band_d_pounds: number | null;
  revenue_budget_mn: number | null;
  section_114_year: number | null;
  last_election_year: number | null;
  founded_year: number | null;
  website_url: string | null;
  wikipedia_url: string | null;
  description: string | null;
};

type RelatedCouncil = { slug: string; name: string; short_name: string | null; political_control: string | null };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.from('councils').select('name, type_label, country').eq('slug', slug).single();
  if (!data) return { title: 'Council not found' };
  return {
    title: `${data.name} | The People’s Chamber`,
    description: `${data.name} — ${data.type_label}, ${data.country}.`,
    alternates: { canonical: `/councils/${slug}` },
  };
}

export default async function CouncilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: council } = await supabase
    .from('councils')
    .select('*')
    .eq('slug', slug)
    .single();
  if (!council) notFound();
  const c = council as CouncilFull;

  // Pull parent council (for districts) and child districts (for
  // counties) in a single round-trip — the parent_slug column makes
  // the relationship explicit. Counties have null parent_slug; child
  // districts are read by querying parent_slug = this slug.
  const [{ data: parentRow }, { data: childRows }] = await Promise.all([
    c.parent_slug
      ? supabase.from('councils').select('slug, name, short_name, political_control').eq('slug', c.parent_slug).single()
      : Promise.resolve({ data: null }),
    c.type === 'county'
      ? supabase.from('councils').select('slug, name, short_name, political_control').eq('parent_slug', c.slug).order('name')
      : Promise.resolve({ data: [] }),
  ]);
  const parent: RelatedCouncil | null = (parentRow as RelatedCouncil | null) || null;
  const children: RelatedCouncil[] = (childRows || []) as RelatedCouncil[];

  const hasFinance = c.council_tax_band_d_pounds != null || c.revenue_budget_mn != null;
  const hasLeadership = c.political_control != null || c.leader_name != null || c.chief_exec != null;
  const hasOverview = c.population != null || c.founded_year != null || c.website_url != null;

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/councils"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />

      <article
        style={{
          background: `${PARCHMENT_CREAM} url('/bill-parchment.webp') center top / 100% auto repeat-y`,
          border: '1px solid rgba(26,20,14,0.3)',
          boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 22px 44px -22px rgba(26,20,14,0.35)',
          padding: 'clamp(28px, 4vw, 56px) clamp(24px, 4vw, 60px)',
          margin: '0 -7%',
          color: '#1a140e',
          fontFamily: SERIF,
        }}
      >
        <header
          style={{
            borderTop: `1.5px solid ${INK}`,
            borderBottom: `1.5px solid ${INK}`,
            padding: '14px 12px',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: '12px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            {c.type_label} · {c.country}
            {parent && (
              <>
                {' · '}
                <a href={`/councils/${parent.slug}`} style={{ color: INK_SOFT, textDecoration: 'underline' }}>
                  Part of {parent.short_name || parent.name}
                </a>
              </>
            )}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {c.name}
          </h1>
          <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginTop: '8px' }}>
            ONS code {c.gss_code}
          </div>
        </header>

        {c.description && (
          <p style={{ fontFamily: MONO, fontSize: 'clamp(13px, 1.15vw, 14px)', lineHeight: 1.75, textAlign: 'justify', margin: '0 auto 28px', maxWidth: '46em', color: INK }}>
            {c.description}
          </p>
        )}

        {hasLeadership && (
          <Section title="Political Control & Leadership">
            <DataRow label="Political control" value={c.political_control} sub={c.political_control_status} />
            <DataRow label="Leader" value={c.leader_name} sub={c.leader_party} />
            <DataRow label="Chief executive" value={c.chief_exec} />
            <DataRow label="Last election" value={c.last_election_year?.toString() ?? null} />
          </Section>
        )}

        {hasFinance && (
          <Section title="Finance">
            <DataRow label="Annual revenue budget" value={c.revenue_budget_mn != null ? `£${c.revenue_budget_mn.toLocaleString()}m` : null} />
            <DataRow label="Council tax (Band D)" value={c.council_tax_band_d_pounds != null ? `£${c.council_tax_band_d_pounds.toLocaleString()}` : null} />
            {c.section_114_year && (
              <DataRow label="Section 114 notice" value={`Issued ${c.section_114_year}`} valueColour={ACCENT} />
            )}
          </Section>
        )}

        {hasOverview && (
          <Section title="Overview">
            <DataRow label="Population" value={c.population?.toLocaleString() ?? null} />
            <DataRow label="Founded" value={c.founded_year?.toString() ?? null} />
            {c.website_url && (
              <DataRow label="Website" value={
                <a href={c.website_url} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>
                  {c.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              } />
            )}
          </Section>
        )}

        {!hasLeadership && !hasFinance && !hasOverview && (
          <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
            <p style={{ fontFamily: MONO, fontSize: '14px', fontStyle: 'italic', color: INK_SOFT, margin: 0, lineHeight: 1.7 }}>
              Research pending. Political control, leadership, budget and council tax for {c.name} are
              being added in stages alongside the other 381 principal authorities. The {c.type_label}{' '}
              listing is the foundation; live data lands phase by phase.
            </p>
          </section>
        )}

        {children.length > 0 && (
          <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
              Districts under {c.short_name || c.name} · {children.length}
            </h2>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '4px 16px',
              }}
            >
              {children.map((d) => (
                <li key={d.slug}>
                  <a
                    href={`/councils/${d.slug}`}
                    style={{
                      display: 'block',
                      padding: '6px 0',
                      color: INK,
                      textDecoration: 'none',
                      fontFamily: MONO,
                      fontSize: '13px',
                      lineHeight: 1.55,
                    }}
                  >
                    {d.short_name || d.name}
                    {d.political_control && (
                      <span style={{ display: 'block', fontSize: '11px', color: INK_SOFT, marginTop: '1px' }}>
                        {d.political_control}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ScrollToTopButton />
      </article>
    </DossierShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        {title}
      </h2>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: '0', borderTop: `1px solid ${INK_HAIRLINE}` }}>
        {children}
      </dl>
    </section>
  );
}

function DataRow({ label, value, sub, valueColour }: { label: string; value: React.ReactNode | null; sub?: string | null; valueColour?: string }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'contents' }}>
      <dt style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.04em', padding: '12px 16px 12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, color: INK_SOFT }}>
        {label}
      </dt>
      <dd style={{ padding: '12px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, margin: 0, fontFamily: MONO, fontSize: '14px', lineHeight: 1.55, color: valueColour || INK }}>
        {value}
        {sub && <span style={{ display: 'block', fontSize: '12px', color: INK_SOFT, marginTop: '2px' }}>{sub}</span>}
      </dd>
    </div>
  );
}
