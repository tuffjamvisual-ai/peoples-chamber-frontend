// /donations/government-contractors — companies that both donate to
// UK political parties AND hold public-sector contracts.
//
// The Electoral Commission register and the government contracts records are published
// separately; this joins them by name (view contractor_donor_matches).
//
// Match rule: exact case-insensitive whitespace-normalised supplier
// name = donor name. Conservative — it misses subsidiary chains and
// rebrands. Anything it does match is a direct same-entity overlap.

import type { Metadata } from 'next';
import LastUpdated from '../../components/LastUpdated';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const dynamic = 'force-dynamic'
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'UK government contractors who donate to UK political parties',
  description:
    'Companies that appear in both the UK government contracts records and the Electoral Commission donations register, ranked by total political donations.',
  alternates: { canonical: '/donations/government-contractors' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

type Cross = { displayName: string; norm: string; contracts: number; contractValue: number; donations: number; donated: number; frameworkPlaces: number };

// The cross-reference is done in the database (view contractor_donor_matches, migration
// 2026-10-16j): the page used to page ~30k contracts and every donation through the API and
// join them here, which took 17 seconds on a first load (audit X11). Cached for a day.
// Since migration 2026-10-21j the view counts each contract once (not each notice), leaves out change notices a
// newer notice supersedes, and counts frameworks as places without adding their value (potential value, not
// spending). The page reads the stored copy (migration 2026-10-21l, refreshed by the daily contracts sync): the
// view itself takes up to 3 s.
const loadMatched = unstable_cache(
  async () => {
    const matched: Cross[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('contractor_donor_matches_stored')
        .select('display_name, norm, contracts, contract_value, donations, donated, framework_places')
        .order('norm')
        .range(from, from + 999);
      if (error) throw new Error(`contractor_donor_matches_stored: ${error.message}`);
      for (const r of data || []) {
        matched.push({ displayName: r.display_name, norm: r.norm, contracts: Number(r.contracts), contractValue: Number(r.contract_value), donations: Number(r.donations), donated: Number(r.donated), frameworkPlaces: Number(r.framework_places) });
      }
      if (!data || data.length < 1000) break;
    }
    matched.sort((a, b) => b.donated - a.donated);
    const totalDonated = matched.reduce((s, m) => s + m.donated, 0);
    const totalContractValue = matched.reduce((s, m) => s + m.contractValue, 0);
    const totalContracts = matched.reduce((s, m) => s + m.contracts, 0);
    const totalFrameworkPlaces = matched.reduce((s, m) => s + m.frameworkPlaces, 0);
    return { matched, totalDonated, totalContractValue, totalContracts, totalFrameworkPlaces };
  },
  ['gov-contractors-matched-v4'],
  { revalidate: 86400 },
);

export default async function ContractorsWhoDonatePage() {
  const { matched, totalDonated, totalContractValue, totalContracts, totalFrameworkPlaces } = await loadMatched();

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Cross reference · Contractors who fund the parties choosing them
        </p>
        <h1 style={{ fontFamily: 'Special Elite, monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          UK government contractors who donate to UK political parties
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {matched.length} companies appear on both the government contracts records (Find a Tender) and the Electoral Commission donations register under the same name. Between them they hold {totalContracts.toLocaleString()} public sector contracts worth &pound;{Math.round(totalContractValue).toLocaleString()} where a value is published{totalFrameworkPlaces ? <>, and {totalFrameworkPlaces} framework place{totalFrameworkPlaces === 1 ? '' : 's'} (not added in: a framework&rsquo;s value is potential value, not spending)</> : null}, and have given &pound;{Math.round(totalDonated).toLocaleString()} in declared political donations. The largest donors among them are listed first. Match rule is conservative: exact name, ignoring capital letters. Subsidiaries, trading names and rebrands are missed.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Matched companies · ranked by political donations</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Company</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Contracts</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Contract value</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Frameworks</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Political giving</th>
            </tr>
          </thead>
          <tbody>
            {matched.map((m, i) => (
              <tr key={m.norm} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${donorNameToSlug(m.displayName)}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{m.displayName}</Link>
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{m.contracts}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>£{Math.round(m.contractValue).toLocaleString()}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{m.frameworkPlaces || ''}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{m.donations}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(m.donated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ background: CREAM, padding: '12px 14px', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
        <strong>What this list isn&rsquo;t.</strong> A company appearing on both registers does not mean its contracts were obtained as a result of its donations. What the list does show is the firms that both supply the public sector and give to political parties, with the totals from each register, so the overlap can be seen in one place.
      </section>

      <p style={{ fontSize: '15px', color: '#14100d', opacity: 1 }}>
        Sources: Find a Tender (OCDS) + Electoral Commission donations register. Match rule: supplier name = donor name exactly, ignoring capital letters and extra spaces. Counting: Find a Tender publishes several notices for one contract (an award, its contract details, later changes); each contract is counted once at its latest value. Frameworks are counted as places, not added to the contract value: a framework&rsquo;s value is the most that every supplier on it could be paid, potential value, not spending.
      </p>
      <LastUpdated sourceKey="government_contracts" />
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
