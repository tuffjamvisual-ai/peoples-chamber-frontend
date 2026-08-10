// /donations/trust-funded — political donations declared as coming
// from a trust rather than a named individual.
//
// Hidden-in-plain-sight: every EC record carries trust_name and
// trust_creator_name columns, populated only when the donor is a
// trust. The EC's own search interface doesn't pivot by these. The
// political point: a trust separates the named donor on the public
// register from the beneficial source of the money. Some are
// historic bequests (a Victorian benefactor leaving money to a
// Liberal Club); others are modern opaque vehicles. The page makes
// no editorial claim about which is which — it just surfaces them.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Trust-routed political donations: who funds UK politics via trusts',
  description:
    'Political donations to UK parties and parliamentary recipients channelled through a trust rather than a named individual. Aggregated by trust, with the trust creator and recipient on every row.',
  alternates: { canonical: '/donations/trust-funded' },
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
  trust_name: string | null;
  trust_creator_name: string | null;
  trust_creator_status: string | null;
  trust_created_date: string | null;
  amount: number | null;
  accepted_date: string | null;
};

export default async function TrustFundedPage() {
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('id, donor_name, recipient_name, recipient_type, trust_name, trust_creator_name, trust_creator_status, trust_created_date, amount, accepted_date')
      .not('trust_name', 'is', null)
      .order('amount', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  type Agg = { name: string; total: number; count: number; creator: string; recipients: Set<string>; earliest: string | null; latest: string | null };
  const byTrust = new Map<string, Agg>();
  for (const r of rows) {
    const n = (r.trust_name || '').trim();
    if (!n) continue;
    const ex = byTrust.get(n) ?? {
      name: n, total: 0, count: 0, creator: r.trust_creator_name || '', recipients: new Set<string>(),
      earliest: r.accepted_date, latest: r.accepted_date,
    };
    ex.total += Number(r.amount || 0);
    ex.count += 1;
    if (r.recipient_name) ex.recipients.add(r.recipient_name);
    if (r.accepted_date) {
      if (!ex.earliest || r.accepted_date < ex.earliest) ex.earliest = r.accepted_date;
      if (!ex.latest || r.accepted_date > ex.latest) ex.latest = r.accepted_date;
    }
    byTrust.set(n, ex);
  }
  const ranked = Array.from(byTrust.values()).sort((a, b) => b.total - a.total);
  const totalAll = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  // Recent activity — most recent 30 trust donations
  const recent = [...rows]
    .filter((r) => r.accepted_date)
    .sort((a, b) => (a.accepted_date! < b.accepted_date! ? 1 : -1))
    .slice(0, 30);

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Beneficial-ownership shield · Trust donations
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          UK political donations routed through a trust
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {rows.length} declared donations totalling &pound;{Math.round(totalAll).toLocaleString()} list a trust as the donor rather than a named individual or company. The Electoral Commission requires the trust creator&rsquo;s name and status to be recorded, but the working capital and the active beneficial chain stay one step removed from the public register. The list runs from the late-Victorian Liberal Club bequests still paying out today to modern opaque vehicles.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Trusts by lifetime giving · {ranked.length}</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Trust</th>
              <th style={{ padding: '8px 6px' }}>Creator</th>
              <th style={{ padding: '8px 6px' }}>Recipient(s)</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Lifetime total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((t, i) => {
              const recipientList = Array.from(t.recipients);
              const recipientLabel = recipientList.length <= 2
                ? recipientList.join(', ')
                : `${recipientList[0]} +${recipientList.length - 1}`;
              return (
                <tr key={t.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                  <td style={{ padding: '6px' }}><strong>{t.name}</strong></td>
                  <td style={{ padding: '6px', fontSize: '15px', opacity: 0.85 }}>{t.creator || <span style={{ opacity: 0.5 }}></span>}</td>
                  <td style={{ padding: '6px', fontSize: '15px' }}>{recipientLabel}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{t.count}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(t.total).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionH2}>Most recent trust donations</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Trust</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px' }}>Accepted</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', fontSize: '15px' }}>
                  {r.donor_name ? (
                    <Link href={`/donors/${donorNameToSlug(r.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.trust_name}</Link>
                  ) : <strong>{r.trust_name}</strong>}
                </td>
                <td style={{ padding: '6px', fontSize: '15px' }}>{r.recipient_name || ''}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '15px', opacity: 0.7 }}>{r.accepted_date}</td>
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
