// /donations/foreign — political donations declared from outside the
// United Kingdom, aggregated by donor country.
//
// Hidden-in-plain-sight: each EC record carries an addr_country, but
// nobody pivots that column. Searching by country requires reading the
// register one row at a time. UK political parties and parliamentary
// donees take material money from Qatar, Saudi Arabia, UAE, Bermuda,
// the US and elsewhere; this page assembles the picture in one view.
//
// "Foreign" here means address country recorded by the EC. The EC
// already filters out impermissible sources, so every entry below is
// legally permissible — most via UK-resident donors holding foreign
// addresses, or UK-registered companies whose registered office sits
// abroad. That is not the same as illegal foreign interference. The
// pattern remains politically interesting.

import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const dynamic = 'force-dynamic'
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Foreign-source political donations: UK politics money map by country',
  description:
    'Every UK political donation declared from outside the United Kingdom, grouped by donor country. Reveals which foreign-address donors fund which UK parties and parliamentary recipients.',
  alternates: { canonical: '/donations/foreign' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

const UK_EQUIVALENTS = new Set([
  'United Kingdom', 'UK', 'GB', 'Great Britain',
  'England', 'Scotland', 'Wales', 'Northern Ireland',
]);

type Row = {
  id: number;
  donor_name: string | null;
  donor_type: string | null;
  recipient_name: string | null;
  recipient_type: string | null;
  addr_country: string | null;
  amount: number | null;
  accepted_date: string | null;
};

// Paging the donations register is the slow part; the aggregated output is
// small, so cache it for a day rather than recompute on every request.
const loadForeign = unstable_cache(
  async () => {
    const PAGE = 1000;
    const rows: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('political_donations')
        .select('id, donor_name, donor_type, recipient_name, recipient_type, addr_country, amount, accepted_date')
        .not('addr_country', 'is', null)
        .neq('addr_country', '')
        .order('amount', { ascending: false })
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      rows.push(...(data as Row[]));
      if (data.length < PAGE) break;
    }
    const foreign = rows.filter((r) => r.addr_country && !UK_EQUIVALENTS.has(r.addr_country.trim()));

    type CountryAgg = { country: string; total: number; count: number; topDonor: string; topAmount: number };
    const byCountry = new Map<string, CountryAgg>();
    for (const r of foreign) {
      const c = (r.addr_country || '').trim();
      const amt = Number(r.amount || 0);
      const ex = byCountry.get(c) ?? { country: c, total: 0, count: 0, topDonor: '', topAmount: 0 };
      ex.total += amt;
      ex.count += 1;
      if (amt > ex.topAmount && r.donor_name) { ex.topAmount = amt; ex.topDonor = r.donor_name; }
      byCountry.set(c, ex);
    }
    const countries = Array.from(byCountry.values()).sort((a, b) => b.total - a.total);
    const totalAll = foreign.reduce((s, r) => s + Number(r.amount || 0), 0);
    const topSingle = [...foreign].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 40);
    return { foreignCount: foreign.length, totalAll, countries, topSingle };
  },
  ['foreign-donations-v1'],
  { revalidate: 86400 },
);

export default async function ForeignDonationsPage() {
  const { foreignCount, totalAll, countries, topSingle } = await loadForeign();

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Money map · Foreign-address donations
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Foreign-source donations to UK politics
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          The Electoral Commission records the address country of every donor. {foreignCount} declared donations carry a non-UK country totalling £{Math.round(totalAll).toLocaleString()} across {countries.length} different jurisdictions. The register filters illegal foreign sources before publication, so every entry below is legally permissible. That does not make the pattern unimportant: it shows whose money reaches Westminster from where.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>By country · {countries.length}</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Country</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px' }}>Largest single donor</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c, i) => (
              <tr key={c.country} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}><strong>{c.country}</strong></td>
                <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>£{Math.round(c.total).toLocaleString()}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{c.count}</td>
                <td style={{ padding: '6px', fontSize: '15px' }}>
                  {c.topDonor ? (
                    <Link href={`/donors/${donorNameToSlug(c.topDonor)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{c.topDonor}</Link>
                  ) : <span style={{ opacity: 0.6 }}></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionH2}>Largest single foreign-address donations</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Donor</th>
              <th style={{ padding: '8px 6px' }}>Country</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px' }}>Accepted</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {topSingle.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px' }}>
                  {r.donor_name ? (
                    <Link href={`/donors/${donorNameToSlug(r.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.donor_name}</Link>
                  ) : <span style={{ opacity: 0.6 }}>(unknown)</span>}
                </td>
                <td style={{ padding: '6px', fontSize: '15px' }}>{r.addr_country}</td>
                <td style={{ padding: '6px', fontSize: '15px' }}>{r.recipient_name || ''}</td>
                <td style={{ padding: '6px', fontSize: '15px', fontFamily: 'monospace', opacity: 0.7 }}>{r.accepted_date || ''}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(Number(r.amount || 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: '"Special Elite", monospace' };
