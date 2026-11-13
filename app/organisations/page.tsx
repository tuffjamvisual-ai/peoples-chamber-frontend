// /organisations: every organisation page (report 71), searchable by name, other spellings or Companies House number.
// Read from organisation_index (migration 2026-10-27c) through the hour cached list in lib/organisations.ts.

import NoJsPager from '@/app/components/NoJsPager';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { cachedOrganisationList, searchOrganisations, normaliseCompanyNumber, companiesHouseUrl, type OrgListRow } from '@/lib/organisations';
import { phoneUpTo } from '@/lib/breakpoints';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Organisations: donations, contracts, grants and lobbying' },
  description: PAGE_DESCRIPTIONS['/organisations'],
  alternates: { canonical: '/organisations' },
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.22)';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';
const PER_PAGE = 100;

// Filter buttons, shown under 640px only (owner, 4 Nov 2026), in the address as ?has=. Contracts include framework places, as the counts do.
const FILTERS: { key: string; label: string; has: (r: OrgListRow) => boolean }[] = [
  { key: 'contracts', label: 'Contracts', has: (r: OrgListRow) => r.contracts + r.framework_places > 0 },
  { key: 'donations', label: 'Donations', has: (r: OrgListRow) => r.donations > 0 },
  { key: 'grants', label: 'Grants', has: (r: OrgListRow) => r.grants > 0 },
  { key: 'meetings', label: 'Ministerial meetings', has: (r: OrgListRow) => r.meetings > 0 },
  { key: 'lobbying', label: 'Lobbying', has: (r: OrgListRow) => r.lobbying_quarters > 0 },
];

// Phones: the counts alone on one line, for example "12 contracts · 3 donations · 5 meetings" (owner, 4 Nov 2026).
function phoneCountsLine(r: OrgListRow): string {
  const count = (n: number, one: string) => (n ? `${n.toLocaleString('en-GB')} ${one}${n === 1 ? '' : 's'}` : '');
  return [count(r.contracts + r.framework_places, 'contract'), count(r.donations, 'donation'), count(r.grants, 'grant'), count(r.meetings, 'meeting'), count(r.lobbying_quarters, 'lobbying quarter')].filter(Boolean).join(' · ');
}

