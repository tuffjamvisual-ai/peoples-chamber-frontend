// /appg-funders index — every organisation that pays for one or
// more All-Party Parliamentary Group secretariats, ranked by how
// many groups they fund. Completes the bidirectional reference:
// secretariat ↔ APPG ↔ funder all navigable.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';
import { donorNameToSlug } from '../donors/[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'APPG Funders: every organisation paying for All-Party Parliamentary Group access',
  description:
    'Index of every organisation funding one or more UK All-Party Parliamentary Groups, ranked by groups funded. Reveals which corporations and charities buy formal Westminster access via APPG sponsorship.',
  alternates: { canonical: '/appg-funders' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

export default async function AppgFundersIndex() {
  // Pull every funder row with appg slug. ~520 rows total.
  const { data: funders } = await supabase
    .from('appg_funders')
    .select('source, appg_slug, value_band')
    .not('source', 'is', null)
    .limit(2000);

  type Agg = { name: string; appgs: Set<string>; paymentLines: number };
  const byFunder = new Map<string, Agg>();
  for (const f of (funders || []) as Array<{ source: string; appg_slug: string; value_band: string | null }>) {
    const n = (f.source || '').trim();
    if (!n || n === '(unspecified)') continue;
    const ex = byFunder.get(n) ?? { name: n, appgs: new Set<string>(), paymentLines: 0 };
    ex.appgs.add(f.appg_slug);
    ex.paymentLines += 1;
    byFunder.set(n, ex);
  }
  const ranked = Array.from(byFunder.values()).sort((a, b) => b.appgs.size - a.appgs.size || b.paymentLines - a.paymentLines);
  const multi = ranked.filter((r) => r.appgs.size >= 2);
  const single = ranked.filter((r) => r.appgs.size === 1);

  // Cross-check: which funders are also on the EC donations register
  // as direct donors? If yes, link the entry through to /donors/[slug].
  const candidateSlugs = new Set<string>();
  for (const r of multi) candidateSlugs.add(donorNameToSlug(r.name));
  // Single lookup against donor names via slug derivation. We can't
  // efficiently query for these — defer: only multi-APPG funders get
  // the cross-link probe to keep this single-query.
  const ecMatchedSlugs = new Set<string>();
  if (multi.length > 0) {
    const names = multi.map((m) => m.name);
    const { data: ec } = await supabase
      .from('political_donations')
      .select('donor_name')
      .in('donor_name', names)
      .limit(2000);
    for (const r of (ec || []) as Array<{ donor_name: string | null }>) {
      if (r.donor_name) ecMatchedSlugs.add(donorNameToSlug(r.donor_name));
    }
  }

  return (
    <DossierShell>
      <BackLink fallbackHref="/secretariats" label="← Secretariats" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Westminster lobbying · Funder index
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Who pays for Westminster&rsquo;s All-Party Groups
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {ranked.length} different organisations declared funding to one or more APPGs in the most recent register cycle. {multi.length} of them fund two or more groups: when one company sits across multiple APPGs, that&rsquo;s a single corporate lobbying spend buying multiple channels into Parliament. The defence prime BAE Systems funds three. The Joseph Rowntree Charitable Trust funds two. The rest single-fund a group typically aligned to their cause or sector.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Funders paying for two or more APPGs · {multi.length}</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Funder</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>APPGs funded</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Payment lines</th>
              <th style={{ padding: '8px 6px' }}>EC donor record?</th>
            </tr>
          </thead>
          <tbody>
            {multi.map((r, i) => {
              const slug = donorNameToSlug(r.name);
              const hasEcRecord = ecMatchedSlugs.has(slug);
              return (
                <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                  <td style={{ padding: '6px' }}><strong>{r.name}</strong></td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>{r.appgs.size}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', opacity: 0.7 }}>{r.paymentLines}</td>
                  <td style={{ padding: '6px', fontSize: '12px' }}>
                    {hasEcRecord ? (
                      <Link href={`/donors/${slug}`} style={{ color: ACCENT, textDecoration: 'underline' }}>Donor profile &rarr;</Link>
                    ) : (
                      <span style={{ opacity: 0.5 }}></span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <details style={{ marginBottom: '32px' }}>
        <summary style={{ cursor: 'pointer', fontFamily: '"Special Elite", monospace', fontSize: '14px', fontWeight: 'bold', padding: '8px 0' }}>
          Single-APPG funders ({single.length})
        </summary>
        <ul style={{ listStyle: 'none', padding: '8px 0', columns: '2 280px', columnGap: '24px', fontSize: '12px' }}>
          {single.map((r) => (
            <li key={r.name} style={{ padding: '2px 0', breakInside: 'avoid' }}>{r.name}</li>
          ))}
        </ul>
      </details>

      <p style={{ fontSize: '12px', opacity: 0.6 }}>
        An entry on this list is the public sponsor / funder of an APPG&rsquo;s secretariat costs; it does not mean every member of the group endorses the funder.
      </p>
    </DossierShell>
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
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"Special Elite", monospace' };
