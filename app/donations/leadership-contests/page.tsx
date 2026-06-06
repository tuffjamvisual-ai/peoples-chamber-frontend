// /donations/leadership-contests — donations declared to candidates
// while they were standing for a UK party leadership position.
//
// Hidden-in-plain-sight: every EC record carries a position_standing_for
// column. Leadership races are won partly on money, and the donations
// log records exactly who wrote which cheque into which contest. The
// official EC search interface doesn't pivot by this column. This
// page assembles each contest into a single league table.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'UK party leadership contest donations: who bankrolled the candidates | The People\'s Chamber',
  description:
    'Every declared donation to a UK political party leadership candidate while they were standing for the leadership. Grouped by contest and ranked by donor.',
  alternates: { canonical: '/donations/leadership-contests' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

// Normalise the free-text position field into clean contest buckets.
// The EC dataset spells "Labour Leadership", "Leadership of the
// Labour Party", "Labour Party Leadership" etc as separate values.
function bucketContest(raw: string | null): string {
  if (!raw) return 'Other';
  const t = raw.toLowerCase();
  if (t.includes('labour')) {
    if (t.includes('deputy')) return 'Labour deputy leadership';
    if (t.includes('scottish')) return 'Scottish Labour leadership';
    return 'Labour leadership';
  }
  if (t.includes('conservative') || t.includes('tory')) {
    return 'Conservative leadership';
  }
  if (t.includes('liberal democrat') || t.includes('lib dem')) {
    return 'Liberal Democrat leadership';
  }
  if (t.includes('mayor')) return 'Mayoralty';
  if (t.includes('parliament') || t.includes('ppc')) return 'Parliamentary candidacy';
  if (t.includes('european parliament') || t.includes('mep')) return 'MEP candidacy';
  return 'Other';
}

type Row = {
  id: number;
  donor_name: string | null;
  recipient_name: string | null;
  amount: number | null;
  accepted_date: string | null;
  position_standing_for: string | null;
};

export default async function LeadershipContestsPage() {
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('id, donor_name, recipient_name, amount, accepted_date, position_standing_for')
      .not('position_standing_for', 'is', null)
      .neq('position_standing_for', '')
      .order('accepted_date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  // Bucket by normalised contest, then by candidate inside that bucket
  type CandidateAgg = { candidate: string; total: number; count: number; topDonor: string; topAmount: number; year: string };
  type ContestAgg = { contest: string; total: number; count: number; candidates: Map<string, CandidateAgg> };
  const byContest = new Map<string, ContestAgg>();
  for (const r of rows) {
    const bucket = bucketContest(r.position_standing_for);
    const c = byContest.get(bucket) ?? { contest: bucket, total: 0, count: 0, candidates: new Map() };
    const amt = Number(r.amount || 0);
    c.total += amt;
    c.count += 1;
    const cand = (r.recipient_name || '(unknown)').trim();
    const year = (r.accepted_date || '').slice(0, 4) || '—';
    const ex = c.candidates.get(cand) ?? { candidate: cand, total: 0, count: 0, topDonor: '', topAmount: 0, year };
    ex.total += amt;
    ex.count += 1;
    if (amt > ex.topAmount && r.donor_name) {
      ex.topAmount = amt;
      ex.topDonor = r.donor_name;
    }
    // Track latest year per candidate for context
    if (year > ex.year) ex.year = year;
    c.candidates.set(cand, ex);
    byContest.set(bucket, c);
  }

  const orderedContests = Array.from(byContest.values())
    .filter((c) => c.contest !== 'Other')
    .sort((a, b) => b.total - a.total);

  // Top 30 individual leadership donations across all contests
  const top30 = [...rows]
    .filter((r) => bucketContest(r.position_standing_for).match(/leadership|mayor/i))
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 30);

  const totalAll = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <DossierShell>
      <BackLink fallbackHref="/transparency/donations" label="← All donations" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Money in leadership races · Position-specific donations
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Donations to UK party leadership candidates
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {rows.length} declared donations totalling &pound;{Math.round(totalAll).toLocaleString()} were given for a specific position the recipient was standing for. Leadership contests in the two main parties dominate the total: the 2016 Owen Smith challenge to Jeremy Corbyn raised &pound;400k+ from a clearly identified donor list; the 2022 Conservative race after Boris Johnson&rsquo;s resignation funnelled a similar sum into the Truss and Sunak camps. These are the gifts the donor wrote into the contest itself, not generic party support.
        </p>
      </header>

      {orderedContests.map((c) => {
        const candidates = Array.from(c.candidates.values()).sort((a, b) => b.total - a.total);
        return (
          <section key={c.contest} style={{ marginBottom: '32px' }}>
            <h2 style={sectionH2}>
              {c.contest} <span style={{ fontSize: '13px', opacity: 0.6, marginLeft: '8px' }}>{c.count} donations · &pound;{Math.round(c.total).toLocaleString()}</span>
            </h2>
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>Candidate</th>
                  <th style={{ padding: '8px 6px' }}>Year</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Donations</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total raised</th>
                  <th style={{ padding: '8px 6px' }}>Largest donor</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand) => (
                  <tr key={cand.candidate} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                    <td style={{ padding: '6px' }}><strong>{cand.candidate}</strong></td>
                    <td style={{ padding: '6px', fontFamily: 'monospace', opacity: 0.7 }}>{cand.year}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{cand.count}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(cand.total).toLocaleString()}</td>
                    <td style={{ padding: '6px', fontSize: '12px' }}>
                      {cand.topDonor ? (
                        <Link href={`/donors/${donorNameToSlug(cand.topDonor)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{cand.topDonor}</Link>
                      ) : <span style={{ opacity: 0.6 }}>—</span>}
                      {cand.topAmount > 0 && <span style={{ opacity: 0.6, fontFamily: 'monospace', marginLeft: '6px' }}>£{Math.round(cand.topAmount).toLocaleString()}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section>
        <h2 style={sectionH2}>Largest single leadership / mayoral donations</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Donor</th>
              <th style={{ padding: '8px 6px' }}>To</th>
              <th style={{ padding: '8px 6px' }}>For</th>
              <th style={{ padding: '8px 6px' }}>Accepted</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {top30.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', fontSize: '12px' }}>
                  {r.donor_name ? (
                    <Link href={`/donors/${donorNameToSlug(r.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.donor_name}</Link>
                  ) : <span style={{ opacity: 0.6 }}>(unknown)</span>}
                </td>
                <td style={{ padding: '6px', fontSize: '12px' }}>{r.recipient_name || '—'}</td>
                <td style={{ padding: '6px', fontSize: '11px', opacity: 0.8 }}>{r.position_standing_for}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '11px', opacity: 0.7 }}>{r.accepted_date || '—'}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(Number(r.amount || 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '24px' }}>
        Source: Electoral Commission donations register, position_standing_for field. The position the donor recorded matches the contest the recipient was running in at the time of the gift; party-of-record leadership donations stay with the party even if the candidate loses.
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
