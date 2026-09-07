// Secretariat profile — the lobby firm or charity that operates one
// or more All-Party Parliamentary Groups. Lets a reader see the full
// portfolio of lobby groups a single firm runs, the MPs officering
// those groups, and the funders paying the firm.
//
// Nobody currently surfaces this. The APPG register lists each group
// individually with its secretariat in small print; cross-referencing
// to find that one firm operates 6 different lobby groups requires
// reading 600 separate pages.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';

export const revalidate = 86400;

export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('appgs')
    .select('secretariat')
    .not('secretariat', 'is', null)
    .limit(20);
  if (error || !data?.length) throw new Error(`generateStaticParams appgs: ${error?.message || 'zero rows'}`);
  const slugs = [...new Set(data.map((r) => secretariatNameToSlug(String(r.secretariat))).filter(Boolean))];
  if (!slugs.length) throw new Error('generateStaticParams secretariats: zero usable values');
  return slugs.map((slug) => ({ slug }));
}

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

// Canonical slug rule used across the site.
export function secretariatNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function findCanonicalName(slug: string): Promise<string | null> {
  const tokens = slug.split('-').filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;
  let q = supabase.from('appgs').select('secretariat').not('secretariat', 'is', null).limit(2000);
  const ranked = tokens.slice().sort((a, b) => b.length - a.length).slice(0, 3);
  for (const t of ranked) {
    q = q.ilike('secretariat', `%${t}%`);
  }
  const { data } = await q;
  if (!data) return null;
  const counts = new Map<string, number>();
  for (const r of data as Array<{ secretariat: string | null }>) {
    const name = (r.secretariat || '').trim();
    if (!name) continue;
    if (secretariatNameToSlug(name) === slug) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = await findCanonicalName(slug);
  if (!name) return { title: 'Secretariat' };
  return {
    title: `${name}: every All-Party Parliamentary Group operated by this secretariat`,
    description: `${name} acts as secretariat for one or more APPGs in Westminster. Lists every group operated, the MPs officering them, and the registered funders paying the firm.`,
    alternates: { canonical: `/secretariats/${slug}` },
  };
}

type AppgRow = {
  slug: string;
  title: string;
  category: string | null;
  purpose: string | null;
  secretariat: string | null;
  secretariat_url: string | null;
  registrable_benefits: string | null;
  website_url: string | null;
};
type FunderRow = { appg_slug: string; source: string; value_band: string | null };
type OfficerRow = { appg_slug: string; member_id: number | null; name_at_time: string; party: string | null; role: string | null };

export default async function SecretariatPage({ params }: PageProps) {
  const { slug } = await params;
  const canonicalName = await findCanonicalName(slug);
  if (!canonicalName) notFound();

  const tokens = slug.split('-').filter((t) => t.length >= 2);
  const ranked = tokens.slice().sort((a, b) => b.length - a.length).slice(0, 3);

  // All APPGs run by this secretariat. ILIKE narrows; client-side slug
  // match exactness avoids false positives.
  let q = supabase.from('appgs').select('slug, title, category, purpose, secretariat, secretariat_url, registrable_benefits, website_url').limit(500);
  for (const t of ranked) q = q.ilike('secretariat', `%${t}%`);
  const { data: rawAppgs } = await q;
  const appgs = ((rawAppgs ?? []) as AppgRow[]).filter((a) =>
    a.secretariat && secretariatNameToSlug(a.secretariat) === slug,
  );
  if (appgs.length === 0) notFound();

  const slugs = appgs.map((a) => a.slug);
  const [fundersRes, officersRes] = await Promise.all([
    supabase.from('appg_funders').select('appg_slug, source, value_band').in('appg_slug', slugs).limit(2000),
    supabase.from('appg_officers').select('appg_slug, member_id, name_at_time, party, role').in('appg_slug', slugs).eq('removed', false).limit(2000),
  ]);
  const fundersBySlug = new Map<string, FunderRow[]>();
  for (const f of (fundersRes.data || []) as FunderRow[]) {
    if (!fundersBySlug.has(f.appg_slug)) fundersBySlug.set(f.appg_slug, []);
    fundersBySlug.get(f.appg_slug)!.push(f);
  }
  const officersBySlug = new Map<string, OfficerRow[]>();
  for (const o of (officersRes.data || []) as OfficerRow[]) {
    if (!officersBySlug.has(o.appg_slug)) officersBySlug.set(o.appg_slug, []);
    officersBySlug.get(o.appg_slug)!.push(o);
  }

  const allFunders = (fundersRes.data || []) as FunderRow[];
  const allOfficerIds = new Set<number>();
  for (const o of (officersRes.data || []) as OfficerRow[]) {
    if (o.member_id != null) allOfficerIds.add(o.member_id);
  }

  // Look up the unique MP names for linking back.
  type MpRow = { member_id: number; display_name: string | null };
  let mpById = new Map<number, MpRow>();
  if (allOfficerIds.size > 0) {
    const { data: mps } = await supabase.from('mps').select('member_id, display_name').in('member_id', Array.from(allOfficerIds));
    for (const m of (mps || []) as MpRow[]) mpById.set(m.member_id, m);
  }

  const sampleSecretariatUrl = appgs.find((a) => a.secretariat_url)?.secretariat_url ?? null;

  return (
    <OpenGovShell pageStamp="Secretariats">
      <BackLink fallbackHref="/secretariats" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          APPG Secretariat · Lobby firm dossier
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '8px', lineHeight: 1.15 }}>
          {canonicalName}
        </h1>
        {sampleSecretariatUrl && (
          <a href={sampleSecretariatUrl} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontSize: '15px', textDecoration: 'underline' }}>{sampleSecretariatUrl} ↗</a>
        )}
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <Tile label="APPGs operated" value={String(appgs.length)} sub="lobby groups inside Westminster" accent={ACCENT} />
        <Tile label="MP officers" value={String(allOfficerIds.size)} sub="across all groups run" accent={INK_SOFT} />
        <Tile label="Registered funders" value={String(allFunders.length)} sub="paying entries on the APPG register" accent={INK_SOFT} />
      </section>

      <section style={{ marginBottom: '28px', padding: '12px 14px', background: CREAM, fontSize: '15px', lineHeight: 1.6 }}>
        A secretariat is the entity that does the operational work of an All-Party Parliamentary Group: drafts agendas, briefs MPs, sends out invitations, books rooms, writes reports. When the secretariat is a lobby firm or PR firm, the APPG is a paid channel for the firm&rsquo;s clients to access MPs. The MPs officer the group, the firm supplies the staff and the policy line, the firm&rsquo;s clients (listed under Funders below) pay for the privilege.
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>APPGs operated · {appgs.length}</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px' }}>
          {appgs.map((a) => {
            const aFunders = fundersBySlug.get(a.slug) ?? [];
            const aOfficers = officersBySlug.get(a.slug) ?? [];
            return (
              <li key={a.slug} style={{ padding: '14px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '15px' }}>{a.title}</strong>
                  {a.category && <span style={{ fontSize: '15px', opacity: 0.6 }}>{a.category}</span>}
                </div>
                {a.purpose && <p style={{ fontSize: '15px', opacity: 0.75, lineHeight: 1.55, margin: '4px 0' }}>{a.purpose}</p>}
                {aOfficers.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '15px' }}>
                    <span style={{ opacity: 0.6 }}>Officered by: </span>
                    {aOfficers.slice(0, 8).map((o, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        {o.member_id && mpById.has(o.member_id) ? (
                          <Link href={`/mps/${o.member_id}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{mpById.get(o.member_id)!.display_name || o.name_at_time}</Link>
                        ) : (
                          o.name_at_time
                        )}
                        <span style={{ opacity: 0.6 }}> ({o.role || 'Officer'})</span>
                      </span>
                    ))}
                    {aOfficers.length > 8 && <span style={{ opacity: 0.6 }}> +{aOfficers.length - 8} more</span>}
                  </div>
                )}
                {aFunders.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '15px' }}>
                    <span style={{ opacity: 0.6 }}>Paid by: </span>
                    {aFunders.slice(0, 6).map((f, i) => (
                      <span key={i}>{i > 0 && ', '}<strong>{f.source}</strong>{f.value_band && <span style={{ opacity: 0.6 }}> (£{f.value_band})</span>}</span>
                    ))}
                    {aFunders.length > 6 && <span style={{ opacity: 0.6 }}> +{aFunders.length - 6} more</span>}
                  </div>
                )}
                {a.website_url && (
                  <div style={{ marginTop: '6px' }}>
                    <a href={a.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', color: ACCENT, textDecoration: 'underline' }}>Group website ↗</a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: '"Special Elite", monospace',
  fontSize: '22px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '14px',
};

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: accent }}>{value}</div>
      <div style={{ fontSize: '15px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
    </div>
  );
}
