// /organisations: every organisation page (report 71), searchable by name, other spellings or Companies House number.
// Read from organisation_index (migration 2026-10-27c) through the hour cached list in lib/organisations.ts.

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ArticleEndSignup from '../components/ArticleEndSignup';
import { DATA_SIGNUP_LINE } from '@/lib/signup-lines';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { cachedOrganisationList, searchOrganisations, normaliseCompanyNumber, type OrgListRow } from '@/lib/organisations';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Organisations: donations, contracts, grants and lobbying',
  description: PAGE_DESCRIPTIONS['/organisations'],
  alternates: { canonical: '/organisations' },
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.22)';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';
const PER_PAGE = 100;

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

export default async function OrganisationsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const all = await cachedOrganisationList();

  // An exact Companies House number with a page goes straight to it.
  const number = q ? normaliseCompanyNumber(q) : null;
  if (number) {
    const hit = all.find((r) => r.company_number === number);
    if (hit) redirect(`/organisations/${hit.slug}`);
  }

  const list = q ? searchOrganisations(all, q) : [...all].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const href = (p: number) => `/organisations?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`.replace(/\?$/, '');
  const companies = all.filter((r) => r.kind === 'company').length;

  return (
    <OpenGovShell pageStamp="Organisations">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', marginBottom: '12px', lineHeight: 1.1 }}>Organisations</h1>
        <p style={{ fontSize: '16px', lineHeight: 1.75, maxWidth: '46em', margin: 0 }}>
          {all.length.toLocaleString('en-GB')} organisations, each on one page with its political donations, public contracts,
          government grants, meetings with ministers and consultant lobbying. {(all.length - companies).toLocaleString('en-GB')} come
          from our checked lobbying registry and {companies.toLocaleString('en-GB')} are companies whose Companies House number
          appears in two or more of the donations, contracts and grants records. Records are matched by Companies House number
          and the checked lobbying list, never by name alone. Public bodies and universities are not included.
        </p>
      </header>

      <form method="get" action="/organisations" role="search" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '0 0 18px', padding: '14px 0', borderTop: `1px solid ${HAIRLINE}`, borderBottom: `1px solid ${HAIRLINE}` }}>
        <label htmlFor="org-q" style={{ fontFamily: FONT, fontSize: '15px', width: '100%' }}>Name or Companies House number</label>
        <input id="org-q" name="q" type="search" defaultValue={q} autoComplete="off"
          style={{ flex: '1 1 200px', minWidth: 0, fontFamily: FONT, fontSize: '16px', color: INK, background: '#f4e8d4', border: `1px solid ${INK}`, padding: '8px 10px', boxSizing: 'border-box' }} />
        <button type="submit" style={{ fontFamily: FONT, fontSize: '16px', padding: '8px 16px', border: `1px solid ${ACCENT}`, background: ACCENT, color: '#f4efe6', cursor: 'pointer' }}>Search</button>
      </form>

      <p style={{ fontFamily: FONT, fontSize: '15px', margin: '0 0 10px' }}>
        {q ? `${list.length.toLocaleString('en-GB')} match${list.length === 1 ? '' : 'es'} for “${q}”` : 'A to Z'}{pages > 1 ? `, page ${page} of ${pages}` : ''}
        {q && <> · <Link href="/organisations" style={{ color: ACCENT }}>Clear</Link></>}
      </p>
      {q && list.length === 0 && <p style={{ fontFamily: FONT, fontSize: '15px' }}>No organisation page matches. Try a shorter name, or a donor search on <Link href={`/search?q=${encodeURIComponent(q)}`} style={{ color: ACCENT }}>the site search</Link>.</p>}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${HAIRLINE}` }}>
        {shown.map((r) => (
          <li key={r.slug} style={{ padding: '10px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
            <Link href={`/organisations/${r.slug}`} className="no-hover-scale" style={{ color: INK, fontWeight: 'bold', fontSize: '16px', textDecoration: 'none', overflowWrap: 'anywhere' }}>{r.name}</Link>
            <div style={{ fontFamily: FONT, fontSize: '15px', marginTop: '3px', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              {r.company_number ? `Companies House ${r.company_number} · ` : ''}{datasetsLine(r)}
            </div>
          </li>
        ))}
      </ol>

      {pages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '24px', fontFamily: FONT, fontSize: '15px' }}>
          {page > 1 && <Link href={href(page - 1)} style={pager}>← Previous</Link>}
          <span style={pager}>{page} / {pages}</span>
          {page < pages && <Link href={href(page + 1)} style={pager}>Next →</Link>}
        </nav>
      )}

      <ArticleEndSignup source="data-organisations" line={DATA_SIGNUP_LINE} />
    </OpenGovShell>
  );
}

const pager: React.CSSProperties = { padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' };
