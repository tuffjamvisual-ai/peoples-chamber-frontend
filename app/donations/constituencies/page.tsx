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
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { donorPageSlug } from '@/lib/donor-slug';
import { unitNameToSlug, partyRefs, isNationalUnit } from '@/lib/association-units';
import { readAll } from '@/lib/read-all';

export const dynamic = 'force-dynamic'
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'UK political donations by constituency: which local associations get bankrolled',
  description:
    'Ranks every UK constituency association by total declared donations received. Reveals which seats are propped up by big local donors, big national donors, or money passed down from party head office.',
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
  if (isNationalUnit(name) || t.includes('central office')) return false;
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

// Paging 40k+ rows is the slow part; the aggregated league table and totals are
// small, so cache them for a day rather than recompute on every request.
const loadConstituencies = unstable_cache(
  async () => {
    // Every row in a stable order, failing loudly (24 Oct 2026, report 36): lib/read-all.ts. The loop it replaces stopped
    // quietly on an error, had no unique tiebreaker and stopped after 60,000 rows.
    const allRows = await readAll<Row>(() => supabase.from('political_donations'), {
      columns: 'id, donor_name, recipient_name, accounting_unit_name, amount, accepted_date',
      filter: (q) => q.not('accounting_unit_name', 'is', null).neq('accounting_unit_name', ''),
      orderBy: [{ column: 'accepted_date', ascending: false }, { column: 'id' }],
      label: '/donations/constituencies',
    });
    // The parties using each unit slug, over every row (as the association pages count them), so a unit name several
    // parties use links to that party's page (<unit slug>-<party slug>) and never adds parties together (report 38).
    const ref = await partyRefs();
    const partiesBySlug = new Map<string, Set<string>>();
    for (const r of allRows) {
      const s = unitNameToSlug(r.accounting_unit_name || '');
      if (!s) continue;
      const set = partiesBySlug.get(s) ?? new Set<string>();
      set.add(ref(r.recipient_name).name);
      partiesBySlug.set(s, set);
    }
    // sub-£1.5k entries are usually small unaggregated cash; under EC threshold
    const rows = allRows.filter((r) => Number(r.amount || 0) >= 1500);

    // One row per party and unit (24 Oct 2026, report 38): keyed by the unit's slug, as its page is, and labelled with
    // the most used spelling.
    type Agg = { slug: string; href: string; spellings: Map<string, number>; party: string | null; count: number; total: number; topDonor: string; topAmount: number };
    const byUnit = new Map<string, Agg>();
    for (const r of rows) {
      const u = (r.accounting_unit_name || '').trim();
      if (!u || !isLikelyConstituency(u)) continue;
      const slug = unitNameToSlug(u);
      if (!slug) continue;
      const party = ref(r.recipient_name);
      const key = `${party.name}|${slug}`;
      const shared = (partiesBySlug.get(slug)?.size ?? 0) > 1;
      const amt = Number(r.amount || 0);
      const ex = byUnit.get(key) ?? {
        slug, href: `/donations/constituencies/${shared ? `${slug}-${party.slug}` : slug}`,
        spellings: new Map<string, number>(), party: r.recipient_name, count: 0, total: 0, topDonor: '', topAmount: 0,
      };
      ex.spellings.set(u, (ex.spellings.get(u) ?? 0) + 1);
      ex.count += 1;
      ex.total += amt;
      if (amt > ex.topAmount && r.donor_name) { ex.topAmount = amt; ex.topDonor = r.donor_name; }
      byUnit.set(key, ex);
    }
    const constituencies = Array.from(byUnit.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 200)
      .map(({ spellings, ...c }) => ({ ...c, unit: [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0] }));

    // Aggregate of the excluded "central / parliamentary / regional" pools so a
    // reader sees what the constituency rows DON'T include.
    let centralTotal = 0;
    for (const r of rows) {
      const u = (r.accounting_unit_name || '').trim();
      if (u && !isLikelyConstituency(u)) centralTotal += Number(r.amount || 0);
    }
    const constituencyTotal = constituencies.reduce((s, c) => s + c.total, 0);
    const rowsTotal = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    return { constituencies, centralTotal, constituencyTotal, rowsTotal };
  },
  ['constituency-donations-v2'],
  { revalidate: 86400 },
);

export default async function ConstituencyDonationsPage() {
  const { constituencies, centralTotal, constituencyTotal, rowsTotal } = await loadConstituencies();

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Money on the ground · Donations by constituency
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Which UK constituencies get bankrolled
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          UK political donations don&rsquo;t all land at central party HQ. Each declared donation carries an accounting unit telling you which branch of the party kept the money. Filtering out central HQ, regional liaisons, parliamentary funds and councillor associations leaves the pots held in each constituency. The top of the list is dominated by affluent shire seats with safe incumbents and a handful of strategic marginals. The EC&rsquo;s official register doesn&rsquo;t pivot this column. This page does.
        </p>
        <p style={{ fontSize: '15px', opacity: 0.7, marginTop: '12px', lineHeight: 1.6 }}>
          For context: of the &pound;{Math.round(rowsTotal).toLocaleString()} of declared donations &ge; &pound;1,500 with an accounting unit, &pound;{Math.round(centralTotal).toLocaleString()} ({Math.round(100 * centralTotal / (centralTotal + constituencyTotal))}%) went to central HQ, parliamentary or regional pools, and &pound;{Math.round(constituencyTotal).toLocaleString()} ({Math.round(100 * constituencyTotal / (centralTotal + constituencyTotal))}%) to constituency associations like those below.
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
              <tr key={c.href} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={c.href} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{c.unit}</Link>
                </td>
                <td style={{ padding: '6px', fontSize: '15px', opacity: 0.75 }}>{c.party || ''}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{c.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(c.total).toLocaleString()}</td>
                <td style={{ padding: '6px', fontSize: '15px' }}>
                  {c.topDonor ? (
                    <>
                      {donorPageSlug(c.topDonor) ? <Link href={`/donors/${donorPageSlug(c.topDonor)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{c.topDonor}</Link> : <>{c.topDonor}</>}
                      <span style={{ opacity: 0.6, fontFamily: 'monospace', marginLeft: '6px' }}>£{Math.round(c.topAmount).toLocaleString()}</span>
                    </>
                  ) : <span style={{ opacity: 0.6 }}></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
