// Donor profile — inverts the Electoral Commission register so a
// reader can see, from the donor side, every MP / party / association
// they have given to plus every APPG they fund. The EC search UI lets
// you search by recipient. It does NOT let you navigate from the donor
// out. This page does.

import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { sectorForDonor } from '@/lib/donor-sectors';
import { departments } from '@/lib/departments';
import { countableContracts, isFrameworkRow } from '@/lib/contract-counting';
import { donorNameToSlug, narrowTokens } from '@/lib/donor-slug';
import { ecDonationSearchUrl } from '@/lib/ec-links';
import { relatedDonorNames } from '@/lib/donor-related';
import { donorRegistry } from '@/lib/donor-registry';

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

// The slug rule and its search words live in lib/donor-slug.ts (24 Oct 2026); donorNameToSlug is still exported here
// for the pages that import it from this file.
export { donorNameToSlug };

// '2026-03-04' -> '4 Mar 2026'.
function fmtDay(iso: string | null | undefined): string {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'n/a' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Words too common in company names to narrow a supplier search (narrowTokens drops a final "s", so "service").
const COMPANY_SUFFIXES = new Set(['limited', 'ltd', 'plc', 'llp', 'group', 'holding', 'company', 'service', 'uk', 'the', 'international', 'trust', 'partnership']);

// No donor pages are rendered at build (John's approval, 19 Oct 2026): each one renders on its first visit and
// is cached from then on, refreshed after 24h (revalidate above). An empty list still makes the route
// statically cached (ISR); dynamicParams is left at its default (true), so any donor slug renders on demand.
// Pre-rendering 20 donor pages at build added full-table name lookups to the build's database load, and builds
// failed on the 3s statement timeout.
export async function generateStaticParams() {
  return [];
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

// The word search used before 24 Oct 2026, kept only as a fallback for a slug the exact registry does not hold, so no
// old address breaks (resolveDonor below).
const findDonorByMatchingSlug = cache(async (slug: string): Promise<string | null> => {
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
  const { data, error } = await q;
  if (error) throw new Error(`donor lookup: ${error.message}`);
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
});

type ResolvedDonor = { name: string; names: string[] | null; others: { slug: string; label: string }[] };

// cache(): generateMetadata and the page both resolve the slug; the lookup runs once per request.
// Exact first (24 Oct 2026): the slug is looked up among every registered donor name (lib/donor-registry.ts) and the
// page reads that donor's records by exact name. Only a slug the registry does not hold falls back to the old word
// search, and that is logged.
const resolveDonor = cache(async (slug: string): Promise<ResolvedDonor | null> => {
  const entry = (await donorRegistry()).bySlug.get(slug);
  if (entry) return { name: entry.label, names: entry.names, others: entry.others };
  const name = await findDonorByMatchingSlug(slug);
  if (name) console.warn(`/donors/${slug}: not an exact donor name; found by the word search fallback`);
  return name ? { name, names: null, others: [] } : null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = (await resolveDonor(slug))?.name;
  if (!name) return { title: 'Donor' };
  return {
    title: `${name}: every UK political donation recorded by the Electoral Commission`,
    description: `Where ${name}'s money goes in UK politics: every party, MP, constituency association and All-Party Parliamentary Group they have given to or funded, with totals.`,
    alternates: { canonical: `/donors/${slug}` },
  };
}

export default async function DonorPage({ params }: PageProps) {
  const { slug } = await params;
  const resolved = await resolveDonor(slug);
  if (!resolved) notFound();
  const canonicalName = resolved.name;

  // Every donation under this donor's registered name(s). Exact names when the registry holds the slug (every record,
  // newest first); otherwise the old word search, filtered to names whose slug matches.
  const ranked = narrowTokens(slug);
  const DONATION_COLS = 'id, donor_name, donor_type, donor_status, amount, accepted_date, received_date, reported_date, nature, recipient_name, recipient_type, accounting_unit_name, is_anonymous, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, trust_name, trust_creator_name, company_registration_number, addr_line1, addr_town, addr_country, ec_ref';
  let donations: DonationRow[] = [];
  if (resolved.names) {
    for (let i = 0; i < resolved.names.length; i += 100) {
      const chunk = resolved.names.slice(i, i + 100);
      for (let from = 0; ; from += 1000) {
        // Every name quoted: supabase-js's .in() quotes a value only when it holds a comma or a bracket, and PostgREST
        // trims an unquoted one, so a name stored with a leading space (" Christopher Harborne") would match nothing.
        const list = `(${chunk.map((n) => `"${n.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`;
        const { data, error } = await supabase.from('political_donations').select(DONATION_COLS)
          .filter('donor_name', 'in', list).order('accepted_date', { ascending: false }).order('id', { ascending: true }).range(from, from + 999);
        if (error) throw new Error(`donor donations: ${error.message}`);
        donations.push(...((data ?? []) as DonationRow[]));
        if (!data || data.length < 1000) break;
      }
    }
    // Newest first across all spellings (no date first, as the database orders them).
    donations.sort((a, b) => (a.accepted_date === b.accepted_date ? a.id - b.id : !a.accepted_date ? -1 : !b.accepted_date ? 1 : a.accepted_date < b.accepted_date ? 1 : -1));
  } else {
    let dq = supabase
      .from('political_donations')
      .select(DONATION_COLS)
      .order('accepted_date', { ascending: false })
      .limit(2000);
    for (const t of ranked) {
      dq = dq.ilike('donor_name', `%${t}%`);
    }
    const { data: rawDonations, error: donErr } = await dq;
    if (donErr) throw new Error(`donor donations: ${donErr.message}`);
    donations = ((rawDonations || []) as DonationRow[]).filter((d) => d.donor_name && donorNameToSlug(d.donor_name) === slug);
  }

  if (donations.length === 0) notFound();

  // Other donor pages with a similar name (lib/donor-related.ts): a name similarity only, nothing is combined.
  const relatedNames = await relatedDonorNames(canonicalName, slug);

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
  const { data: appgFunderHits, error: appgFunderHitsErr } = await supabase
    .from('appg_funders')
    .select('appg_slug, value_band, description, received_date, source')
    .ilike('source', `%${ranked[0] ?? canonicalName}%`)
    .limit(200);
  if (appgFunderHitsErr && appgFunderHitsErr.code !== 'PGRST116') throw new Error(`/donors/[slug] appg_funders: ${appgFunderHitsErr.message}`);
  const matchedAppgFunderRows = (appgFunderHits || []).filter(
    (f: { source: string }) => donorNameToSlug(f.source) === slug,
  );

  // Cross-link: government contracts held by this donor under the same
  // name. Match rule is the case-insensitive whitespace-normalised name
  // (the same rule /donations/government-contractors uses) so a donor
  // only shows a contracts panel when the EC and gov.uk registers
  // agree on the entity. Limited to current/recent contracts.
  const normName = canonicalName.toUpperCase().replace(/\s+/g, ' ').trim();
  // Search on the longest word that is not a company suffix: "limited" matched thousands of suppliers, the 500-row
  // cap was reached and Cadent Gas Limited's six contracts were never in it.
  const supplierToken = ranked.find((w) => !COMPANY_SUFFIXES.has(w)) ?? ranked[0] ?? canonicalName;
  const { data: contractHits, error: contractHitsErr } = await supabase
    .from('government_contracts')
    .select('id, dept_slug, title, value, awarded_date, supplier, ocid, contract_id')
    .ilike('supplier', `%${supplierToken}%`)
    .limit(500);
  if (contractHitsErr && contractHitsErr.code !== 'PGRST116') throw new Error(`/donors/[slug] government_contracts: ${contractHitsErr.message}`);
  type ContractRow = { id: number; dept_slug: string; title: string | null; value: number | null; awarded_date: string | null; supplier: string | null; ocid: string | null; contract_id: string | null };
  const nameMatched = ((contractHits || []) as ContractRow[]).filter((c) =>
    c.supplier && c.supplier.toUpperCase().replace(/\s+/g, ' ').trim() === normName,
  );
  // One row per Find a Tender notice, not per contract: lib/contract-counting.ts counts each contract once, leaves
  // out change notices a newer notice supersedes, and keeps frameworks apart (potential value, never added up).
  const { contracts: matchedContracts, frameworks: matchedFrameworks } = countableContracts(nameMatched);
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
  const contractRecords = [...matchedContracts, ...matchedFrameworks].sort((a, b) => (b.awarded_date || '').localeCompare(a.awarded_date || ''));
  const totalContractValue = matchedContracts.reduce((s, c) => s + Number(c.value || 0), 0);
  let appgsFunded: Array<{ slug: string; title: string; category: string | null }> = [];
  if (matchedAppgFunderRows.length > 0) {
    const slugs = Array.from(new Set(matchedAppgFunderRows.map((f) => f.appg_slug)));
    const { data: appgRows, error: appgRowsErr } = await supabase
      .from('appgs')
      .select('slug, title, category')
      .in('slug', slugs);
    if (appgRowsErr && appgRowsErr.code !== 'PGRST116') throw new Error(`/donors/[slug] appgs: ${appgRowsErr.message}`);
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
    const { data: mps, error: mpsErr } = await supabase.from('mps').select('member_id, display_name, name').eq('current_member', true);
    if (mpsErr && mpsErr.code !== 'PGRST116') throw new Error(`/donors/[slug] mps: ${mpsErr.message}`);
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
        {resolved.others.length > 0 && (
          <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px' }}>
            A different registered name has the same web address; its records are on their own page:{' '}
            {resolved.others.map((o, k) => (
              <span key={o.slug}>{k > 0 && ', '}<Link href={`/donors/${o.slug}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{o.label}</Link></span>
            ))}
          </p>
        )}
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
        <Tile label="Total given under this registered name" value={fmtMoney(total)} sub={`${donations.length} donations`} accent={ACCENT} />
        <Tile label="Recipients" value={String(recipientRows.length)} sub="distinct entities" accent={INK_SOFT} />
        <Tile label="Period" value={firstDate && lastDate ? `${(new Date(firstDate)).getFullYear()}, ${(new Date(lastDate)).getFullYear()}` : ''} sub="first to last accepted" accent={INK_SOFT} />
        {flaggedReturned + flaggedImpermissible + flaggedConcealment > 0 && (
          <Tile label="Flagged" value={String(flaggedReturned + flaggedImpermissible + flaggedConcealment)} sub={`${flaggedReturned} returned · ${flaggedImpermissible} impermissible · ${flaggedConcealment} concealment`} accent={DANGER} />
        )}
      </section>

      {/* Registered names (24 Oct 2026): these totals cover this name only. Similar names are listed as possibly
          related, never combined. */}
      <section aria-label="About these totals" style={{ marginTop: '-14px', marginBottom: '28px', fontSize: '15px', lineHeight: 1.6 }}>
        <p style={{ margin: 0, maxWidth: '70ch' }}>
          The Electoral Commission records donors by the name given on each report. The same person or company may appear under more than one name; these totals are not combined.
        </p>
        {relatedNames.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <h2 style={{ ...sectionH2, marginBottom: '4px' }}>Other donor names that may be related</h2>
            <p style={{ margin: '0 0 8px', opacity: 0.8, maxWidth: '70ch' }}>
              A name similarity only, not a confirmed identity: these names share the first and last word with this one once titles and punctuation are set aside. Each has its own page and totals.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
              {relatedNames.map((r) => (
                <li key={r.slug} style={{ marginBottom: '2px' }}>
                  <Link href={`/donors/${r.slug}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{r.name}</Link>
                </li>
              ))}
            </ul>
          </div>
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

      {contractRecords.length > 0 && (
        <section style={{ marginBottom: '28px', padding: '14px 16px', background: 'rgba(20,16,13,0.04)', borderLeft: `3px solid ${DANGER}` }}>
          <h2 style={{ ...sectionH2, marginTop: 0, marginBottom: '8px' }}>{matchedContracts.length === 0 ? `On ${matchedFrameworks.length} UK public framework${matchedFrameworks.length === 1 ? '' : 's'}` : `Also holds ${matchedContracts.length} UK public contract${matchedContracts.length === 1 ? '' : 's'}`}{matchedContracts.length === 0 ? '' : unpublishedValues === matchedContracts.length ? ' · values not published' : ` · ${fmtMoney(totalContractValue)}${unpublishedValues ? ` (value not published for ${unpublishedValues})` : ''}`}{matchedFrameworks.length && matchedContracts.length ? ` · on ${matchedFrameworks.length} framework${matchedFrameworks.length === 1 ? '' : 's'}` : ''}</h2>
          <p style={{ fontSize: '15px', opacity: 0.75, marginBottom: '12px' }}>This donor name also appears as a supplier on Find a Tender, the government's register of public contracts. The match is an exact name overlap; no causal link is implied between the donations on this page and the contracts below.{matchedContracts.length > 0 ? ' Public bodies awarding the work:' : ''}</p>
          {matchedContracts.length > 0 && (
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
          )}
          {matchedFrameworks.length > 0 && (
            <p style={{ fontSize: '15px', marginBottom: '8px' }}>A framework&rsquo;s value is the most that every supplier on it could be paid: potential value, not spending. Framework values are listed below but are not added to the contract value.</p>
          )}
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
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {c.value == null ? 'Not published' : fmtMoney(c.value)}
                      {isFrameworkRow(c) && <span style={{ display: 'block', fontWeight: 'normal', fontSize: '14px' }}>framework maximum: potential value, not spending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/donations/government-contractors" style={{ fontSize: '15px', color: ACCENT, textDecoration: 'underline' }}>See every contractor that also donates &rarr;</Link>
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
                      {d.nature || 'n/a'}
                      {notes && <span style={{ display: 'block', fontSize: '14px', color: DANGER }}>{notes}</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(d.amount)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {d.ec_ref ? (
                        <a href={ecDonationSearchUrl(d.ec_ref)} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline' }}>{d.ec_ref} ↗</a>
                      ) : 'n/a'}
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
