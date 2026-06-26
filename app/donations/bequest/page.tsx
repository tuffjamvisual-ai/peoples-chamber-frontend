// /donations/bequest — donations to UK political parties left in a
// donor's will.
//
// Hidden-in-plain-sight: the is_bequest flag is set on every record
// declared as a posthumous gift. The EC's search interface doesn't
// pivot by it. The dataset reveals £27M+ of "final-gift" giving to
// UK parties, a class of donation the dead donor can never be
// questioned about. The Conservatives lead by some margin (£9.9M
// across 164 bequests); Sinn Féin's six bequests average over
// £460k each (one donor, William E Hampton, left £2.4M alone).

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bequests to UK political parties: money left in a will',
  description:
    'Every political donation declared as a bequest. Money left to a UK political party in the donor\'s will. Ranked by total, with recipient breakdowns and the largest individual estates.',
  alternates: { canonical: '/donations/bequest' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

type Row = {
  id: number;
  donor_name: string | null;
  recipient_name: string | null;
  amount: number | null;
  accepted_date: string | null;
};

export default async function BequestPage() {
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('id, donor_name, recipient_name, amount, accepted_date')
      .eq('is_bequest', true)
      .order('amount', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  // Recipient league
  type Agg = { name: string; count: number; total: number };
  const byRecipient = new Map<string, Agg>();
  for (const r of rows) {
    const n = (r.recipient_name || '(unknown)').trim();
    const ex = byRecipient.get(n) ?? { name: n, count: 0, total: 0 };
    ex.count += 1;
    ex.total += Number(r.amount || 0);
    byRecipient.set(n, ex);
  }
  const recipientRanked = Array.from(byRecipient.values()).sort((a, b) => b.total - a.total);
  const totalAll = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  // Donor league — largest estates
  const byDonor = new Map<string, Agg>();
  for (const r of rows) {
    if (!r.donor_name) continue;
    const n = r.donor_name.trim();
    const ex = byDonor.get(n) ?? { name: n, count: 0, total: 0 };
    ex.count += 1;
    ex.total += Number(r.amount || 0);
    byDonor.set(n, ex);
  }
  const donorRanked = Array.from(byDonor.values()).sort((a, b) => b.total - a.total).slice(0, 30);

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← All donations" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Posthumous giving · Bequests
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Money left to UK parties in wills
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {rows.length} declared donations from {donorRanked.length}+ distinct estates totalling &pound;{Math.round(totalAll).toLocaleString()} are flagged on the Electoral Commission register as bequests. These are gifts the donor cannot be asked about, made by people who have died after writing political loyalty into their will. The Conservatives hold the largest share by some margin; small parties depend disproportionately on individual large bequests &mdash; Sinn F&eacute;in&rsquo;s six declared bequests average over &pound;460k each.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>By recipient party</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Bequests</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Average</th>
            </tr>
          </thead>
          <tbody>
            {recipientRanked.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}><strong>{r.name}</strong></td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{r.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(r.total).toLocaleString()}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', opacity: 0.7 }}>£{Math.round(r.total / r.count).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionH2}>Largest individual estates</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Donor (estate of)</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Bequests</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {donorRanked.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${donorNameToSlug(r.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.name}</Link>
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{r.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(r.total).toLocaleString()}</td>
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
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"Special Elite", monospace' };
