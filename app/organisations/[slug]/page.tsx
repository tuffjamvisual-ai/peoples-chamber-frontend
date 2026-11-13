// /organisations/[slug]: one organisation across the site's datasets (report 71). Donations, contracts and grants are
// linked by Companies House number only; meetings with ministers and consultant lobbying through the lobbying
// registry's checked spellings. Nothing by name alone. Summary figures from organisation_index (migration 2026-10-27c),
// the latest five records of each from the source tables (lib/organisations.ts). Rendered on demand, cached a day.

import { namedTitle } from '@/lib/seo-title';
import { countOf, ledBy } from '@/lib/meta-description';
import type { Metadata } from 'next';
import Link from 'next/link';
import PageSources from '@/app/components/PageSources';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import JsonLd, { buildBreadcrumbs, SITE } from '@/lib/JsonLd';
import { ORG_TYPE_LABEL, type OrgType } from '@/lib/lobbying-types';
import { cleanDept, quarterLabel } from '@/lib/lobbying';
import { ecDonationSearchUrl } from '@/lib/ec-links';
import {
  getOrganisation, orgNameShared, getOrgAlsoSee, getOrgDonations, getOrgContracts, getOrgHeldBack, getOrgGrants, getOrgRegistryRecords, companiesHouseUrl, grantNavUrl,
  findTenderUrl, money, fmtDay, buyerLabel, orgSummaryLine, nameNote, getOrgNameBasisNotices, type OrgIndexRow,
} from '@/lib/organisations';

export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.22)';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';
const LATEST = 5;

// Description in whole sentences within 160 characters (owner, 7 Nov 2026, L7), led by the largest record the page holds:
// public contracts, then framework places, grants, donations, meetings and lobbying, each from the organisation's own
// totals. The first sentence names the organisation in full; one too long for any lead gives the name alone.
function orgDescription(org: OrgIndexRow): string {
  const facts: ((s: string) => string)[] = [];
  if (org.contracts) facts.push((s) => `${s} was awarded ${countOf(org.contracts, 'public contract')}${org.contract_value ? ` worth ${money(org.contract_value)}` : ''}.`);
  else if (org.framework_places) facts.push((s) => `${s} holds ${countOf(org.framework_places, 'public framework place')}.`);
  if (org.grants) facts.push((s) => `${s} received ${countOf(org.grants, 'government grant')}${org.grant_value ? ` worth ${money(org.grant_value)}` : ''}.`);
  if (org.donations) facts.push((s) => `${s} gave ${countOf(org.donations, 'political donation')}${org.donated_accepted ? ` worth ${money(org.donated_accepted)}` : ''}, as accepted.`);
  if (org.meetings) facts.push((s) => `${s} had ${countOf(org.meetings, 'meeting')} with ministers.`);
  if (org.lobbying_quarters) facts.push((s) => `${s} was a consultant lobbying client in ${countOf(org.lobbying_quarters, 'quarter')}.`);
  // The matching sentence is left out (owner, 7 Nov 2026, L8): it does not help a searcher, and the page says how records are matched.
  return ledBy(org.name, facts.map((f) => f(org.name)), facts.slice(1).map((f) => f('It')));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganisation(slug);
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!org) notFound();
  const held = [org.donations && 'donations', (org.contracts || org.framework_places) && 'contracts', org.grants && 'grants', org.meetings && 'meetings with ministers', org.lobbying_quarters && 'lobbying'].filter(Boolean) as string[];
  const heldText = held.length > 1 ? `${held.slice(0, -1).join(', ')} and ${held[held.length - 1]}` : held[0] || 'public records';
  // With no number held, the type we hold.
  // T1-NOCODE (owner approved 13 Nov 2026): no Companies House number in the title ('Deloitte LLP', not 'Deloitte LLP (OC303675)').
  const tag = org.company_number ? null : org.org_type || (org.kind === 'registry' ? null : org.kind);
  const titleName = tag && (await orgNameShared(org.name, org.slug)) ? `${org.name} (${tag})` : org.name;
  const description = orgDescription(org);
  return {
    // Never the name alone, which its lobbying page could share (owner, 7 Nov 2026: titles stay unique). A name another page
    // shares adds the type we hold, never a Companies House number (T1-NOCODE).
    title: namedTitle(titleName, (n) => [`${n}: ${heldText}`, `${n}: public records`, `${n}: ${heldText}`]),
    description,
    alternates: { canonical: `/organisations/${org.slug}` },
    openGraph: { title: org.name, description, url: `${SITE}/organisations/${org.slug}`, type: 'website' },
    // ./opengraph-image.tsx fills og:image; the same address is given here so twitter:image points to it as well.
    twitter: { card: 'summary_large_image', title: org.name, description, images: [`${SITE}/organisations/${org.slug}/opengraph-image`] },
  };
}

