// /secretariats index — lobby firms / PR firms / charities operating
// one or more APPGs, ranked by number of groups operated.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';
import { secretariatNameToSlug } from './[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "APPG Secretariats: The Lobby Firms Operating Westminster's All-Party Groups | The People's Chamber",
  description:
    "Every secretariat operating one or more UK All-Party Parliamentary Groups, ranked by the number of groups run. Click through to see the portfolio of lobby groups each firm operates and the MPs officering them.",
  alternates: { canonical: '/secretariats' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

export default async function SecretariatsIndex() {
  const { data } = await supabase
    .from('appgs')
    .select('secretariat, slug')
    .not('secretariat', 'is', null)
    .limit(2000);

  const counts = new Map<string, { name: string; appgs: number }>();
  for (const r of (data || []) as Array<{ secretariat: string | null }>) {
    const name = (r.secretariat || '').trim();
    if (!name) continue;
    const ex = counts.get(name) ?? { name, appgs: 0 };
    ex.appgs += 1;
    counts.set(name, ex);
  }
  const ranked = Array.from(counts.values())
    .filter((c) => c.appgs >= 1)
    .sort((a, b) => b.appgs - a.appgs);

  const multi = ranked.filter((c) => c.appgs >= 2);
  const single = ranked.filter((c) => c.appgs === 1);

  return (
    <DossierShell>
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Westminster lobbying · Secretariat index
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Who runs Westminster&rsquo;s All-Party Groups
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          Each All-Party Parliamentary Group has a secretariat: the entity that does the operational work and effectively sets the policy line. When the secretariat is a lobby firm, the APPG is a paid channel for the firm&rsquo;s clients to reach MPs. {multi.length} firms operate two or more APPGs each. The rest run a single group.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Firms operating two or more APPGs · {multi.length}</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Secretariat</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>APPGs operated</th>
            </tr>
          </thead>
          <tbody>
            {multi.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/secretariats/${secretariatNameToSlug(r.name)}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{r.name}</Link>
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>{r.appgs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <details style={{ marginBottom: '32px' }}>
        <summary style={{ cursor: 'pointer', fontFamily: '"Special Elite", monospace', fontSize: '14px', fontWeight: 'bold', padding: '8px 0' }}>
          Single-APPG secretariats ({single.length})
        </summary>
        <ul style={{ listStyle: 'none', padding: '8px 0', columns: '2 280px', columnGap: '24px', fontSize: '12px' }}>
          {single.map((r) => (
            <li key={r.name} style={{ padding: '2px 0', breakInside: 'avoid' }}>
              <Link href={`/secretariats/${secretariatNameToSlug(r.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.name}</Link>
            </li>
          ))}
        </ul>
      </details>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${INK_HAIRLINE}`, fontSize: '13px' }}>
        <Link href="/appg-funders" style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>See the funder side &rarr;</Link>
        <span style={{ opacity: 0.6 }}> who pays the secretariats to run these groups</span>
      </div>

      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '12px' }}>Source: mySociety APPG register dataset, refreshed weekly.</p>
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
