// /donations/late-disclosed — donations declared to the EC more than
// 90 days after acceptance, ranked by the disclosure delay.
//
// Hidden-in-plain-sight: each EC record carries both an accepted_date
// (when the recipient took the money) and a reported_date (when the
// recipient told the EC about it). UK law requires parties report
// large donations within 30 days. The register publishes both dates
// but never the gap. This page calculates the gap on every donation
// and surfaces the worst offenders.
//
// A long gap can mean: the recipient missed the statutory deadline;
// the donation was held as a loan first and reclassified; the donor
// was historic and only reported during a register clean-up; or a
// candidacy was being concealed pre-poll. The pattern matters
// because slow disclosure breaks the point of disclosure: voters can
// only weigh donor relationships if they hear about them in time.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { donorPageSlug } from '@/lib/donor-slug';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Political donations disclosed late: when UK parties told the EC after the deadline',
  description:
    'Political donations declared to the Electoral Commission more than 90 days after acceptance, ranked by disclosure delay. UK parties are required to report large donations within 30 days; this page surfaces the gap.',
  alternates: { canonical: '/donations/late-disclosed' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

type Row = {
  id: number;
  donor_name: string | null;
  recipient_name: string | null;
  recipient_type: string | null;
  accepted_date: string | null;
  reported_date: string | null;
  amount: number | null;
};

export default async function LateDisclosedPage() {
  // Worked out in the database (late_disclosed_summary, migration 2026-10-21g; owner's approval, 21 Oct 2026): the page
  // used to read every donation over £1,500 with both dates in pages of 1,000, stopping at 50,000 of the 53,919, and
  // that read timed out a build. Same rules: a gap of more than 90 days between acceptance and disclosure.
  type Enriched = Row & { gap: number };
  type Agg = { name: string; count: number; total: number; worstGap: number };
  const { data: summary, error } = await supabase.rpc('late_disclosed_summary');
  if (error || !summary) throw new Error(`late_disclosed_summary: ${error?.message ?? 'no data'}`);
  const sum = summary as { total_count: number; total_amount: number; buckets: Record<string, number>; by_recipient: Agg[]; top: Enriched[] };
  const buckets = {
    '90 to 180 days': Number(sum.buckets['90 to 180 days']) || 0,
    '180 to 365 days': Number(sum.buckets['180 to 365 days']) || 0,
    '1 to 2 years': Number(sum.buckets['1 to 2 years']) || 0,
    'over 2 years': Number(sum.buckets['over 2 years']) || 0,
  };
  const totalGt90 = Number(sum.total_count) || 0;
  const totalAmount = Number(sum.total_amount) || 0;
  const recipientRanked = sum.by_recipient.map((r) => ({ ...r, count: Number(r.count), total: Number(r.total), worstGap: Number(r.worstGap) }));
  const top50 = sum.top.map((r) => ({ ...r, gap: Number(r.gap), amount: r.amount == null ? null : Number(r.amount) }));

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Compliance · Disclosure delays
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Political donations disclosed late
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          UK law gives political parties and parliamentary recipients 30 days to report large donations to the Electoral Commission. {totalGt90.toLocaleString()} declared donations over &pound;1,500 show a gap of more than 90 days between acceptance and disclosure, worth &pound;{Math.round(totalAmount).toLocaleString()} in total. The longest gaps run to more than a decade.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {Object.entries(buckets).map(([label, n]) => (
          <div key={label} style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
            <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{n.toLocaleString()}</div>
            <div style={{ fontSize: '15px', opacity: 0.65, marginTop: '4px' }}>donations</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Recipients with the most late disclosures</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Late donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Worst gap</th>
            </tr>
          </thead>
          <tbody>
            {recipientRanked.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>{r.name}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{r.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(r.total).toLocaleString()}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', color: ACCENT }}>{r.worstGap.toLocaleString()} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionH2}>Longest delays · top 50</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Donor</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px' }}>Accepted</th>
              <th style={{ padding: '8px 6px' }}>Reported</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Gap</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {top50.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', fontSize: '15px' }}>
                  {r.donor_name ? (
                    donorPageSlug(r.donor_name) ? <Link href={`/donors/${donorPageSlug(r.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.donor_name}</Link> : <>{r.donor_name}</>
                  ) : <span style={{ opacity: 0.6 }}>(unknown)</span>}
                </td>
                <td style={{ padding: '6px', fontSize: '15px' }}>{r.recipient_name || ''}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '15px', opacity: 0.7 }}>{r.accepted_date}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '15px', opacity: 0.7 }}>{r.reported_date}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', color: ACCENT, fontWeight: 'bold' }}>{r.gap.toLocaleString()} days</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>£{Math.round(Number(r.amount || 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: '15px', opacity: 0.6, marginTop: '24px' }}>
        Calculated from Electoral Commission donations register: reported_date minus accepted_date, filtered to donations &gt; &pound;1,500 with a gap of more than 90 days. The statutory deadline of 30 days applies to most registered parties and parliamentary recipients; thresholds vary by donee type.
      </p>
    </OpenGovShell>
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
