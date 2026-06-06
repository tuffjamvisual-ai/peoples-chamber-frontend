// /donations/constituencies — donations earmarked to a specific
// constituency association rather than central party HQ.
//
// Hidden-in-plain-sight: every EC record carries an accounting_unit_name
// telling you which sub-unit of the party the money landed in. Most
// money goes to "Central Party" (£625M in our dataset) but the
// constituency-targeted subset reveals which seats local donors and
// big donors are propping up. Affluent shire seats with safe
// incumbents (Twickenham, Richmond, Surrey Heath, St Albans) and
// strategic marginals (Watford, West Suffolk) dominate the table.
//
// The EC's official search has no pivot for accounting_unit_name.
// This page assembles it.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';
import { unitNameToSlug } from './[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'UK constituency-level political donations: which local associations get bankrolled | The People\'s Chamber',
  description:
    'Ranks every UK constituency association by total declared donations received. Reveals which seats are propped up by big local donors, big national donors, or central-office redirect.',
  alternates: { canonical: '/donations/constituencies' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

// Heuristic — buckets to separate constituency associations from the
// many other accounting units (Central HQ, parliamentary funds,
// regional liaisons, councillor associations etc).
function isLikelyConstituency(name: string): boolean {
  const t = name.toLowerCase();
  if (t === 'central party' || t.includes('central office')) return false;
  if (t.includes('parliamentary office') || t.includes('westminster parliament')) return false;
  if (t.includes('westminster group') || t.includes('mp grouping')) return false;
  if (t.includes('trade union') || t.includes('liaison')) return false;
  if (t.match(/^(scotland|london|wales|northern ireland|north west|north east|south east|south west|east of england|east midlands|west midlands|yorkshire|english regions)$/)) return false;
  if (t.includes('national party') || t.includes('national executive') || t.includes('nec ')) return false;
  if (t.includes('aldc') || t.includes('councillors') || t.includes('group of councillors')) return false;
  if (t.includes('limited') || t.includes(' ltd') || t.includes(' plc')) return false;
  if (t.startsWith('closed ')) return false;
  return true;
}

type Row = {
  id: number;
  donor_name: string | null;
  recipient_name: string | null;
  accounting_unit_name: string | null;
  amount: number | null;
  accepted_date: string | null;
};

export default async function ConstituencyDonationsPage() {
  // Pull every row with a non-null accounting_unit_name. 40k rows.
  // We aggregate aggressively before rendering — only the league
  // header table sees per-row data; details are deferred to
  // per-association drill-downs (future).
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('id, donor_name, recipient_name, accounting_unit_name, amount, accepted_date')
      .not('accounting_unit_name', 'is', null)
      .neq('accounting_unit_name', '')
      .gte('amount', 1500)  // sub-£1.5k entries are usually small unaggregated cash; under EC threshold
      .order('accepted_date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
    if (rows.length > 60_000) break;
  }

  type Agg = { unit: string; party: string | null; count: number; total: number; topDonor: string; topAmount: number };
  const byUnit = new Map<string, Agg>();
  for (const r of rows) {
    const u = (r.accounting_unit_name || '').trim();
    if (!u || !isLikelyConstituency(u)) continue;
    const amt = Number(r.amount || 0);
    const ex = byUnit.get(u) ?? { unit: u, party: r.recipient_name, count: 0, total: 0, topDonor: '', topAmount: 0 };
    ex.count += 1;
    ex.total += amt;
    if (amt > ex.topAmount && r.donor_name) {
      ex.topAmount = amt;
      ex.topDonor = r.donor_name;
    }
    byUnit.set(u, ex);
  }
  const constituencies = Array.from(byUnit.values()).sort((a, b) => b.total - a.total).slice(0, 200);

  // Aggregate of the excluded "central / parliamentary / regional"
  // pools so a reader sees what the constituency rows DON'T include.
  let centralTotal = 0, centralCount = 0;
  for (const r of rows) {
    const u = (r.accounting_unit_name || '').trim();
    if (!u) continue;
    if (!isLikelyConstituency(u)) {
      centralTotal += Number(r.amount || 0);
      centralCount += 1;
    }
  }
  const constituencyTotal = constituencies.reduce((s, c) => s + c.total, 0);

  return (
    <DossierShell>
      <BackLink fallbackHref="/transparency/donations" label="← All donations" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Money on the ground · Constituency-level donations
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Which UK constituencies get bankrolled
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          UK political donations don&rsquo;t all land at central party HQ. Each declared donation carries an accounting unit telling you which sub-unit of the party kept the money. Filtering out central HQ, regional liaisons, parliamentary funds and councillor associations leaves the constituency-level pots. The top of the list is dominated by affluent shire seats with safe incumbents and a handful of strategic marginals. The EC&rsquo;s official register doesn&rsquo;t pivot this column. This page does.
        </p>
        <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '12px', lineHeight: 1.6 }}>
          For context: of the &pound;{Math.round(rows.reduce((s, r) => s + Number(r.amount || 0), 0)).toLocaleString()} of declared donations &ge; &pound;1,500 with an accounting unit, &pound;{Math.round(centralTotal).toLocaleString()} ({Math.round(100 * centralTotal / (centralTotal + constituencyTotal))}%) went to central HQ, parliamentary or regional pools, and &pound;{Math.round(constituencyTotal).toLocaleString()} ({Math.round(100 * constituencyTotal / (centralTotal + constituencyTotal))}%) to constituency-level associations like those below.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Top 200 constituency associations by total received</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Association</th>
              <th style={{ padding: '8px 6px' }}>Party</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total received</th>
              <th style={{ padding: '8px 6px' }}>Largest single donor</th>
            </tr>
          </thead>
          <tbody>
            {constituencies.map((c, i) => (
              <tr key={c.unit} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donations/constituencies/${unitNameToSlug(c.unit)}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{c.unit}</Link>
                </td>
                <td style={{ padding: '6px', fontSize: '12px', opacity: 0.75 }}>{c.party || '—'}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{c.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(c.total).toLocaleString()}</td>
                <td style={{ padding: '6px', fontSize: '12px' }}>
                  {c.topDonor ? (
                    <>
                      <Link href={`/donors/${donorNameToSlug(c.topDonor)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{c.topDonor}</Link>
                      <span style={{ opacity: 0.6, fontFamily: 'monospace', marginLeft: '6px' }}>£{Math.round(c.topAmount).toLocaleString()}</span>
                    </>
                  ) : <span style={{ opacity: 0.6 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6 }}>
        Source: Electoral Commission donations register, accounting_unit_name field. Filtered to &pound;1,500+ entries (the EC&rsquo;s standard declaration threshold). Constituency classification uses a name heuristic; a small number of mis-labelled units may slip through in either direction.
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
