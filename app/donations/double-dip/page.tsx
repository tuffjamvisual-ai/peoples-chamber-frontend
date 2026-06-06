// /donations/double-dip — MPs paid by an entity that ALSO donates
// to them politically.
//
// This is the sharpest hidden-in-plain-sight pattern on the site:
// the same body shows up on both the MP's Register of Interests
// (personal employment income) AND the Electoral Commission
// donations register (gift to the MP, their local association, or
// their leadership bid). Both legal, both declared, both filed in
// completely separate places. Reading them side-by-side requires a
// custom join nobody performs. This page does that join.
//
// Match rule: extract the payer name from the Register of
// Interests entry (everything before the first comma or opening
// parenthesis; that's the bare entity name without address or
// description) and compare exact case-insensitive against the EC
// donations register donor name. Deliberately conservative — misses
// trading-name variations, subsidiary chains and rebrands.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Double-dip: UK MPs paid both as employment income AND as political donations | The People\'s Chamber',
  description:
    'Cross-reference: every UK MP whose Register of Interests employment-and-earnings entry names an entity that also appears on the Electoral Commission donations register as a donor to that same MP. Double-dip pattern, surfaced.',
  alternates: { canonical: '/donations/double-dip' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';
const DANGER = '#a64030';

// Pull the entity name out of a free-text Register of Interests
// "Payer: X" string. Strip anything from the first opening
// parenthesis or comma onwards — that's the address or descriptor
// the EC donor field doesn't have.
function extractPayerName(s: string): string | null {
  const m = s.match(/Payer:\s*([^\r\n]+)/);
  if (!m) return null;
  return m[1].split(/\s+\(/)[0].split(',')[0].trim();
}
function norm(s: string): string {
  return s.toUpperCase().replace(/\s+/g, ' ').trim();
}

type InterestRow = { member_id: number; interest_text: string };
type DonationRow = { donor_name: string | null; recipient_name: string | null; amount: number | null };

async function fetchEmploymentPayers(): Promise<Map<number, Map<string, { display: string; appearances: number }>>> {
  const PAGE = 1000;
  const out = new Map<number, Map<string, { display: string; appearances: number }>>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('mp_registered_interests')
      .select('member_id, interest_text')
      .eq('category_name', '1. Employment and earnings')
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const r of data as InterestRow[]) {
      const payer = extractPayerName(r.interest_text || '');
      if (!payer || payer.length < 3) continue;
      const n = norm(payer);
      if (!out.has(r.member_id)) out.set(r.member_id, new Map());
      const inner = out.get(r.member_id)!;
      const ex = inner.get(n) ?? { display: payer, appearances: 0 };
      ex.appearances += 1;
      inner.set(n, ex);
    }
    if (data.length < PAGE) break;
  }
  return out;
}

async function fetchAllDonations(): Promise<DonationRow[]> {
  const PAGE = 1000;
  const out: DonationRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('donor_name, recipient_name, amount')
      .not('donor_name', 'is', null)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as DonationRow[]));
    if (data.length < PAGE) break;
  }
  return out;
}

export default async function DoubleDipPage() {
  const [payerByMp, allDonations, mpsRes] = await Promise.all([
    fetchEmploymentPayers(),
    fetchAllDonations(),
    supabase.from('mps').select('member_id, display_name').eq('current_member', true),
  ]);
  const mpById = new Map<number, { member_id: number; display_name: string | null }>();
  for (const m of (mpsRes.data || []) as Array<{ member_id: number; display_name: string | null }>) {
    mpById.set(m.member_id, m);
  }

  // Build a normalised-donor → donation list index from the single
  // donations fetch. Avoids per-MP-per-payer round trips.
  const donationsByNormDonor = new Map<string, DonationRow[]>();
  for (const d of allDonations) {
    if (!d.donor_name) continue;
    const n = norm(d.donor_name);
    if (!donationsByNormDonor.has(n)) donationsByNormDonor.set(n, []);
    donationsByNormDonor.get(n)!.push(d);
  }

  // Confirmed pairings: MP names payer X on Register of Interests AND
  // EC register shows donor with same normalised name giving to a
  // recipient that contains both MP's first AND last names.
  type Match = { memberId: number; mpName: string; payerDisplay: string; donorName: string; donorSlug: string; donationCount: number; donatedTotal: number; payerAppearances: number };
  const matches: Match[] = [];
  for (const [memberId, payerMap] of payerByMp) {
    const mp = mpById.get(memberId);
    if (!mp || !mp.display_name) continue;
    const mpFirst = mp.display_name.split(/\s+/)[0]?.toLowerCase() || '';
    const mpLast = mp.display_name.split(/\s+/).pop()?.toLowerCase() || '';
    for (const [normPayer, payerInfo] of payerMap) {
      const donations = donationsByNormDonor.get(normPayer);
      if (!donations || donations.length === 0) continue;
      const matched = donations.filter((d) => {
        if (!d.recipient_name) return false;
        const r = d.recipient_name.toLowerCase();
        return r.includes(mpFirst) && r.includes(mpLast);
      });
      if (matched.length === 0) continue;
      const matchedTotal = matched.reduce((s, d) => s + Number(d.amount || 0), 0);
      matches.push({
        memberId,
        mpName: mp.display_name,
        payerDisplay: payerInfo.display,
        donorName: donations[0].donor_name!,
        donorSlug: donorNameToSlug(donations[0].donor_name!),
        donationCount: matched.length,
        donatedTotal: matchedTotal,
        payerAppearances: payerInfo.appearances,
      });
    }
  }
  matches.sort((a, b) => b.donatedTotal - a.donatedTotal);

  return (
    <DossierShell>
      <BackLink fallbackHref="/transparency/donations" label="← All donations" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Cross-register pattern · MPs paid twice from the same source
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          The double-dip: MPs paid both as employees and as donors
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {matches.length} confirmed pairings where an MP names an entity on their Register of Interests employment-and-earnings entry that also appears on the Electoral Commission donations register as a donor to that same MP. Both registers are public. Reading them side by side has not been possible until now. The match rule is deliberately conservative &mdash; exact case-insensitive entity name &mdash; so the list misses subsidiary chains and trading variants. Every pairing below is a direct same-entity overlap.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Confirmed double-dip pairings</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>MP</th>
              <th style={{ padding: '8px 6px' }}>Entity (paying twice)</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations to MP</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total donated</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m, i) => (
              <tr key={`${m.memberId}-${m.donorSlug}`} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/mps/${m.memberId}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{m.mpName}</Link>
                </td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${m.donorSlug}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{m.donorName}</Link>
                  {m.payerAppearances > 1 && <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '6px' }}>· {m.payerAppearances} entries</span>}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{m.donationCount}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: DANGER }}>£{Math.round(m.donatedTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ background: CREAM, padding: '12px 14px', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
        <strong>What this list isn&rsquo;t.</strong> A double-dip pairing is not in itself a rule breach. UK MPs are legally allowed to take outside employment income and accept political donations from the same body provided both are declared on their respective registers. What the list shows is the small number of cases where the public has been told the same fact twice in two different places without ever being shown the overlap. The interpretation belongs to the reader.
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6 }}>
        Sources: parliament.uk Register of Members&rsquo; Financial Interests (category 1. Employment and earnings) cross-joined with the Electoral Commission donations register. Payer name extracted from the Register entry by taking everything before the first comma or opening parenthesis. Donation-to-MP match requires the EC recipient_name to include both the MP&rsquo;s first and last name.
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
