// /donors index — biggest UK political donors by lifetime giving.
// Inverted view of the Electoral Commission register; navigates by
// donor instead of by recipient.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { donorNameToSlug } from './[slug]/page';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "UK Political Donors: Who Funds Westminster",
  description:
    "Every named donor in the UK Electoral Commission's political donations register, ranked by total given. Click through to see exactly which parties, MPs and constituencies each donor has funded.",
  alternates: { canonical: '/donors' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

function fmtMoney(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

type DonorAgg = { donor_name: string; total: number; count: number; recipients: number };

export default async function DonorsIndex() {
  // Pull top donors. Postgrest doesn't have a SUM aggregate via the rest
  // surface but we can fetch raw rows and roll up in JS — 50k rows is
  // ~5 MB transit, fine for a daily-revalidated page.
  const PAGE = 1000;
  const rows: Array<{ donor_name: string | null; amount: number | string | null; recipient_name: string | null }> = [];
  for (let from = 0; from < 60000; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('donor_name, amount, recipient_name')
      .not('donor_name', 'is', null)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  const agg = new Map<string, DonorAgg & { recipients_set: Set<string> }>();
  for (const r of rows) {
    const name = (r.donor_name || '').trim();
    if (!name || /^anonymous$/i.test(name)) continue;
    const ex = agg.get(name) ?? { donor_name: name, total: 0, count: 0, recipients: 0, recipients_set: new Set<string>() };
    ex.total += Number(r.amount) || 0;
    ex.count += 1;
    if (r.recipient_name) ex.recipients_set.add(r.recipient_name);
    agg.set(name, ex);
  }
  const top = Array.from(agg.values())
    .map((a) => ({ donor_name: a.donor_name, total: a.total, count: a.count, recipients: a.recipients_set.size }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 200);

  return (
    <OpenGovShell pageStamp="Donors">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Electoral Commission · Donor index
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Who funds Westminster
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          The 200 biggest UK political donors by lifetime giving. The Electoral Commission&rsquo;s own search lets you filter by recipient. It does not let you ask: who has this donor backed? This page does. Click any donor to see every party, MP, constituency association and APPG they have funded.
        </p>
      </header>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: '"Special Elite", monospace' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
            <th style={{ padding: '8px 6px' }}>#</th>
            <th style={{ padding: '8px 6px' }}>Donor</th>
            <th style={{ padding: '8px 6px', textAlign: 'center' }}>Donations</th>
            <th style={{ padding: '8px 6px', textAlign: 'center' }}>Recipients</th>
            <th style={{ padding: '8px 6px', textAlign: 'right' }}>Lifetime total</th>
          </tr>
        </thead>
        <tbody>
          {top.map((d, i) => (
            <tr key={d.donor_name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
              <td style={{ padding: '6px' }}>
                <Link href={`/donors/${donorNameToSlug(d.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>
                  {d.donor_name}
                </Link>
              </td>
              <td style={{ padding: '6px', textAlign: 'center' }}>{d.count.toLocaleString()}</td>
              <td style={{ padding: '6px', textAlign: 'center' }}>{d.recipients}</td>
              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>{fmtMoney(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

<div style={{ marginTop: '20px', padding: '12px 14px', background: CREAM, fontSize: '15px' }}>
        <strong>Heads up.</strong> &ldquo;House of Commons&rdquo; and &ldquo;House of Commons Fees Office&rdquo; appear in the EC register because they are the legal counterparty for MPs&rsquo; Members Estimate &ldquo;Short Money&rdquo; payments. Those are not donations in the lobbying sense; the EC simply records the payment trail.
      </div>
    </OpenGovShell>
  );
}
