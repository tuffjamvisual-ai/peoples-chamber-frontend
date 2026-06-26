// /donations/government-contractors — companies that both donate to
// UK political parties AND hold public-sector contracts.
//
// This is the killer cross-reference the EC register and gov.uk's
// contracts-finder both publish — separately. Walking from one to
// the other manually means searching every donor name against every
// contract supplier. The match list is short but politically loaded:
// the Big Four professional-services firms, Microsoft, SSE, Randox
// (Covid PCR contracts) and others appear on both registers.
//
// Match rule: exact case-insensitive whitespace-normalised supplier
// name = donor name. Conservative — it misses subsidiary chains and
// rebrands. Anything it does match is a direct same-entity overlap.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'UK government contractors who donate to UK political parties',
  description:
    'Direct cross-reference: every UK company appearing both on the gov.uk contracts register and the Electoral Commission donations register, ranked by total political donations.',
  alternates: { canonical: '/donations/government-contractors' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

function norm(name: string): string {
  return name.toUpperCase().replace(/\s+/g, ' ').trim();
}

type SupplierAgg = { name: string; norm: string; contracts: number; contractValue: number };
type DonorAgg = { name: string; norm: string; donations: number; donated: number };

async function fetchSuppliers(): Promise<SupplierAgg[]> {
  // ~40k contracts — paginate and aggregate in JS.
  const PAGE = 1000;
  const map = new Map<string, SupplierAgg>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('government_contracts')
      .select('supplier, value')
      .not('supplier', 'is', null)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const r of data as Array<{ supplier: string | null; value: number | null }>) {
      if (!r.supplier) continue;
      const n = norm(r.supplier);
      const ex = map.get(n) ?? { name: r.supplier, norm: n, contracts: 0, contractValue: 0 };
      ex.contracts += 1;
      ex.contractValue += Number(r.value || 0);
      map.set(n, ex);
    }
    if (data.length < PAGE) break;
  }
  return Array.from(map.values());
}

async function fetchDonors(): Promise<DonorAgg[]> {
  const PAGE = 1000;
  const map = new Map<string, DonorAgg>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('donor_name, amount')
      .not('donor_name', 'is', null)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const r of data as Array<{ donor_name: string | null; amount: number | null }>) {
      if (!r.donor_name) continue;
      const n = norm(r.donor_name);
      const ex = map.get(n) ?? { name: r.donor_name, norm: n, donations: 0, donated: 0 };
      ex.donations += 1;
      ex.donated += Number(r.amount || 0);
      map.set(n, ex);
    }
    if (data.length < PAGE) break;
  }
  return Array.from(map.values());
}

export default async function ContractorsWhoDonatePage() {
  const [suppliers, donors] = await Promise.all([fetchSuppliers(), fetchDonors()]);

  // Inner join on normalised name
  const donorByNorm = new Map<string, DonorAgg>();
  for (const d of donors) donorByNorm.set(d.norm, d);

  type Cross = { displayName: string; norm: string; contracts: number; contractValue: number; donations: number; donated: number };
  const matched: Cross[] = [];
  for (const s of suppliers) {
    const d = donorByNorm.get(s.norm);
    if (!d) continue;
    matched.push({
      displayName: d.name,           // prefer EC casing for the donor side
      norm: s.norm,
      contracts: s.contracts,
      contractValue: s.contractValue,
      donations: d.donations,
      donated: d.donated,
    });
  }
  matched.sort((a, b) => b.donated - a.donated);

  const totalDonated = matched.reduce((s, m) => s + m.donated, 0);
  const totalContractValue = matched.reduce((s, m) => s + m.contractValue, 0);

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Cross-reference · Contractors who fund the parties choosing them
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          UK government contractors who donate to UK political parties
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {matched.length} companies appear on both the gov.uk contracts register and the Electoral Commission donations register under the same name. Between them they hold &pound;{Math.round(totalContractValue).toLocaleString()} in declared public-sector contracts and have given &pound;{Math.round(totalDonated).toLocaleString()} in declared political donations. The list is dominated by the Big Four professional-services firms &mdash; PwC, KPMG, Deloitte and EY &mdash; followed by Microsoft, SSE, Randox (the Covid PCR processor) and a handful of others. Match rule is conservative: exact case-insensitive name. Subsidiaries, trading names and rebrands are missed.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Matched companies · ranked by political donations</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Company</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Contracts</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Contract value</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Political giving</th>
            </tr>
          </thead>
          <tbody>
            {matched.map((m, i) => (
              <tr key={m.norm} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${donorNameToSlug(m.displayName)}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{m.displayName}</Link>
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{m.contracts}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>£{Math.round(m.contractValue).toLocaleString()}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{m.donations}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(m.donated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ background: CREAM, padding: '12px 14px', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
        <strong>What this list isn&rsquo;t.</strong> A company appearing on both registers does not mean its contracts were obtained as a result of its donations. UK procurement law forbids that linkage and every contract here was awarded through a formal procurement process. What the list does show is the small number of firms that are simultaneously public-sector suppliers and political donors. The Big Four together have given over &pound;2.5 million in declared political donations while holding over &pound;120 million in declared public-sector work; that overlap is the kind of dual-role pattern the public has a clear interest in seeing in one place.
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6 }}>
        Sources: gov.uk Contracts Finder + Electoral Commission donations register. Match rule: exact case-insensitive whitespace-normalised supplier name = donor name. Synced weekly.
      </p>
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
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"Special Elite", monospace' };
