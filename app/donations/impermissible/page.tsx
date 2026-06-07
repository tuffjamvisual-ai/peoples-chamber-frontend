// /donations/impermissible — donations that were declared, then
// found impermissible under UK law and either returned or forfeited.
//
// Hidden-in-plain-sight: each EC record carries impermissibility_reason
// and returned_date columns, populated only when the regulator caught
// the problem. The EC's search interface doesn't pivot by these. The
// political point: this is the list of money UK parties tried to
// accept but were not allowed to keep. Reform UK, Conservative HQ
// and others are over-represented in recent years through
// direct-bank-transfer donations where permissibility couldn't be
// verified inside the 30-day statutory window.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Impermissible political donations: money UK parties had to give back | The People\'s Chamber',
  description:
    'Political donations declared to the Electoral Commission and subsequently found impermissible under UK law. Lists every returned donation with the reason and the recipient party.',
  alternates: { canonical: '/donations/impermissible' },
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
  impermissibility_reason: string | null;
  returned_date: string | null;
  amount: number | null;
  accepted_date: string | null;
};

// The EC mixes 78 distinct free-text reasons in this column. Normalise
// the common patterns into a small set so the breakdown is readable.
function normaliseReason(raw: string | null): string {
  if (!raw) return 'Other';
  const t = raw.toLowerCase();
  if (t.includes('electoral register') || t.includes('electoral roll') || t.includes('not registered') || t.includes('not on register')) {
    return 'Donor not on UK electoral register';
  }
  if (t.includes('direct bank transfer') || t.includes('bank account')) {
    return 'Direct bank transfer · permissibility not verifiable';
  }
  if (t.includes('overseas') || t.includes('lives in') || t.includes('outside the uk') || t.includes('not resident')) {
    return 'Donor resident outside the UK';
  }
  if (t.includes('not trading') || t.includes('not actively trading') || t.includes('no longer trading')) {
    return 'Company not actively trading';
  }
  if (t.includes('charity')) return 'Donation from charity';
  if (t.includes('address') && (t.includes('unknown') || t.includes('not known') || t.includes('verify'))) {
    return 'Address not verifiable';
  }
  if (t === 'impermissible' || t === 'n/a') return 'Impermissible (no reason given)';
  return 'Other';
}

export default async function ImpermissiblePage() {
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('id, donor_name, recipient_name, recipient_type, impermissibility_reason, returned_date, amount, accepted_date')
      .not('impermissibility_reason', 'is', null)
      .order('amount', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  // Reason buckets
  const reasons = new Map<string, { reason: string; count: number; total: number }>();
  for (const r of rows) {
    const cat = normaliseReason(r.impermissibility_reason);
    const ex = reasons.get(cat) ?? { reason: cat, count: 0, total: 0 };
    ex.count += 1;
    ex.total += Number(r.amount || 0);
    reasons.set(cat, ex);
  }
  const reasonsRanked = Array.from(reasons.values()).sort((a, b) => b.count - a.count);

  // Recipient league — which parties get caught accepting impermissible most
  const byRecipient = new Map<string, { name: string; count: number; total: number }>();
  for (const r of rows) {
    const n = (r.recipient_name || '(unknown)').trim();
    const ex = byRecipient.get(n) ?? { name: n, count: 0, total: 0 };
    ex.count += 1;
    ex.total += Number(r.amount || 0);
    byRecipient.set(n, ex);
  }
  const recipientRanked = Array.from(byRecipient.values()).sort((a, b) => b.count - a.count).slice(0, 25);
  const totalAll = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  // Largest 50 individual entries
  const largest = [...rows].slice(0, 50);

  return (
    <DossierShell>
      <BackLink fallbackHref="/transparency/donations" label="← All donations" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Money the regulator caught · Returned donations
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Impermissible donations to UK parties
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {rows.length} declared donations totalling &pound;{Math.round(totalAll).toLocaleString()} were ruled impermissible under UK law and either returned to the donor or forfeited to the Consolidated Fund. The most common reason is that the donor was not registered on a UK electoral roll at the time of giving. The list runs from honest administrative slips to instances where the recipient party accepted untraceable direct bank transfers and could not verify the source before the deadline.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>By reason</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Reason</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {reasonsRanked.map((r) => (
              <tr key={r.reason} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px' }}>{r.reason}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{r.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(r.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Recipients caught accepting impermissible most often</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {recipientRanked.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>{r.name}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{r.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(r.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionH2}>Largest impermissible donations</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Donor</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px' }}>Returned</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '8px 6px' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {largest.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', fontSize: '12px' }}>
                  {r.donor_name ? (
                    <Link href={`/donors/${donorNameToSlug(r.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.donor_name}</Link>
                  ) : <span style={{ opacity: 0.6 }}>(unknown)</span>}
                </td>
                <td style={{ padding: '6px', fontSize: '12px' }}>{r.recipient_name || ''}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '11px', opacity: 0.7 }}>{r.returned_date || ''}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(Number(r.amount || 0)).toLocaleString()}</td>
                <td style={{ padding: '6px', fontSize: '11px', opacity: 0.8, maxWidth: '320px' }}>{r.impermissibility_reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '24px' }}>
        Source: Electoral Commission donations register, impermissibility_reason field. A donation is impermissible if it comes from a source UK law disallows: most commonly someone not on a UK electoral roll, an overseas donor outside the small-donations exception, a non-trading company, or a charity. Recipients have 30 days to verify and return; failure can mean the money is forfeited to the Consolidated Fund.
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
