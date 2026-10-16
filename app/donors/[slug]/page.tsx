// Donor profile — inverts the Electoral Commission register so a
// reader can see, from the donor side, every MP / party / association
// they have given to plus every APPG they fund. The EC search UI lets
// you search by recipient. It does NOT let you navigate from the donor
// out. This page does.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { sectorForDonor } from '@/lib/donor-sectors';
import { departments } from '@/lib/departments';

export const revalidate = 86400;

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';
const WARN = '#7a4a16';
const DANGER = '#a64030';

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '£0';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

// Same canonical slug rule we use across the site.
export function donorNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Words from a slug used to narrow the database search before the exact slug comparison.
// The slug drops apostrophes and turns "&" into "and", so "childrens" must still find
// "Children's" and "and" must not be required (Forstmann Little & Co): a trailing "s" is
// dropped from longer words and "and" is skipped. Fixes donor pages that 404'd although
// they were linked (link crawl, 16 Oct 2026).
// '2026-03-04' -> '4 Mar 2026'.
function fmtDay(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '–' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function narrowTokens(slug: string): string[] {
  return slug
    .split('-')
    .filter((t) => t.length >= 2 && t !== 'and')
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t))
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

// Prerender a small set of donor pages at build time. The list does NOT
// need to be complete — its presence is what enables ISR caching for the
// whole route. Pages not listed here are rendered on first request and
// cached from then on (see revalidate above, 24h).
export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('political_donations')
    .select('donor_name')
    .not('donor_name', 'is', null)
    .limit(100);
  if (error) {
    throw new Error(
      `generateStaticParams(/donors/[slug]) query failed: ${error.message}`
    );
  }
  if (!data || data.length === 0) {
    throw new Error(
      'generateStaticParams(/donors/[slug]): political_donations returned no rows'
    );
  }
  const seen = new Set<string>();
  for (const row of data) {
    const name = row.donor_name;
    if (!name) continue;
    const slug = donorNameToSlug(name);
    if (slug) seen.add(slug);
    if (seen.size >= 20) break;
  }
  if (seen.size === 0) {
    throw new Error(
      'generateStaticParams(/donors/[slug]): no usable slugs derived from donor_name'
    );
  }
  return Array.from(seen).map((slug) => ({ slug }));
}

