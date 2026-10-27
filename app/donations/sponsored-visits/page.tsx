// /donations/sponsored-visits — non-cash benefits declared on the EC
// donations register as paid-for visits, trips and events.
//
// Hidden-in-plain-sight: every EC record has a purpose_of_visit
// column populated only when the "donation" is a sponsored trip
// rather than money. 1,759 such records exist, covering everything
// from Hong Kong Government delegations to MP fact-finding visits
// paid for by the Qatari and Saudi Foreign Ministries to Hoover
// Institution conference invitations.
//
// This is separate from the ministers_meetings hospitality feed:
// that one is the central-government transparency register and
// only covers ministerial-rank meetings. This one covers every MP
// who took a paid trip and declared it to the EC, including
// backbenchers and former cabinet ministers acting in personal
// capacity. The two together form the full picture of who's
// paying for MPs to go where.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { fmtDate } from '@/lib/lobbying';
import { donorPageSlug } from '@/lib/donor-slug';
import { readAll } from '@/lib/read-all';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Who paid for UK MPs\' trips: foreign governments, think tanks, lobby groups',
  description:
    'Every sponsored visit declared to the Electoral Commission as a donation in kind. Lists foreign governments that paid, think tank invitations, and trips by ‘Friends of’ groups, grouped by sponsor and by recipient MP.',
  alternates: { canonical: '/donations/sponsored-visits' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

// Classify the sponsor into a small, readable typology.
function classifySponsor(name: string | null): 'foreign-government' | 'friends-of' | 'think-tank' | 'appg' | 'company' | 'individual' | 'other' {
  if (!name) return 'other';
  const t = name.toLowerCase();
  if (
    t.includes('ministry of') || t.includes('government of') || t.includes('embassy') ||
    t.includes('state of') || t.includes('kingdom of') || /republic of (?!korea|the)/.test(t) ||
    t.includes('mofa') || t.includes('hong kong government') || t.includes('taiwan')
  ) return 'foreign-government';
  if (t.includes('friends of') || t.startsWith('conservative friends') || t.startsWith('labour friends') || t.startsWith('lib dem friends')) return 'friends-of';
  if (t.includes('institute') || t.includes('institution') || t.includes('foundation') || t.includes('council on') || t.includes('royal united services')) return 'think-tank';
  if (t.includes('all-party') || t.includes('appg')) return 'appg';
  if (t.includes(' ltd') || t.includes(' plc') || t.includes(' limited') || t.includes(' llp') || t.includes(' corp')) return 'company';
  if (/^(mr |mrs |ms |sir |dr |lord |lady |the rt hon)/i.test(name)) return 'individual';
  return 'other';
}

type Row = {
  id: number;
  donor_name: string | null;
  recipient_name: string | null;
  recipient_type: string | null;
  amount: number | null;
  accepted_date: string | null;
  purpose_of_visit: string | null;
};

export default async function SponsoredVisitsPage() {
  // Every row in a stable order, failing loudly (24 Oct 2026, report 36): lib/read-all.ts. The loop it replaces stopped
  // quietly on an error (showing partial figures) and was ordered only by a column with ties.
  const rows = await readAll<Row>(() => supabase.from('political_donations'), {
    columns: 'id, donor_name, recipient_name, recipient_type, amount, accepted_date, purpose_of_visit',
    filter: (q) => q.not('purpose_of_visit', 'is', null).neq('purpose_of_visit', ''),
    orderBy: [{ column: 'amount', ascending: false }, { column: 'id' }],
    label: '/donations/sponsored-visits',
  });

  const totalAll = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  // Sponsor league overall
  type Agg = { name: string; count: number; total: number; classification: string };
  const bySponsor = new Map<string, Agg>();
  for (const r of rows) {
    const n = (r.donor_name || '(unknown)').trim();
    const ex = bySponsor.get(n) ?? { name: n, count: 0, total: 0, classification: classifySponsor(r.donor_name) };
    ex.count += 1;
    ex.total += Number(r.amount || 0);
    bySponsor.set(n, ex);
  }
  const sponsorsRanked = Array.from(bySponsor.values()).sort((a, b) => b.total - a.total);
  const foreignGovs = sponsorsRanked.filter((s) => s.classification === 'foreign-government').slice(0, 20);
  const friendsOf = sponsorsRanked.filter((s) => s.classification === 'friends-of').slice(0, 15);
  const thinkTanks = sponsorsRanked.filter((s) => s.classification === 'think-tank').slice(0, 15);

  // Recipient league
  const byRecipient = new Map<string, { name: string; count: number; total: number }>();
  for (const r of rows) {
    const n = (r.recipient_name || '(unknown)').trim();
    const ex = byRecipient.get(n) ?? { name: n, count: 0, total: 0 };
    ex.count += 1;
    ex.total += Number(r.amount || 0);
    byRecipient.set(n, ex);
  }
  const recipientRanked = Array.from(byRecipient.values()).sort((a, b) => b.total - a.total).slice(0, 30);

  // Largest 40 individual trips
  const largest = rows.slice(0, 40);

  // Counts by classification
  const classifCounts: Record<string, number> = {};
  for (const s of sponsorsRanked) {
    classifCounts[s.classification] = (classifCounts[s.classification] || 0) + s.count;
  }

  return (
    <OpenGovShell pageStamp="Donations">
      <BackLink fallbackHref="/transparency/donations" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>
          Travel paid by others · Sponsored visits and events
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Who pays for UK MPs to travel
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {rows.length.toLocaleString()} declared trips and events worth &pound;{Math.round(totalAll).toLocaleString()} appear on the Electoral Commission register as donations in kind with a stated purpose of visit. These are sponsored visits: foreign governments, think tanks, lobby groups and individuals paying for MPs to travel, attend conferences, or meet heads of state. The single largest paymasters are Hong Kong&rsquo;s government, Conservative Friends of Israel and Labour Friends of Israel; the Ministries of Foreign Affairs of Qatar, Taiwan, Saudi Arabia, India and Japan all appear in the top tier.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <Tile label="Foreign government trips" value={String(classifCounts['foreign-government'] || 0)} />
        <Tile label="'Friends of' group trips" value={String(classifCounts['friends-of'] || 0)} />
        <Tile label="Think tank invitations" value={String(classifCounts['think-tank'] || 0)} />
        <Tile label="Trips paid by companies" value={String(classifCounts['company'] || 0)} />
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Foreign government paymasters</h2>
        <p style={{ fontSize: '15px', marginBottom: '8px' }}>Sponsors acting for a state, paying directly for UK MPs to visit. Ranked by total declared value.</p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Sponsor</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Trips</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total value</th>
            </tr>
          </thead>
          <tbody>
            {foreignGovs.map((s, i) => (
              <tr key={s.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px' }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  {donorPageSlug(s.name) ? <Link href={`/donors/${donorPageSlug(s.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}><strong>{s.name}</strong></Link> : <><strong>{s.name}</strong></>}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{s.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(s.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>&lsquo;Friends of&rsquo; groups</h2>
        <p style={{ fontSize: '15px', marginBottom: '8px' }}>Parliamentary groups with an affinity for a foreign country, paying for delegations of their MP members. Often a channel of soft power for the country in question.</p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Sponsor</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Trips</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total value</th>
            </tr>
          </thead>
          <tbody>
            {friendsOf.map((s, i) => (
              <tr key={s.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px' }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  {donorPageSlug(s.name) ? <Link href={`/donors/${donorPageSlug(s.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}><strong>{s.name}</strong></Link> : <><strong>{s.name}</strong></>}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{s.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(s.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Think tanks &amp; institutions</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Sponsor</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Trips</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total value</th>
            </tr>
          </thead>
          <tbody>
            {thinkTanks.map((s, i) => (
              <tr key={s.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px' }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  {donorPageSlug(s.name) ? <Link href={`/donors/${donorPageSlug(s.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}><strong>{s.name}</strong></Link> : <><strong>{s.name}</strong></>}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{s.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(s.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Recipients · who took the most paid travel</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>Recipient</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Trips</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total value</th>
            </tr>
          </thead>
          <tbody>
            {recipientRanked.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px' }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>{r.name}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{r.count}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(r.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={sectionH2}>Largest single trips</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Paid by</th>
              <th style={{ padding: '8px 6px' }}>For</th>
              <th style={{ padding: '8px 6px' }}>Date</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Value</th>
              <th style={{ padding: '8px 6px' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {largest.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px', fontSize: '15px' }}>
                  {r.donor_name ? (
                    donorPageSlug(r.donor_name) ? <Link href={`/donors/${donorPageSlug(r.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.donor_name}</Link> : <>{r.donor_name}</>
                  ) : <span >(unknown)</span>}
                </td>
                <td style={{ padding: '6px', fontSize: '15px' }}>{r.recipient_name || ''}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '15px' }}>{fmtDate(r.accepted_date ?? null)}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(Number(r.amount || 0)).toLocaleString()}</td>
                <td style={{ padding: '6px', fontSize: '15px', maxWidth: '320px' }}>{r.purpose_of_visit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

</OpenGovShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
    </div>
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