function datasetsLine(r: OrgListRow): string {
  const parts: string[] = [];
  if (r.donations) parts.push(`${r.donations.toLocaleString('en-GB')} donation${r.donations === 1 ? '' : 's'}`);
  const c = r.contracts + r.framework_places;
  if (c) parts.push(`${c.toLocaleString('en-GB')} contract${c === 1 ? '' : 's'}`);
  if (r.grants) parts.push(`${r.grants.toLocaleString('en-GB')} grant${r.grants === 1 ? '' : 's'}`);
  if (r.meetings) parts.push(`${r.meetings.toLocaleString('en-GB')} meeting${r.meetings === 1 ? '' : 's'} with ministers`);
  if (r.lobbying_quarters) parts.push(`${r.lobbying_quarters.toLocaleString('en-GB')} lobbying quarter${r.lobbying_quarters === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export default async function OrganisationsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; has?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const filter = FILTERS.find((f) => f.key === sp.has) ?? null;
  const all = await cachedOrganisationList();

  // An exact Companies House number with a page goes straight to it.
  const number = q ? normaliseCompanyNumber(q) : null;
  if (number) {
    const hit = all.find((r) => r.company_number === number);
    if (hit) redirect(`/organisations/${hit.slug}`);
  }

  const found = q ? searchOrganisations(all, q) : [...all].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
  const list = filter ? found.filter(filter.has) : found;
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const link = (o: { q?: string; has?: string; page?: number }) => `/organisations?${new URLSearchParams({ ...(o.q ? { q: o.q } : {}), ...(o.has ? { has: o.has } : {}), ...(o.page && o.page > 1 ? { page: String(o.page) } : {}) }).toString()}`.replace(/\?$/, '');
  const href = (p: number) => link({ q, has: filter?.key, page: p });
  const companies = all.filter((r) => r.kind === 'company').length;

  return (
    <OpenGovShell>
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', marginBottom: '12px', lineHeight: 1.1 }}>Organisations</h1>
        <p className="org-intro-wide" style={{ fontSize: '16px', lineHeight: 1.75, maxWidth: '46em', margin: 0 }}>
          {all.length.toLocaleString('en-GB')} organisations, each on one page with its political donations, public contracts,
          government grants, meetings with ministers and consultant lobbying. {(all.length - companies).toLocaleString('en-GB')} come
          from our checked lobbying registry and {companies.toLocaleString('en-GB')} are companies whose Companies House number
          appears in two or more of the donations, contracts and grants records. Records are matched by Companies House number
          and the checked lobbying list, never by name alone. Public bodies and universities are not included.
        </p>
      </header>

      <form method="get" action="/organisations" role="search" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '0 0 18px', padding: '14px 0', borderTop: `1px solid ${HAIRLINE}`, borderBottom: `1px solid ${HAIRLINE}` }}>
        <label htmlFor="org-q" style={{ fontFamily: FONT, fontSize: '15px', width: '100%' }}>Name or Companies House number</label>
        {filter && <input type="hidden" name="has" value={filter.key} />}
        <input data-main-action id="org-q" name="q" type="search" defaultValue={q} autoComplete="off"
          style={{ flex: '1 1 200px', minWidth: 0, fontFamily: FONT, fontSize: '16px', color: INK, background: '#f4e8d4', border: `1px solid ${INK}`, padding: '8px 10px', boxSizing: 'border-box' }} />
        <button type="submit" style={{ fontFamily: FONT, fontSize: '16px', padding: '8px 16px', border: `1px solid ${ACCENT}`, background: ACCENT, color: '#f4efe6', cursor: 'pointer' }}>Search</button>
      </form>

      {/* Under 640px only: from 640px up the page is as it was. */}
      <style>{`.org-filters, .org-phone { display: none; } @media ${phoneUpTo(767.98)} { .org-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; } .org-phone { display: block; } .org-wide { display: none; } }`}</style>
      <nav className="org-filters" aria-label="Filter organisations">
        {[{ key: '', label: 'All' }, ...FILTERS].map((f) => {
          const on = (filter?.key ?? '') === f.key;
          return (
            <Link key={f.key || 'all'} href={link({ q, has: f.key })} aria-current={on ? 'true' : undefined} className="no-hover-scale"
              style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', boxSizing: 'border-box', padding: '0 14px', fontFamily: FONT, fontSize: '15px', textDecoration: 'none', border: `1px solid ${INK}`, background: on ? INK : 'transparent', color: on ? '#f4efe6' : INK }}>
              {f.label}
            </Link>
          );
        })}
      </nav>

      {/* Under 640px (owner, 4 Nov 2026): the search and filters first, the introduction folded after them. */}
      <style>{`.org-about { display: none; } @media ${phoneUpTo(767.98)} { .org-intro-wide { display: none; } .org-about { display: block; margin: 0 0 16px; } .org-about summary { display: flex; align-items: center; justify-content: space-between; min-height: 48px; padding: 0 12px; box-sizing: border-box; border: 1px solid ${INK}; font-family: var(--font-special-elite), monospace; font-size: 15px; font-weight: bold; cursor: pointer; list-style: none; } .org-about summary::-webkit-details-marker { display: none; } }`}</style>
      <details className="org-about">
        <summary>About this list<span className="og-fold-mark" aria-hidden="true" /></summary>
        <p style={{ margin: '8px 0 0' }}>
          {all.length.toLocaleString('en-GB')} organisations, each on one page with its political donations, public contracts,
          government grants, meetings with ministers and consultant lobbying. {(all.length - companies).toLocaleString('en-GB')} come
          from our checked lobbying registry and {companies.toLocaleString('en-GB')} are companies whose Companies House number
          appears in two or more of the donations, contracts and grants records. Records are matched by Companies House number
          and the checked lobbying list, never by name alone. Public bodies and universities are not included.
        </p>
      </details>

      <p style={{ fontFamily: FONT, fontSize: '15px', margin: '0 0 10px' }}>
        {q ? `${list.length.toLocaleString('en-GB')} match${list.length === 1 ? '' : 'es'} for “${q}”` : `A to Z${filter ? `, ${list.length.toLocaleString('en-GB')} with ${filter.label.toLowerCase()}` : ''}`}{pages > 1 ? `, page ${page} of ${pages}` : ''}
        {q && <> · <Link href={link({ has: filter?.key })} style={{ color: ACCENT }}>Clear</Link></>}
      </p>
      {!q && list.length === 0 && <p style={{ fontFamily: FONT, fontSize: '15px' }}>No organisation has this connection.</p>}
      {q && list.length === 0 && <p style={{ fontFamily: FONT, fontSize: '15px' }}>No organisation page matches. Try a shorter name, or a donor search on <Link href={`/search?q=${encodeURIComponent(q)}`} style={{ color: ACCENT }}>the site search</Link>.</p>}

      <NoJsPager id="orgs-rows" count={(shown).length} rows="> li" size={25}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${HAIRLINE}` }}>
        {shown.map((r) => (
          <li key={r.slug} style={{ padding: '10px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
            <Link href={`/organisations/${r.slug}`} className="no-hover-scale" style={{ color: INK, fontWeight: 'bold', fontSize: '16px', textDecoration: 'none', overflowWrap: 'anywhere' }}>{r.name}</Link>
            <div style={{ fontFamily: FONT, fontSize: '15px', marginTop: '3px', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              {/* No Companies House number shown (T1-NOCODE, owner approved 13 Nov 2026): a link to the same record instead. */}
              <span className="org-wide">{r.company_number && <><a data-og-row-source="" href={companiesHouseUrl(r.company_number)} target="_blank" rel="noopener noreferrer" aria-label={`View ${r.name} on Companies House`} style={{ color: INK, textDecoration: 'underline' }}>View on Companies House&nbsp;↗</a>{' · '}</>}{datasetsLine(r)}</span>
              {r.company_number && <span className="org-phone"><a data-og-row-source="" href={companiesHouseUrl(r.company_number)} target="_blank" rel="noopener noreferrer" aria-label={`View ${r.name} on Companies House`} style={{ color: INK, textDecoration: 'underline', display: 'inline-block', minHeight: '44px', lineHeight: '44px' }}>View on Companies House&nbsp;↗</a></span>}
              <span className="org-phone">{phoneCountsLine(r)}</span>
            </div>
          </li>
        ))}
      </ol>
      </NoJsPager>

      {pages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '24px', fontFamily: FONT, fontSize: '15px' }}>
          {page > 1 && <Link href={href(page - 1)} style={pager}>← Previous</Link>}
          <span style={pager}>{page} / {pages}</span>
          {page < pages && <Link href={href(page + 1)} style={pager}>Next →</Link>}
        </nav>
      )}

    </OpenGovShell>
  );
}

const pager: React.CSSProperties = { padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' };