type DonationRow = {
  id: number;
  donor_name: string | null;
  donor_type: string | null;
  donor_status: string | null;
  amount: number | string | null;
  accepted_date: string | null;
  received_date: string | null;
  reported_date: string | null;
  nature: string | null;
  recipient_name: string | null;
  recipient_type: string | null;
  accounting_unit_name: string | null;
  is_anonymous: boolean | null;
  is_reported_pre_poll: boolean | null;
  returned_date: string | null;
  impermissibility_reason: string | null;
  attempted_concealment: boolean | null;
  trust_name: string | null;
  trust_creator_name: string | null;
  company_registration_number: string | null;
  addr_line1: string | null;
  addr_town: string | null;
  addr_country: string | null;
  ec_ref: string | null;
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function findDonorByMatchingSlug(slug: string): Promise<string | null> {
  // We don't store slugs in the DB; resolve by paging through donor_name
  // values and computing the slug client-side. Cheap because we can use
  // a relevant ILIKE narrowing first.
  // Split slug into significant tokens and require each to be a substring.
  const ranked = narrowTokens(slug);
  if (ranked.length === 0) return null;
  let q = supabase.from('political_donations').select('donor_name').limit(5000);
  for (const t of ranked) {
    q = q.ilike('donor_name', `%${t}%`);
  }
  const { data } = await q;
  if (!data) return null;
  const candidates = new Set<string>();
  for (const r of data as Array<{ donor_name: string | null }>) {
    const name = (r.donor_name || '').trim();
    if (!name) continue;
    if (donorNameToSlug(name) === slug) candidates.add(name);
  }
  // Return the most-common variant
  if (candidates.size === 0) return null;
  // Fetch counts to pick canonical form
  const names = Array.from(candidates);
  const { data: ranked2 } = await supabase
    .from('political_donations')
    .select('donor_name')
    .in('donor_name', names)
    .limit(2000);
  const counts = new Map<string, number>();
  for (const r of (ranked2 || []) as Array<{ donor_name: string | null }>) {
    const n = (r.donor_name || '').trim();
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? names[0];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = await findDonorByMatchingSlug(slug);
  if (!name) return { title: 'Donor' };
  return {
    title: `${name}: every UK political donation recorded by the Electoral Commission`,
    description: `Where ${name}'s money goes in UK politics: every party, MP, constituency association and All-Party Parliamentary Group they have given to or funded, with totals.`,
    alternates: { canonical: `/donors/${slug}` },
  };
}

export default async function DonorPage({ params }: PageProps) {
  const { slug } = await params;
  const canonicalName = await findDonorByMatchingSlug(slug);
  if (!canonicalName) notFound();

  // Pull every donation under any name variant that hashes to this slug.
  const ranked = narrowTokens(slug);
  let dq = supabase
    .from('political_donations')
    .select('id, donor_name, donor_type, donor_status, amount, accepted_date, received_date, reported_date, nature, recipient_name, recipient_type, accounting_unit_name, is_anonymous, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, trust_name, trust_creator_name, company_registration_number, addr_line1, addr_town, addr_country, ec_ref')
    .order('accepted_date', { ascending: false })
    .limit(2000);
  for (const t of ranked) {
    dq = dq.ilike('donor_name', `%${t}%`);
  }
  const { data: rawDonations } = await dq;
  const donations = (rawDonations || []).filter((d: DonationRow) =>
    d.donor_name && donorNameToSlug(d.donor_name) === slug,
  );

  if (donations.length === 0) notFound();

  // Roll-ups
  const total = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const byType = new Map<string, { count: number; total: number }>();
  for (const d of donations) {
    const t = d.recipient_type || '(unknown)';
    const ex = byType.get(t) ?? { count: 0, total: 0 };
    ex.count += 1;
    ex.total += Number(d.amount) || 0;
    byType.set(t, ex);
  }
  const typeRows = Array.from(byType.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.total - a.total);

  // Per-recipient roll-up
  const byRecipient = new Map<string, { name: string; type: string | null; count: number; total: number; first: string | null; last: string | null }>();
  for (const d of donations) {
    const key = d.recipient_name || '(unspecified)';
    const ex = byRecipient.get(key) ?? { name: key, type: d.recipient_type, count: 0, total: 0, first: null, last: null };
    ex.count += 1;
    ex.total += Number(d.amount) || 0;
    const dateStr = d.accepted_date || d.received_date;
    if (dateStr) {
      if (!ex.first || dateStr < ex.first) ex.first = dateStr;
      if (!ex.last || dateStr > ex.last) ex.last = dateStr;
    }
    byRecipient.set(key, ex);
  }
  const recipientRows = Array.from(byRecipient.values()).sort((a, b) => b.total - a.total);

  // Cross-link: APPGs this donor funds (using their canonical name)
  const { data: appgFunderHits } = await supabase
    .from('appg_funders')
    .select('appg_slug, value_band, description, received_date, source')
    .ilike('source', `%${ranked[0] ?? canonicalName}%`)
    .limit(200);
  const matchedAppgFunderRows = (appgFunderHits || []).filter(
    (f: { source: string }) => donorNameToSlug(f.source) === slug,
  );

  // Cross-link: government contracts held by this donor under the same
  // name. Match rule is the case-insensitive whitespace-normalised name
  // (the same rule /donations/government-contractors uses) so a donor
  // only shows a contracts panel when the EC and gov.uk registers
  // agree on the entity. Limited to current/recent contracts.
  const normName = canonicalName.toUpperCase().replace(/\s+/g, ' ').trim();
  const { data: contractHits } = await supabase
    .from('government_contracts')
    .select('id, dept_slug, title, value, awarded_date, supplier, ocid')
    .ilike('supplier', `%${ranked[0] ?? canonicalName}%`)
    .limit(500);
  type ContractRow = { id: number; dept_slug: string; title: string | null; value: number | null; awarded_date: string | null; supplier: string | null; ocid: string | null };
  const matchedContracts = ((contractHits || []) as ContractRow[]).filter((c) =>
    c.supplier && c.supplier.toUpperCase().replace(/\s+/g, ' ').trim() === normName,
  );
  // The buyer on a contract is often not a government department (academy trusts, councils,
  // NHS bodies), so only a buyer we have a department page for is linked; others are shown by
  // name. Linking every buyer to /departments/<buyer> gave 404s (ChatGPT audit, 15 Oct 2026).
  // A value the buyer did not publish is counted as unpublished, never as £0.
  const deptBySlug = new Map(departments.map((d) => [d.slug, d.name]));
  const buyerName = (slug: string) => deptBySlug.get(slug) ?? slug.split('-').map((w) => (w.length > 3 || /^(nhs|uk|hm)$/i.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ').replace(/^./, (c) => c.toUpperCase());
  const contractsByDept = new Map<string, { dept: string; name: string; isDept: boolean; count: number; total: number; unpublished: number }>();
  for (const c of matchedContracts) {
    const ex = contractsByDept.get(c.dept_slug) ?? { dept: c.dept_slug, name: buyerName(c.dept_slug), isDept: deptBySlug.has(c.dept_slug), count: 0, total: 0, unpublished: 0 };
    ex.count += 1;
    if (c.value == null) ex.unpublished += 1; else ex.total += Number(c.value);
    contractsByDept.set(c.dept_slug, ex);
  }
  const unpublishedValues = matchedContracts.filter((c) => c.value == null).length;
  const contractDeptRows = Array.from(contractsByDept.values()).sort((a, b) => b.total - a.total);
  // Record-level list (audit reassessment, 16 Oct 2026): each contract, newest first, linked to
  // its procurement record on Find a Tender by OCID.
  const contractRecords = [...matchedContracts].sort((a, b) => (b.awarded_date || '').localeCompare(a.awarded_date || ''));
  const totalContractValue = matchedContracts.reduce((s, c) => s + Number(c.value || 0), 0);
  let appgsFunded: Array<{ slug: string; title: string; category: string | null }> = [];
  if (matchedAppgFunderRows.length > 0) {
    const slugs = Array.from(new Set(matchedAppgFunderRows.map((f) => f.appg_slug)));
    const { data: appgRows } = await supabase
      .from('appgs')
      .select('slug, title, category')
      .in('slug', slugs);
    appgsFunded = (appgRows || []) as Array<{ slug: string; title: string; category: string | null }>;
  }

  // Look up member_ids for any MP recipients — to link rows to /mps/[id].
  const mpRecipientNames = donations
    .filter((d) => d.recipient_type && /\bMP\b|Regulated Donee/i.test(d.recipient_type))
    .map((d) => (d.recipient_name || '').trim())
    .filter((n) => n);
  const uniqueMpNames = Array.from(new Set(mpRecipientNames));
  type MpRow = { member_id: number; display_name: string | null; name: string | null };
  let mpByName = new Map<string, MpRow>();
  if (uniqueMpNames.length > 0) {
    // For each unique recipient name, try to find a current MP that matches.
    // We just need first-word + last-word substring match.
    const { data: mps } = await supabase.from('mps').select('member_id, display_name, name').eq('current_member', true);
    if (mps) {
      for (const rn of uniqueMpNames) {
        const lower = rn.toLowerCase();
        const tokens = lower.split(/[\s,.\-]+/).filter(Boolean);
        for (const m of mps as MpRow[]) {
          const candidate = (m.display_name || m.name || '').toLowerCase();
          if (!candidate) continue;
          const candTokens = candidate.split(/[\s,.\-]+/).filter(Boolean);
          if (candTokens.every((c: string) => tokens.some((t: string) => t === c || t.startsWith(c)))) {
            mpByName.set(rn, m);
            break;
          }
        }
      }
    }
  }

  const sector = sectorForDonor(canonicalName);
  const firstDate = donations.reduce<string | null>((min, d) => {
    const x = d.accepted_date || d.received_date;
    return x && (!min || x < min) ? x : min;
  }, null);
  const lastDate = donations.reduce<string | null>((max, d) => {
    const x = d.accepted_date || d.received_date;
    return x && (!max || x > max) ? x : max;
  }, null);

  // Aggregate flags across this donor's record
  const flaggedReturned = donations.filter((d) => d.returned_date).length;
  const flaggedImpermissible = donations.filter((d) => d.impermissibility_reason).length;
  const flaggedConcealment = donations.filter((d) => d.attempted_concealment === true).length;
  const crn = (donations[0].company_registration_number || '').trim();
  const sampleAddress = [donations[0].addr_line1, donations[0].addr_town, donations[0].addr_country].filter(Boolean).join(', ');

  return (
    <OpenGovShell pageStamp="Donors">
      <BackLink fallbackHref="/donors" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Donor · Electoral Commission record
        </p>
        <h1 style={{ fontFamily: 'Special Elite, monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '8px', lineHeight: 1.15 }}>
          {canonicalName}
        </h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {donations[0].donor_type && (
            <span style={{ fontSize: '15px', padding: '3px 8px', border: `1px solid ${INK_HAIRLINE}`, color: INK_SOFT }}>{donations[0].donor_type}</span>
          )}
          {sector && (
            <span style={{ fontSize: '15px', padding: '3px 8px', border: `1px solid ${sector.colour}`, color: sector.colour }}>{sector.label}</span>
          )}
          {crn && (
            <a href={`https://find-and-update.company-information.service.gov.uk/company/${crn}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', color: ACCENT, textDecoration: 'underline' }}>Companies House {crn} ↗</a>
          )}
        </div>
        {sampleAddress && <p style={{ fontSize: '15px', opacity: 0.7, marginTop: '8px' }}>{sampleAddress}</p>}
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <Tile label="Total given" value={fmtMoney(total)} sub={`${donations.length} donations`} accent={ACCENT} />
        <Tile label="Recipients" value={String(recipientRows.length)} sub="distinct entities" accent={INK_SOFT} />
        <Tile label="Period" value={firstDate && lastDate ? `${(new Date(firstDate)).getFullYear()}, ${(new Date(lastDate)).getFullYear()}` : ''} sub="first to last accepted" accent={INK_SOFT} />
        {flaggedReturned + flaggedImpermissible + flaggedConcealment > 0 && (
          <Tile label="Flagged" value={String(flaggedReturned + flaggedImpermissible + flaggedConcealment)} sub={`${flaggedReturned} returned · ${flaggedImpermissible} impermissible · ${flaggedConcealment} concealment`} accent={DANGER} />
        )}
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={sectionH2}>How the money was split</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={{ ...th, textAlign: 'left' }}>Recipient type</th>
              <th style={th}>Donations</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {typeRows.map((r) => (
              <tr key={r.type} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ ...td, textAlign: 'left' }}>{r.type}</td>
                <td style={td}>{r.count}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {appgsFunded.length > 0 && (
        <section style={{ marginBottom: '28px', padding: '14px 16px', background: 'rgba(20,16,13,0.04)', borderLeft: `3px solid ${WARN}` }}>
          <h2 style={{ ...sectionH2, marginTop: 0, marginBottom: '8px' }}>Also funds {appgsFunded.length} APPG{appgsFunded.length === 1 ? '' : 's'}</h2>
          <p style={{ fontSize: '15px', opacity: 0.75, marginBottom: '12px' }}>This donor pays the secretariat of these All-Party Parliamentary Groups. Officers of these groups are MPs running a lobby this donor underwrites.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px' }}>
            {appgsFunded.map((a) => (
              <li key={a.slug} style={{ padding: '4px 0' }}>
                <strong>{a.title}</strong>
                {a.category && <span style={{ opacity: 0.6, fontSize: '15px' }}> · {a.category}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {matchedContracts.length > 0 && (
        <section style={{ marginBottom: '28px', padding: '14px 16px', background: 'rgba(20,16,13,0.04)', borderLeft: `3px solid ${DANGER}` }}>
          <h2 style={{ ...sectionH2, marginTop: 0, marginBottom: '8px' }}>Also holds {matchedContracts.length} UK public-sector contract{matchedContracts.length === 1 ? '' : 's'}{unpublishedValues === matchedContracts.length ? ' · values not published' : ` · ${fmtMoney(totalContractValue)}${unpublishedValues ? ` (value not published for ${unpublishedValues})` : ''}`}</h2>
          <p style={{ fontSize: '15px', opacity: 0.75, marginBottom: '12px' }}>This donor name also appears as a supplier on Find a Tender, the government's register of public contracts. The match is an exact name overlap; no causal link is implied between the donations on this page and the contracts below. Public bodies awarding the work:</p>
          <table style={{ ...tableStyle, marginBottom: '8px' }}>
            <thead>
              <tr style={headerRow}>
                <th style={{ ...th, textAlign: 'left' }}>Contracting authority</th>
                <th style={th}>Contracts</th>
                <th style={{ ...th, textAlign: 'right' }}>Total value</th>
              </tr>
            </thead>
            <tbody>
              {contractDeptRows.map((r) => (
                <tr key={r.dept} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ ...td, textAlign: 'left' }}>
                    {r.isDept
                      ? <Link href={`/departments/${r.dept}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.name}</Link>
                      : r.name}
                  </td>
                  <td style={td}>{r.count}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {r.unpublished === r.count ? 'Not published' : `${fmtMoney(r.total)}${r.unpublished ? ` + ${r.unpublished} unpublished` : ''}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ fontFamily: '"Special Elite", monospace', fontSize: '17px', fontWeight: 'bold', margin: '16px 0 8px' }}>Each contract{contractRecords.length > 50 ? ` · newest 50 of ${contractRecords.length}` : ''}</h3>
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ ...tableStyle, minWidth: '560px' }}>
              <thead>
                <tr style={headerRow}>
                  <th style={{ ...th, textAlign: 'left' }}>Contract</th>
                  <th style={{ ...th, textAlign: 'left' }}>Buyer</th>
                  <th style={th}>Awarded</th>
                  <th style={{ ...th, textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {contractRecords.slice(0, 50).map((c) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                    <td style={{ ...td, textAlign: 'left', overflowWrap: 'anywhere' }}>
                      {c.title || 'Untitled contract'}
                      {c.ocid && (
                        <>
                          <br />
                          <a href={`https://www.find-tender.service.gov.uk/Procurement/${encodeURIComponent(c.ocid)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: ACCENT, textDecoration: 'underline' }}>View on Find a Tender ↗</a>
                        </>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'left' }}>
                      {deptBySlug.has(c.dept_slug)
                        ? <Link href={`/departments/${c.dept_slug}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{buyerName(c.dept_slug)}</Link>
                        : buyerName(c.dept_slug)}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDay(c.awarded_date)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{c.value == null ? 'Not published' : fmtMoney(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/donations/government-contractors" style={{ fontSize: '15px', color: ACCENT, textDecoration: 'underline' }}>See the full contractor-donor cross-reference &rarr;</Link>
        </section>
      )}

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Recipients · top {Math.min(recipientRows.length, 50)}</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={{ ...th, textAlign: 'left' }}>Recipient</th>
              <th style={{ ...th, textAlign: 'left' }}>Type</th>
              <th style={th}>Donations</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {recipientRows.slice(0, 50).map((r) => {
              const mp = mpByName.get(r.name);
              return (
                <tr key={r.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ ...td, textAlign: 'left' }}>
                    {mp ? (
                      <Link href={`/mps/${mp.member_id}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.name}</Link>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'left', fontSize: '15px', opacity: 0.75 }}>{r.type || ''}</td>
                  <td style={td}>{r.count}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(r.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {recipientRows.length > 50 && (
          <p style={{ fontSize: '15px', opacity: 0.7, marginTop: '8px' }}>Showing top 50 of {recipientRows.length}.</p>
        )}
      </section>

      {/* Record-level list (audit reassessment, 16 Oct 2026): every donation, newest first, with
          its Electoral Commission reference, so a reader can check the original entry. */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Each donation{donations.length > 100 ? ` · newest 100 of ${donations.length}` : ''}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...tableStyle, minWidth: '600px' }}>
            <thead>
              <tr style={headerRow}>
                <th style={th}>Accepted</th>
                <th style={{ ...th, textAlign: 'left' }}>Recipient</th>
                <th style={{ ...th, textAlign: 'left' }}>Type</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                <th style={th}>EC reference</th>
              </tr>
            </thead>
            <tbody>
              {donations.slice(0, 100).map((d) => {
                const mp = d.recipient_name ? mpByName.get(d.recipient_name.trim()) : undefined;
                const notes = [d.returned_date ? 'Returned' : null, d.impermissibility_reason ? 'Impermissible' : null].filter(Boolean).join(' · ');
                return (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDay(d.accepted_date || d.received_date)}</td>
                    <td style={{ ...td, textAlign: 'left', overflowWrap: 'anywhere' }}>
                      {mp ? <Link href={`/mps/${mp.member_id}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{d.recipient_name}</Link> : (d.recipient_name || 'Not recorded')}
                      {d.accounting_unit_name && d.accounting_unit_name !== d.recipient_name && <span style={{ display: 'block', fontSize: '14px', opacity: 0.75 }}>{d.accounting_unit_name}</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'left' }}>
                      {d.nature || '–'}
                      {notes && <span style={{ display: 'block', fontSize: '14px', color: DANGER }}>{notes}</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(d.amount)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {d.ec_ref ? (
                        <a href={`https://search.electoralcommission.org.uk/Search/Donations?currentPage=1&rows=10&query=${encodeURIComponent(d.ec_ref)}&sort=AcceptedDate&order=desc`} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline' }}>{d.ec_ref} ↗</a>
                      ) : '–'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: '"Special Elite", monospace' };
const headerRow: React.CSSProperties = { borderBottom: `2px solid ${INK}`, textAlign: 'center' };
const th: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 'bold' };
const td: React.CSSProperties = { padding: '8px 6px', textAlign: 'center', fontSize: '15px', verticalAlign: 'top' };

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: accent }}>{value}</div>
      <div style={{ fontSize: '15px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
    </div>
  );
}
