// Per-association drill-down. Shows every declared donation to one
// constituency-level accounting unit, the donor league for that
// association, and a cross-link to the current sitting MP for the
// constituency (when the unit name resolves to one).

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import { donorNameToSlug } from '../../../donors/[slug]/page';

export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

export function unitNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[/']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function findCanonicalUnit(slug: string): Promise<string | null> {
  const tokens = slug.split('-').filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;
  const ranked = tokens.slice().sort((a, b) => b.length - a.length).slice(0, 3);
  let q = supabase.from('political_donations').select('accounting_unit_name').not('accounting_unit_name', 'is', null).limit(2000);
  for (const t of ranked) q = q.ilike('accounting_unit_name', `%${t}%`);
  const { data } = await q;
  if (!data) return null;
  const counts = new Map<string, number>();
  for (const r of data as Array<{ accounting_unit_name: string | null }>) {
    const n = (r.accounting_unit_name || '').trim();
    if (!n) continue;
    if (unitNameToSlug(n) === slug) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = await findCanonicalUnit(slug);
  if (!name) return { title: 'Constituency association' };
  return {
    title: `${name}: declared donations to this UK constituency association`,
    description: `Every Electoral Commission donation declared to ${name}, ranked by donor.`,
    alternates: { canonical: `/donations/constituencies/${slug}` },
  };
}

type Row = {
  id: number;
  donor_name: string | null;
  donor_type: string | null;
  recipient_name: string | null;
  accounting_unit_name: string | null;
  amount: number | null;
  accepted_date: string | null;
  nature: string | null;
};

export default async function AssociationPage({ params }: PageProps) {
  const { slug } = await params;
  const canonicalName = await findCanonicalUnit(slug);
  if (!canonicalName) notFound();

  const tokens = slug.split('-').filter((t) => t.length >= 2);
  const ranked = tokens.slice().sort((a, b) => b.length - a.length).slice(0, 3);
  let q = supabase
    .from('political_donations')
    .select('id, donor_name, donor_type, recipient_name, accounting_unit_name, amount, accepted_date, nature')
    .not('accounting_unit_name', 'is', null)
    .order('amount', { ascending: false })
    .limit(2000);
  for (const t of ranked) q = q.ilike('accounting_unit_name', `%${t}%`);
  const { data: raw } = await q;
  const rows = ((raw || []) as Row[]).filter((r) => r.accounting_unit_name && unitNameToSlug(r.accounting_unit_name) === slug);
  if (rows.length === 0) notFound();

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const party = rows.find((r) => r.recipient_name)?.recipient_name || null;
  const firstDate = rows.reduce<string | null>((min, r) => {
    const d = r.accepted_date;
    return d && (!min || d < min) ? d : min;
  }, null);
  const lastDate = rows.reduce<string | null>((max, r) => {
    const d = r.accepted_date;
    return d && (!max || d > max) ? d : max;
  }, null);

  // Donor league for this association
  type DonorAgg = { name: string; count: number; total: number; first: string | null; last: string | null };
  const byDonor = new Map<string, DonorAgg>();
  for (const r of rows) {
    const n = (r.donor_name || '(unspecified)').trim();
    const ex = byDonor.get(n) ?? { name: n, count: 0, total: 0, first: null, last: null };
    ex.count += 1;
    ex.total += Number(r.amount || 0);
    const d = r.accepted_date;
    if (d) {
      if (!ex.first || d < ex.first) ex.first = d;
      if (!ex.last || d > ex.last) ex.last = d;
    }
    byDonor.set(n, ex);
  }
  const donorRows = Array.from(byDonor.values()).sort((a, b) => b.total - a.total);

  // Cross-link: which current MP holds the constituency this
  // association name suggests? Look for a current MP whose seat name
  // matches the unit name (loose match — accounting units often drop
  // 'and' or 'constituency' suffix).
  const cleanUnit = canonicalName.replace(/\bConstituency\b/i, '').replace(/\bAssociation\b/i, '').replace(/\bCLP\b/i, '').trim();
  let matchedMp: { member_id: number; display_name: string | null; constituency: string | null } | null = null;
  if (cleanUnit) {
    const { data: mps } = await supabase
      .from('mps')
      .select('member_id, display_name, constituency')
      .eq('current_member', true);
    if (mps) {
      const target = cleanUnit.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
      for (const m of mps as Array<{ member_id: number; display_name: string | null; constituency: string | null }>) {
        const cand = (m.constituency || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (!cand) continue;
        if (cand === target || target.includes(cand) || cand.includes(target)) {
          matchedMp = m;
          break;
        }
      }
    }
  }

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/donations/constituencies" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Constituency association · Donations declared
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '8px', lineHeight: 1.15 }}>
          {canonicalName}
        </h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px' }}>
          {party && <span style={{ padding: '3px 8px', border: `1px solid ${INK_HAIRLINE}` }}>{party}</span>}
          {matchedMp && (
            <Link href={`/mps/${matchedMp.member_id}`} style={{ padding: '3px 8px', border: `1px solid ${ACCENT}`, color: ACCENT, textDecoration: 'none' }}>
              Sitting MP: {matchedMp.display_name} &rarr;
            </Link>
          )}
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <Tile label="Total received" value={`£${Math.round(total).toLocaleString()}`} />
        <Tile label="Donations" value={String(rows.length)} />
        <Tile label="Distinct donors" value={String(donorRows.length)} />
        <Tile label="Period" value={firstDate && lastDate ? `${(new Date(firstDate)).getFullYear()} to ${(new Date(lastDate)).getFullYear()}` : ''} />
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Donor league · {donorRows.length}</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Donor</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total given</th>
              <th style={{ padding: '8px 6px' }}>First &rarr; last</th>
            </tr>
          </thead>
          <tbody>
            {donorRows.map((d, i) => (
              <tr key={d.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${donorNameToSlug(d.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{d.name}</Link>
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{d.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(d.total).toLocaleString()}</td>
                <td style={{ padding: '6px', fontSize: '13px', fontFamily: 'monospace', opacity: 0.7 }}>
                  {d.first && d.last ? (d.first === d.last ? d.first : `${d.first} → ${d.last}`) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

</OpenGovShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
    </div>
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
