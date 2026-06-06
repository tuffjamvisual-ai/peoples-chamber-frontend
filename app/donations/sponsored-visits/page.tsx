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
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import { donorNameToSlug } from '../../donors/[slug]/page';

export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Who paid for UK MPs\' trips: foreign governments, think tanks, lobby groups | The People\'s Chamber',
  description:
    'Every sponsored visit declared to the Electoral Commission as a non-cash donation. Lists foreign-government paymasters, think tank invitations, and Friends-of-X group trips, grouped by sponsor and by recipient MP.',
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
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('political_donations')
      .select('id, donor_name, recipient_name, recipient_type, amount, accepted_date, purpose_of_visit')
      .not('purpose_of_visit', 'is', null)
      .neq('purpose_of_visit', '')
      .order('amount', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

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
    <DossierShell>
      <BackLink fallbackHref="/transparency/donations" label="← All donations" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Paid-for travel · Sponsored visits and events
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Who pays for UK MPs to travel
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          {rows.length.toLocaleString()} declared trips and events worth &pound;{Math.round(totalAll).toLocaleString()} appear on the Electoral Commission register as non-cash donations with a purpose-of-visit. These are sponsored visits: foreign governments, think tanks, lobby groups and individuals paying for MPs to travel, attend conferences, or meet heads of state. The single largest paymasters are Hong Kong&rsquo;s government, Conservative Friends of Israel and Labour Friends of Israel; the Ministries of Foreign Affairs of Qatar, Taiwan, Saudi Arabia, India and Japan all appear in the top tier.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <Tile label="Foreign-government trips" value={String(classifCounts['foreign-government'] || 0)} />
        <Tile label="'Friends of' group trips" value={String(classifCounts['friends-of'] || 0)} />
        <Tile label="Think-tank invitations" value={String(classifCounts['think-tank'] || 0)} />
        <Tile label="Company-paid trips" value={String(classifCounts['company'] || 0)} />
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Foreign-government paymasters</h2>
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '8px' }}>State-actor sponsors paying directly for UK MPs to visit. Ranked by total declared value.</p>
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
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${donorNameToSlug(s.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}><strong>{s.name}</strong></Link>
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
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '8px' }}>Foreign-affinity parliamentary groups paying for member-MP delegations. Often a soft-power channel for the country in question.</p>
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
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${donorNameToSlug(s.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}><strong>{s.name}</strong></Link>
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
                <td style={{ padding: '6px', opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: '6px' }}>
                  <Link href={`/donors/${donorNameToSlug(s.name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}><strong>{s.name}</strong></Link>
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
                <td style={{ padding: '6px', fontSize: '12px' }}>
                  {r.donor_name ? (
                    <Link href={`/donors/${donorNameToSlug(r.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.donor_name}</Link>
                  ) : <span style={{ opacity: 0.6 }}>(unknown)</span>}
                </td>
                <td style={{ padding: '6px', fontSize: '12px' }}>{r.recipient_name || '—'}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '11px', opacity: 0.7 }}>{r.accepted_date || '—'}</td>
                <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>£{Math.round(Number(r.amount || 0)).toLocaleString()}</td>
                <td style={{ padding: '6px', fontSize: '11px', opacity: 0.85, maxWidth: '320px' }}>{r.purpose_of_visit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '24px' }}>
        Source: Electoral Commission donations register, purpose_of_visit field. These are non-cash benefits declared as donations because they have material value to the recipient. Distinct from the central-government ministers&rsquo; hospitality feed, which only covers in-office ministerial activity.
      </p>
    </DossierShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
    </div>
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
