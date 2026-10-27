// /organisations/[slug]/[dataset]: every donation, contract or grant linked to one organisation by Companies House
// number (report 71), newest first, all on one page (the longest list is 53 records). Meetings and lobbying are listed in full on /lobbying/<slug>.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { ecDonationSearchUrl } from '@/lib/ec-links';
import {
  DATASETS, getOrganisation, getOrgDonations, getOrgContracts, getOrgGrants, grantNavUrl, findTenderUrl, money, fmtDay, buyerLabel,
  type Dataset,
} from '@/lib/organisations';

export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.22)';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';
const TITLES: Record<Dataset, string> = { donations: 'Political donations', contracts: 'Public contracts', grants: 'Government grants' };

const isDataset = (d: string): d is Dataset => (DATASETS as readonly string[]).includes(d);

export async function generateMetadata({ params }: { params: Promise<{ slug: string; dataset: string }> }): Promise<Metadata> {
  const { slug, dataset } = await params;
  if (!isDataset(dataset)) return { title: 'Not found' };
  const org = await getOrganisation(slug);
  if (!org) return { title: 'Organisation not found' };
  return {
    title: `${org.name}: ${TITLES[dataset].toLowerCase()}`.slice(0, 70),
    description: `Every ${TITLES[dataset].toLowerCase().replace(/s$/, '')} record linked to ${org.name} by Companies House number, newest first, with links to the official records.`,
    alternates: { canonical: `/organisations/${org.slug}/${dataset}` },
  };
}

export default async function OrganisationDatasetPage({ params }: { params: Promise<{ slug: string; dataset: string }> }) {
  const { slug, dataset } = await params;
  if (!isDataset(dataset)) notFound();
  const org = await getOrganisation(slug);
  if (!org || !org.company_number) notFound();

  const rows = dataset === 'donations' ? await getOrgDonations(org)
    : dataset === 'contracts' ? await getOrgContracts(org.company_number)
    : await getOrgGrants(org);
  if (rows.length === 0) notFound();
  const shown = rows;

  return (
    <OpenGovShell pageStamp="Organisations">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Organisations', path: '/organisations' }, { name: org.name, path: `/organisations/${org.slug}` }, { name: TITLES[dataset], path: `/organisations/${org.slug}/${dataset}` }])} />
      <BackLink fallbackHref={`/organisations/${org.slug}`} label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <nav aria-label="Breadcrumb" style={{ fontFamily: FONT, fontSize: '15px', marginBottom: '14px', overflowWrap: 'anywhere' }}>
        <Link href="/" style={{ color: INK }}>Home</Link> › <Link href="/organisations" style={{ color: INK }}>Organisations</Link> › <Link href={`/organisations/${org.slug}`} style={{ color: INK }}>{org.name}</Link> › <span aria-current="page">{TITLES[dataset]}</span>
      </nav>
      <header style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 'bold', lineHeight: 1.2, margin: '0 0 8px', overflowWrap: 'anywhere' }}>{org.name}: {TITLES[dataset].toLowerCase()}</h1>
        <p style={para}>
          {rows.length.toLocaleString('en-GB')} record{rows.length === 1 ? '' : 's'} linked by Companies House number {org.company_number}, newest first.
          {dataset === 'contracts' && ' Framework values are maximums, not spending.'}
          {dataset === 'donations' && ' Returned, forfeited or deferred donations are marked and are not counted in the totals.'}
        </p>
      </header>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${HAIRLINE}`, fontFamily: FONT }}>
        {dataset === 'donations' && (shown as Awaited<ReturnType<typeof getOrgDonations>>).map((d) => (
          <li key={d.id} style={item}>
            <span style={{ fontWeight: 'bold' }}>{fmtDay(d.accepted_date || d.received_date)}</span> · {d.amount != null ? money(d.amount) : 'value not given'} to {d.recipient_name || 'a recipient not named'}{d.donation_action ? ` (${d.donation_action.toLowerCase()})` : ''}
            <div style={sub}>
              {[d.donation_type_label || d.nature, `given as “${d.donor_name}”`].filter(Boolean).join(' · ')}
              {d.ec_ref && <> · <a href={ecDonationSearchUrl(d.ec_ref)} rel="noopener" style={{ color: ACCENT }}>Electoral Commission record {d.ec_ref}</a></>}
            </div>
          </li>
        ))}
        {dataset === 'contracts' && (shown as Awaited<ReturnType<typeof getOrgContracts>>).map((c) => (
          <li key={c.id} style={item}>
            <span style={{ fontWeight: 'bold' }}>{fmtDay(c.awarded_date)}</span> · {c.is_framework ? `framework, up to ${c.value != null ? money(c.value) : 'a value not published'}` : c.value != null ? money(c.value) : 'value not published'} · {buyerLabel(c.dept_slug)}
            <div style={sub}>
              {c.title || 'Untitled contract'} · supplier named as “{c.supplier}”
              {c.ocid && <> · <a href={findTenderUrl(c.ocid)} rel="noopener" style={{ color: ACCENT }}>Find a Tender record</a></>}
            </div>
          </li>
        ))}
        {dataset === 'grants' && (shown as Awaited<ReturnType<typeof getOrgGrants>>).map((g) => (
          <li key={g.identifier} style={item}>
            <span style={{ fontWeight: 'bold' }}>{fmtDay(g.award_date)}</span> · {g.amount != null ? money(g.amount) : 'value not given'} from {g.funder_name || 'a funder not named'}
            <div style={sub}>
              {g.title || g.scheme_title || 'Untitled grant'}{g.recipient_name ? ` · recipient named as “${g.recipient_name}”` : ''} · <a href={grantNavUrl(g.identifier)} rel="noopener" style={{ color: ACCENT }}>360Giving record</a>
            </div>
          </li>
        ))}
      </ol>

      <p style={{ ...para, marginTop: '24px' }}><Link href={`/organisations/${org.slug}`} style={{ color: ACCENT }}>Back to {org.name}</Link></p>
    </OpenGovShell>
  );
}

const para: React.CSSProperties = { fontFamily: FONT, fontSize: '15px', lineHeight: 1.7, color: INK, maxWidth: '46em', margin: 0 };
const item: React.CSSProperties = { padding: '9px 0', borderBottom: `1px solid ${HAIRLINE}`, fontSize: '15px', lineHeight: 1.5, overflowWrap: 'anywhere' };
const sub: React.CSSProperties = { fontSize: '15px', marginTop: '2px' };
