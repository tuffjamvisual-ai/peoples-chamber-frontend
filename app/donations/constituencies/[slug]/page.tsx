// Per-association drill-down. Shows every declared donation to one
// constituency-level accounting unit, the donor league for that
// association, and a cross-link to the current sitting MP for the
// constituency (when the unit name resolves to one).
//
// One party's unit per page (24 Oct 2026, report 38): a unit name several parties use is a chooser listing each
// party's unit, and national headquarters units ("Central Party") list each party's national accounts. See
// lib/association-units.ts.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { resolveAssociation, type AssociationView } from '@/lib/association-units';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import { donorPageSlug } from '@/lib/donor-slug';
import { displayMpName } from '@/lib/mp-name';

export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const view = await resolveAssociation(slug);
  if (!view) return { title: 'Constituency association' };
  if (view.kind === 'chooser') {
    return view.national
      ? {
          title: `${view.unitName} accounts by party: national party donations`,
          description: `Donations declared to each party's national accounts (${view.unitName}), by party. These are national party accounts, not constituency associations.`,
          alternates: { canonical: `/donations/constituencies/${slug}` },
        }
      : {
          title: `${view.unitName}: local party accounts by party`,
          description: `${view.parties.length} parties have an accounting unit named ${view.unitName}. Choose a party to see its declared donations.`,
          alternates: { canonical: `/donations/constituencies/${slug}` },
        };
  }
  const name = view.unitName;
  return {
    title: `${name}: declared donations to this UK constituency association`,
    description: `Every Electoral Commission donation declared to ${name}, ranked by donor.`,
    alternates: { canonical: `/donations/constituencies/${slug}` },
  };
}

export default async function AssociationPage({ params }: PageProps) {
  const { slug } = await params;
  // Every donation to this association, largest first (24 Oct 2026, report 36: all rows, not the 1,000 largest).
  const view = await resolveAssociation(slug);
  if (!view) notFound();
  if (view.kind === 'chooser') return <UnitChooser view={view} />;
  const canonicalName = view.unitName;
  const rows = view.rows;
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
    const { data: mps, error: mpsErr } = await supabase
      .from('mps')
      .select('member_id, display_name, constituency')
      .eq('current_member', true);
    if (mpsErr && mpsErr.code !== 'PGRST116') throw new Error(`/donations/constituencies/[slug] mps: ${mpsErr.message}`);
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
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Constituency association · Donations declared
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '8px', lineHeight: 1.15 }}>
          {canonicalName}
        </h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '15px' }}>
          {party && <span style={{ padding: '3px 8px', border: `1px solid ${INK_HAIRLINE}` }}>{party}</span>}
          {matchedMp && (
            <Link href={`/mps/${matchedMp.member_id}`} style={{ padding: '3px 8px', border: `1px solid ${ACCENT}`, color: ACCENT, textDecoration: 'none' }}>
              Sitting MP: {displayMpName(matchedMp.display_name)} &rarr;
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
                  {donorPageSlug(d.name) ? <Link href={`/donors/${donorPageSlug(d.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{d.name}</Link> : <>{d.name}</>}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{d.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(d.total).toLocaleString()}</td>
                <td style={{ padding: '6px', fontSize: '15px', fontFamily: 'monospace', opacity: 0.7 }}>
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

// A unit name several parties use, or a national headquarters unit: each party's figures and a link, never a combined
// total or a mixed donor league.
function UnitChooser({ view }: { view: Extract<AssociationView, { kind: 'chooser' }> }) {
  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/donations/constituencies" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          {view.national ? 'National party accounts · Donations declared' : 'Local party accounts · Choose a party'}
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          {view.national ? `${view.unitName} accounts by party` : view.unitName}
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {view.national
            ? <>&ldquo;{view.unitName}&rdquo; is the name {view.parties.length} parties use for their national accounts in the Electoral Commission register. These are national party accounts, not constituency associations, so each party is shown separately. Where a party has a money page, its name links to it.</>
            : <>{view.parties.length} parties have an accounting unit called &ldquo;{view.unitName}&rdquo;. Each is a separate party&rsquo;s local accounts, so they are not added together. Choose a party to see its donations and donors.</>}
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>By party · {view.parties.length}</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Party</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total received</th>
            </tr>
          </thead>
          <tbody>
            {view.parties.map((p) => (
              <tr key={p.party.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px' }}>
                  {p.href ? <Link href={p.href} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{p.party.name}</Link> : <>{p.party.name}</>}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{p.count.toLocaleString()}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(p.total).toLocaleString()}</td>
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
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: 'var(--font-special-elite), monospace',
  fontSize: '22px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '14px',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: 'var(--font-special-elite), monospace' };
