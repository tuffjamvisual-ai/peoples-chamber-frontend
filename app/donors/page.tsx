// /donors index — biggest UK political donors by lifetime giving.
// Inverted view of the Electoral Commission register; navigates by
// donor instead of by recipient.

import NoJsPager from '@/app/components/NoJsPager';
import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { donorPageSlug } from '@/lib/donor-slug';
import DonorSearch from './DonorSearch';
import PhoneMore from '../components/PhoneMore';
import '../components/phone-table.css';
import { SubFold } from '../components/PhoneFolds';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "UK Political Donors: Who Funds Westminster",
  description:
    "Every named donor in the Electoral Commission's register, ranked by total given, with the parties, MPs and constituencies each one funded.",
  alternates: { canonical: '/donors' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

function fmtMoney(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

type DonorAgg = { donor_name: string; total: number; count: number; recipients: number };
// A row the Electoral Commission marks as public money. Newer rows carry it only in donor_type (donor_status is empty).
const isPublicFund = (r: { donor_status: string | null; donor_type: string | null }) => r.donor_status === 'Public Fund' || r.donor_type === 'Public Fund';

export default async function DonorsIndex() {
  // Pull top donors. Postgrest doesn't have a SUM aggregate via the rest
  // surface but we can fetch raw rows and roll up in JS (about 71,000 rows, fine for a daily-revalidated page).
  // Every row is read (24 Oct 2026): the loop used to stop at 60,000 rows, unordered, while the register held 70,961,
  // so later donations were left out of the ranking. The rows are now counted first and read in id order, eight pages
  // at a time, and a failed read throws so the last good version of the page stays up.
  const PAGE = 1000;
  const BATCH = 8;
  type Row = { donor_name: string | null; donor_status: string | null; donor_type: string | null; amount: number | string | null; recipient_name: string | null };
  const { count, error: countErr } = await supabase
    .from('political_donations')
    .select('id', { count: 'exact', head: true })
    .not('donor_name', 'is', null);
  if (countErr) throw new Error(`/donors donation count: ${countErr.message}`);
  const pages = Math.ceil((count ?? 0) / PAGE);
  const rows: Row[] = [];
  for (let first = 0; first < pages; first += BATCH) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(BATCH, pages - first) }, (_, k) => {
        const from = (first + k) * PAGE;
        return supabase
          .from('political_donations')
          .select('donor_name, donor_status, donor_type, amount, recipient_name')
          .not('donor_name', 'is', null)
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
      }),
    );
    for (const { data, error } of batch) {
      if (error) throw new Error(`/donors donations: ${error.message}`);
      rows.push(...((data ?? []) as Row[]));
    }
  }
  if (rows.length < (count ?? 0)) throw new Error(`/donors read ${rows.length} of ${count} donation rows`);

  const agg = new Map<string, DonorAgg & { recipients_set: Set<string>; publicRows: number }>();
  for (const r of rows) {
    const name = (r.donor_name || '').trim();
    if (!name || /^anonymous$/i.test(name)) continue;
    const ex = agg.get(name) ?? { donor_name: name, total: 0, count: 0, recipients: 0, recipients_set: new Set<string>(), publicRows: 0 };
    ex.total += Number(r.amount) || 0;
    ex.count += 1;
    if (isPublicFund(r)) ex.publicRows += 1;
    if (r.recipient_name) ex.recipients_set.add(r.recipient_name);
    agg.set(name, ex);
  }
  // Public funds are not private donors (owner, 5 Nov 2026): a name most of whose records are Public Fund leaves the
  // ranking, so one mistyped record cannot move a private donor. The section lists those big enough to have ranked.
  const everyone = Array.from(agg.values())
    .map((a) => ({ donor_name: a.donor_name, total: a.total, count: a.count, recipients: a.recipients_set.size, isPublic: a.publicRows * 2 > a.count }))
    .sort((a, b) => b.total - a.total);
  const top = everyone.filter((d) => !d.isPublic).slice(0, 200);
  const publicAll = everyone.filter((d) => d.isPublic);
  const publicListed = everyone.slice(0, 200).filter((d) => d.isPublic);
  const publicOthers = publicAll.length - publicListed.length;

  return (
    <OpenGovShell pageStamp="Donors">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>
          Electoral Commission · Donor index
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          Who funds Westminster
        </h1>
        {/* Phones (UX3b, 10 Nov 2026): in a closed native fold, so the page's main action starts on the first screen (A6). From 640px up, as before. */}
        <SubFold label="About this list">
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '8px', maxWidth: '60ch' }}>
          The 200 biggest UK political donors by lifetime giving. The Electoral Commission&rsquo;s own search lets you filter by recipient. It does not let you ask: who has this donor backed? This page does. Click any donor to see every party, MP, constituency association and APPG they have funded.
        </p>
        </SubFold>
      </header>

      <DonorSearch />

      {/* Phones (under 768px, report 47): one card per donor (phone-table.css .pt-cards), five columns did not fit. */}
      <NoJsPager id="donors-rows" ownMore count={(top).length} rows="> tbody > tr" size={25}>
      <table className="pt-cards" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: 'var(--font-special-elite), monospace' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
            <th style={{ padding: '8px 6px' }}>#</th>
            <th style={{ padding: '8px 6px' }}>Donor</th>
            <th style={{ padding: '8px 6px', textAlign: 'center' }}>Donations</th>
            <th style={{ padding: '8px 6px', textAlign: 'center' }}>Recipients</th>
            <th style={{ padding: '8px 6px', textAlign: 'right' }}>Lifetime total</th>
          </tr>
        </thead>
        <tbody id="donors-list" data-own-more>
          {top.map((d, i) => (
            <tr key={d.donor_name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <td data-label="#" style={{ padding: '6px' }}>{i + 1}</td>
              <td data-label="" className="pt-card-title" style={{ padding: '6px' }}>
                {donorPageSlug(d.donor_name) ? <Link href={`/donors/${donorPageSlug(d.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>
                  {d.donor_name}
                </Link> : <>
                  {d.donor_name}
                </>}
              </td>
              <td data-label="Donations" style={{ padding: '6px', textAlign: 'center' }}>{d.count.toLocaleString()}</td>
              <td data-label="Recipients" style={{ padding: '6px', textAlign: 'center' }}>{d.recipients}</td>
              <td data-label="Lifetime total" style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>{fmtMoney(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </NoJsPager>
      <PhoneMore selector="#donors-list" total={top.length} first={5} />

<section aria-labelledby="public-funding" style={{ marginTop: '32px', borderTop: `2px solid ${INK}`, paddingTop: '16px', fontFamily: 'var(--font-special-elite), monospace' }}>
        <h2 id="public-funding" style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px' }}>Public funding (not private donors)</h2>
        <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
          Money from public bodies, recorded by the Electoral Commission alongside donations: parliamentary funding for opposition parties (Short Money and its equivalents in the Lords and devolved parliaments), Electoral Commission policy development grants, and other public payments such as HMRC and council payments. These are not private donors.
        </p>
        <NoJsPager id="donors-other" count={(publicListed).length} rows="> li" size={25}>
        <ul data-own-more style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '15px' }}>
          {publicListed.map((d) => (
            <li key={d.donor_name} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: '12px', padding: '4px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              {donorPageSlug(d.donor_name)
                ? <Link href={`/donors/${donorPageSlug(d.donor_name)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{d.donor_name}</Link>
                : <span>{d.donor_name}</span>}
              <span style={{ marginLeft: 'auto' }}>{fmtMoney(d.total)}</span>
            </li>
          ))}
        </ul>
        </NoJsPager>
        {publicOthers > 0 && <p style={{ fontSize: '15px', margin: '12px 0 0' }}>Plus {publicOthers} smaller entries under other names.</p>}
      </section>
    </OpenGovShell>
  );
}