export default async function OrganisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganisation(slug);
  if (!org) notFound();
  const [donations, contracts, grants, registry, heldBack, alsoSee, byName] = await Promise.all([
    org.donations ? getOrgDonations(org, LATEST) : Promise.resolve([]),
    org.contracts + org.framework_places ? getOrgContracts(org.company_number, LATEST) : Promise.resolve([]),
    org.grants ? getOrgGrants(org, LATEST) : Promise.resolve([]),
    getOrgRegistryRecords(org),
    // A failed read of the held back count shows no note rather than failing the page.
    org.contracts + org.framework_places ? getOrgHeldBack(org.company_number).catch((e) => {
      console.error(`/organisations/${org.slug} held back contracts:`, e instanceof Error ? e.message : String(e));
      return 0;
    }) : Promise.resolve(0),
    getOrgAlsoSee(org),
    getOrgNameBasisNotices(org.company_number),
  ]);
  const typeLabel = org.org_type ? ORG_TYPE_LABEL[org.org_type as OrgType] : 'Company';

  return (
    <OpenGovShell pageStamp="Organisations">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Organisations', path: '/organisations' }, { name: org.name, path: `/organisations/${org.slug}` }])} />
      <BackLink fallbackHref="/organisations" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <nav aria-label="Breadcrumb" style={{ fontFamily: FONT, fontSize: '15px', marginBottom: '14px', overflowWrap: 'anywhere' }}>
        <Link href="/" style={{ color: INK }}>Home</Link> › <Link href="/organisations" style={{ color: INK }}>Organisations</Link> › <span aria-current="page">{org.name}</span>
      </nav>

      <article style={{ color: INK, fontFamily: FONT }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', marginBottom: '4px' }}>Organisation · {typeLabel}</div>
          <h1 style={{ fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 500, lineHeight: 1.18, margin: 0, overflowWrap: 'anywhere' }}>{org.name}</h1>
          {nameNote(org) && <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '8px auto 0', maxWidth: '40em' }}>{nameNote(org)}</p>}
        </header>

        <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr)', gap: '6px 16px', fontSize: '15px', margin: '0 0 12px' }}>
          <dt style={{ fontWeight: 'bold' }}>Companies House</dt>
          <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>
            {/* No number shown (T1-NOCODE, owner approved 13 Nov 2026): a link to the same Companies House record. */}
            {org.company_number
              ? <a data-og-row-source="" href={companiesHouseUrl(org.company_number)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>View on Companies House ↗</a>
              : 'No number recorded'}
          </dd>
          {org.name_variants && org.name_variants.length > 0 && (<>
            <dt style={{ fontWeight: 'bold' }}>Also recorded as</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{org.name_variants.map((v) => `“${v}”`).join(', ')}</dd>
          </>)}
          {alsoSee && (<>
            <dt style={{ fontWeight: 'bold' }}>Also see</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}><Link href={`/organisations/${alsoSee.slug}`} style={{ color: ACCENT }}>{alsoSee.name}</Link></dd>
          </>)}
          {org.kind === 'registry' && (<>
            <dt style={{ fontWeight: 'bold' }}>Lobbying</dt>
            <dd style={{ margin: 0 }}><Link href={`/lobbying/${org.slug}`} style={{ color: ACCENT }}>Meetings and lobbying firms in full</Link></dd>
          </>)}
        </dl>
        <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 24px', maxWidth: '46em' }}>{orgSummaryLine(org)}</p>

        {org.kind === 'registry' && !org.company_number && (
          <p style={{ ...para, borderLeft: `3px solid ${HAIRLINE}`, paddingLeft: '12px' }}>
            The lobbying registry holds no Companies House number for this organisation yet, so political donations, public
            contracts and grants are not linked to it here. We link those by number only, never by name.
          </p>
        )}

        {org.donations > 0 && (
          <Section id="org-donations" title="Political donations">
            <p style={para}>
              <strong>{money(org.donated_accepted)}</strong> in {org.donations_accepted.toLocaleString('en-GB')} donation{org.donations_accepted === 1 ? '' : 's'} accepted
              {org.donations_not_accepted > 0 && <>, and {org.donations_not_accepted.toLocaleString('en-GB')} returned, forfeited or deferred (not counted)</>}.
            </p>
            <ul style={list}>
              {donations.map((d) => (
                <li key={d.id} style={item}>
                  <span style={{ fontWeight: 'bold' }}>{fmtDay(d.accepted_date || d.received_date)}</span> · {d.amount != null ? money(d.amount) : 'value not given'} to {d.recipient_name || 'a recipient not named'}
                  {d.donation_action ? ` (${d.donation_action.toLowerCase()})` : ''}
                  <div style={sub}>
                    {[d.donation_type_label || d.nature, d.donor_name !== org.name ? `given as “${d.donor_name}”` : null].filter(Boolean).join(' · ')}
                    {d.ec_ref && <> · <a data-og-row-source="" href={ecDonationSearchUrl(d.ec_ref)} rel="noopener" style={{ color: ACCENT }}>Electoral Commission record</a></>}
                  </div>
                </li>
              ))}
            </ul>
            {org.donations > donations.length && <SeeAll href={`/organisations/${org.slug}/donations`} text={`All ${org.donations.toLocaleString('en-GB')} donation records`} />}
          </Section>
        )}

        {org.contracts + org.framework_places > 0 && (
          <Section id="org-contracts" title="Public contracts">
            {/* Counted once per contract (OCID, award and supplier; contract_awards, owner's yes, 3 Nov 2026). */}
            <p style={para}>
              {org.contracts > 0 && <><strong>{money(org.contract_value)}</strong> awarded across {org.contracts.toLocaleString('en-GB')} contract{org.contracts === 1 ? '' : 's'} since July 2023 (Find a Tender)
                {org.contracts_unpublished > 0 && <> ({org.contracts_unpublished.toLocaleString('en-GB')} with no value published, not counted)</>}. </>}
              {org.contracts === 0 && <>Since July 2023 (Find a Tender): </>}
              {org.framework_places > 0 && <>{org.framework_places.toLocaleString('en-GB')} framework place{org.framework_places === 1 ? '' : 's'}.</>}
              {heldBack > 0 && <> {heldBack.toLocaleString('en-GB')} very large value{heldBack === 1 ? '' : 's'} (over £1 billion each) held back until checked.</>}
            </p>
            <ul style={list}>
              {contracts.map((c) => (
                <li key={c.id} style={item}>
                  <span style={{ fontWeight: 'bold' }}>{fmtDay(c.awarded_date)}</span> · {c.is_framework ? `framework, up to ${c.value != null ? money(c.value) : 'a value not published'}` : c.value != null ? money(c.value) : 'value not published'} · {buyerLabel(c.dept_slug)}
                  <div style={sub}>
                    {c.title || 'Untitled contract'}
                    {c.ocid && <> · <a data-og-row-source="" href={findTenderUrl(c.ocid)} rel="noopener" style={{ color: ACCENT }}>Find a Tender record</a></>}
                  </div>
                </li>
              ))}
            </ul>
            <p style={{ ...para, marginTop: '8px' }}>Joint awards are shared equally between suppliers. Framework ceilings and estimates are not added.</p>
            {org.contracts + org.framework_places > contracts.length && <SeeAll href={`/organisations/${org.slug}/contracts`} text={`All ${(org.contracts + org.framework_places).toLocaleString('en-GB')} contracts and framework places`} />}
          </Section>
        )}

        {org.grants > 0 && (
          <Section id="org-grants" title="Government grants">
            <p style={para}><strong>{money(org.grant_value)}</strong> grant value awarded in {org.grants.toLocaleString('en-GB')} grant{org.grants === 1 ? '' : 's'}.</p>
            <ul style={list}>
              {grants.map((g) => (
                <li key={g.identifier} style={item}>
                  <span style={{ fontWeight: 'bold' }}>{fmtDay(g.award_date)}</span> · {g.amount != null ? money(g.amount) : 'value not given'} from {g.funder_name || 'a funder not named'}
                  <div style={sub}>
                    {g.title || g.scheme_title || 'Untitled grant'} · <a data-og-row-source="" href={grantNavUrl(g.identifier)} rel="noopener" style={{ color: ACCENT }}>360Giving record</a>
                  </div>
                </li>
              ))}
            </ul>
            {org.grants > grants.length && <SeeAll href={`/organisations/${org.slug}/grants`} text={`All ${org.grants.toLocaleString('en-GB')} grants`} />}
          </Section>
        )}

        {org.meetings > 0 && (
          <Section id="org-meetings" title="Meetings with ministers">
            <p style={para}>{org.meetings.toLocaleString('en-GB')} published meeting{org.meetings === 1 ? '' : 's'} with UK ministers{org.last_meeting ? `, the latest on ${fmtDay(org.last_meeting)}` : ''}.</p>
            <ul style={list}>
              {registry.meetings.slice(0, LATEST).map((m) => (
                <li key={m.meeting_key} style={item}>
                  <span style={{ fontWeight: 'bold' }}>{m.meeting_date && !m.date_flag ? fmtDay(m.meeting_date) : m.meeting_date_raw ? `${m.meeting_date_raw} (as published)` : 'date not given'}</span> · {m.minister_name}{cleanDept(m.minister_dept) ? `, ${cleanDept(m.minister_dept)}` : ''}
                  <div style={sub}>{m.purpose || 'Purpose not published'}</div>
                </li>
              ))}
            </ul>
            {org.meetings > LATEST && <SeeAll href={`/lobbying/${org.slug}`} text={`All ${org.meetings.toLocaleString('en-GB')} meetings`} />}
          </Section>
        )}

        {org.lobbying_quarters > 0 && (
          <Section id="org-lobbying" title="Consultant lobbying">
            <p style={para}>Named as a client by {org.lobbying_firms.toLocaleString('en-GB')} lobbying firm{org.lobbying_firms === 1 ? '' : 's'} in {org.lobbying_quarters.toLocaleString('en-GB')} quarter{org.lobbying_quarters === 1 ? '' : 's'}{org.last_lobbying_quarter ? `, the latest ${quarterLabel(org.last_lobbying_quarter)}` : ''}.</p>
            <ul style={list}>
              {registry.lobbying.slice(0, LATEST).map((f) => (
                <li key={f.firm} style={item}>
                  <span style={{ fontWeight: 'bold' }}>{f.firm}</span>
                  <div style={sub}>{f.quarters.slice(0, 4).map((q) => q.label).join('; ')}{f.quarters.length > 4 ? ` and ${f.quarters.length - 4} more` : ''}</div>
                </li>
              ))}
            </ul>
            {registry.lobbying.length > LATEST && <SeeAll href={`/lobbying/${org.slug}`} text={`All ${registry.lobbying.length} lobbying firms`} />}
          </Section>
        )}

        <section aria-labelledby="org-matching" style={{ marginTop: '36px', borderTop: `1px solid ${HAIRLINE}`, paddingTop: '18px' }}>
          <h2 id="org-matching" style={head}>How we match records</h2>
          <p style={para}>
            Political donations, public contracts and grants are linked to this page by Companies House number only: the
            number the Electoral Commission, Find a Tender or the grant record gives, written the way Companies House writes
            it. Meetings with ministers and consultant lobbying are linked through our checked list of the spellings each
            organisation is published under.
            {/* A notice linked by the supplier name it prints, because its number exists on no Companies House register
                (lib/contract-notices.ts; owner, 7 Nov 2026, L8). */}
            {byName.map((n) => (
              <span key={n.url}>
                {' '}{byName.length === 1 ? 'One contract notice' : 'A contract notice'} gave a Companies House number that doesn&rsquo;t exist; it names the
                supplier as {n.name} and is included on that basis (<a data-og-row-source="" href={n.url} style={{ color: 'inherit', textDecoration: 'underline' }}>the notice on Find a Tender</a>).
              </span>
            ))}
            {' '}{byName.length ? 'Otherwise nothing' : 'Nothing'} is linked by name alone, so two organisations with the same name but
            different numbers have separate pages, and a record that gives no number is not shown here.
          </p>
          <p style={{ ...para, marginBottom: 0 }}>
            Sources: Electoral Commission donations register; Find a Tender; government grants published through
            360Giving; GOV.UK ministers&rsquo; meetings returns; Registrar of Consultant Lobbyists. All under the Open
            Government Licence v3.0. Figures updated {fmtDay(org.refreshed_at)}.
          </p>
        </section>
      </article>
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside. The company's Companies House record is in this one
          Sources fold; each donation's, contract's and grant's record stays on its row. */}
      <PageSources sources={[org.company_number && { label: `Companies House record for ${org.name}`, href: companiesHouseUrl(org.company_number) }]} />
    </OpenGovShell>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} style={{ marginBottom: '30px' }}>
      <h2 id={id} style={head}>{title}</h2>
      {children}
    </section>
  );
}

function SeeAll({ href, text }: { href: string; text: string }) {
  return <p style={{ ...para, marginTop: '10px' }}><Link href={href} className="og-tap" style={{ color: ACCENT }}>{text}</Link></p>;
}

const head: React.CSSProperties = { fontFamily: FONT, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', margin: '0 0 10px' };
const para: React.CSSProperties = { fontFamily: FONT, fontSize: '15px', lineHeight: 1.7, color: INK, maxWidth: '46em', margin: '0 0 10px' };
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${HAIRLINE}` };
const item: React.CSSProperties = { padding: '9px 0', borderBottom: `1px solid ${HAIRLINE}`, fontSize: '15px', lineHeight: 1.5, overflowWrap: 'anywhere' };
const sub: React.CSSProperties = { fontSize: '15px', marginTop: '2px' };

