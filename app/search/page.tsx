import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import SearchInput from './SearchInput';
import SignupNote from './SignupNote';
import { SEARCH_NOTE_JS } from '@/lib/search-note';
import { searchContent, searchCouncils, isPhrase, PHRASE_LIMIT, TOTAL_LIMIT, type SearchResult, type CouncilSearchResult } from '@/lib/search-content';
import { searchDonorNames, type DonorNameResult } from '@/lib/donor-search';
import { cachedOrganisationList, searchOrganisations, type OrgListRow } from '@/lib/organisations';

export const dynamic = 'force-dynamic';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.15)';
const MONO = "var(--font-special-elite), monospace";

const TYPE_META: Record<string, { label: string; color: string }> = {
  editorial:    { label: 'Report',        color: '#7a1612' },
  pressRelease: { label: 'Release',       color: '#1a5c36' },
  briefing:     { label: 'Report',        color: '#1a3a6e' },
  bill:         { label: 'Bill',          color: '#5c2a7a' },
  division:     { label: 'Division',      color: '#7a5c12' },
  mp:           { label: 'MP',            color: '#3a3a3a' },
};
const COUNCIL_META = { label: 'Council', color: '#1a5c5c' };

const POPULAR = [
  'knife crime', 'small boats', 'NHS', 'energy bills',
  'income tax', 'immigration', 'renters', 'grooming gangs',
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ResultRow({ r }: { r: SearchResult }) {
  const meta = TYPE_META[r.type] ?? { label: r.type, color: '#3a3a3a' };
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '14px',
            letterSpacing: '0.1em',
            color: meta.color,
            border: `1px solid ${meta.color}`,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: '3px',
            textTransform: 'uppercase',
          }}
        >
          {meta.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link
            href={r.url}
            style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: INK,
              textDecoration: 'none',
              lineHeight: 1.4,
              marginBottom: r.standfirst ? '4px' : 0,
            }}
          >
            {r.title}
          </Link>
          {r.standfirst && (
            <p style={{ fontSize: '14px', color: '#14100d', margin: '0 0 5px', lineHeight: 1.55 }}>
              {r.standfirst.length > 200 ? r.standfirst.slice(0, 200) + '…' : r.standfirst}
            </p>
          )}
          {r.type === 'editorial' && (
            <Link href={r.url} style={{ display: 'block', fontSize: '15px', color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px', margin: '0 0 5px' }}>
              Continue to full article
            </Link>
          )}
          <span style={{ fontFamily: MONO, fontSize: '14px', color: '#14100d' }}>
            {r.date ? fmtDate(r.date) : ''}
            {r.kicker       ? (r.date ? ` · ${r.kicker}` : r.kicker) : ''}
            {r.org          ? (r.date ? ` · ${r.org}`    : r.org)    : ''}
            {r.constituency && r.party
              ? ` · ${r.constituency} · ${r.party}`
              : r.constituency ?? r.party ?? ''}
          </span>
        </div>
      </div>
    </li>
  );
}

// A council profile, in the same row style as the other results.
function CouncilRow({ c }: { c: CouncilSearchResult }) {
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '15px',
            letterSpacing: '0.1em',
            color: COUNCIL_META.color,
            border: `1px solid ${COUNCIL_META.color}`,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: '3px',
            textTransform: 'uppercase',
          }}
        >
          {COUNCIL_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/councils/${c.slug}`}
            style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4 }}
          >
            {c.name}
          </Link>
          {(c.typeLabel || c.country) && (
            <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d' }}>
              {[c.typeLabel, c.country].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

// A donor name, in the same row style as the other results: the name as registered and its record count.
const DONORS_SHOWN = 10;
const DONOR_META = { label: 'Donor', color: '#5c3a1a' };
function DonorRow({ d }: { d: DonorNameResult }) {
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '15px',
            letterSpacing: '0.1em',
            color: DONOR_META.color,
            border: `1px solid ${DONOR_META.color}`,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: '3px',
            textTransform: 'uppercase',
          }}
        >
          {DONOR_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/donors/${d.slug}`}
            style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4, overflowWrap: 'anywhere' }}
          >
            {d.name}
          </Link>
          <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d' }}>
            {d.records.toLocaleString('en-GB')} donation record{d.records === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </li>
  );
}

// An organisation page (report 71): name, Companies House number and what the page holds.
const ORGS_SHOWN = 10;
const ORG_META = { label: 'Organisation', color: '#3a4a1a' };
function OrgRow({ o }: { o: OrgListRow }) {
  const held = [o.donations && 'donations', (o.contracts || o.framework_places) && 'contracts', o.grants && 'grants', o.meetings && 'meetings with ministers', o.lobbying_quarters && 'lobbying'].filter(Boolean).join(', ');
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '15px',
            letterSpacing: '0.1em',
            color: ORG_META.color,
            border: `1px solid ${ORG_META.color}`,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: '3px',
            textTransform: 'uppercase',
          }}
        >
          {ORG_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/organisations/${o.slug}`}
            style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4, overflowWrap: 'anywhere' }}
          >
            {o.name}
          </Link>
          <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', overflowWrap: 'anywhere' }}>
            {[o.company_number && `Companies House ${o.company_number}`, held].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
    </li>
  );
}

type PageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    dept?: string;
    from?: string;
    to?: string;
    sort?: string;
  }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const sp   = await searchParams;
  const q    = (sp.q    ?? '').trim();
  const type = sp.type  ?? 'all';
  const dept = sp.dept  ?? null;
  const from = sp.from  ?? null;
  const to   = sp.to    ?? null;
  const sort = (sp.sort === 'newest' ? 'newest' : 'relevance') as 'relevance' | 'newest';

  // Councils are their own group, shown with All selected; a department or date filter does not apply to them.
  const wantCouncils = q.length >= 2 && type === 'all' && !dept && !from && !to;
  // Donor names (24 Oct 2026): the same rule as councils. Name matches only, linked when the donor page exists
  // (lib/donor-search.ts); the first DONORS_SHOWN, with the full list on /donors.
  // Organisations (report 71): the same rule; the first ORGS_SHOWN, with the rest on /organisations.
  const [results, councils, donorSearch, orgList]: [SearchResult[], CouncilSearchResult[], { results: DonorNameResult[]; more: boolean; totalNames: number }, OrgListRow[]] = q.length >= 2
    ? await Promise.all([
        searchContent(q, type, dept, from, to, sort),
        wantCouncils ? searchCouncils(q) : Promise.resolve([]),
        wantCouncils ? searchDonorNames(q) : Promise.resolve({ results: [], more: false, totalNames: 0 }),
        wantCouncils ? cachedOrganisationList() : Promise.resolve([]),
      ])
    : [[], [], { results: [], more: false, totalNames: 0 }, []];
  const orgMatches = orgList.length ? searchOrganisations(orgList, q) : [];
  const orgs = orgMatches.slice(0, ORGS_SHOWN);
  const linkedDonors = donorSearch.results.filter((d) => d.slug);
  const donors = linkedDonors.slice(0, DONORS_SHOWN);

  return (
    <OpenGovShell pageStamp="Search">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          marginTop: '-6%', marginBottom: '12px',
          color: INK, textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 46px)',
          fontWeight: 'bold',
          letterSpacing: '-0.02em',
          marginBottom: '10px',
          transform: 'rotate(-0.3deg)',
          textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
        }}>
          Search
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: '#14100d' }}>
          Reports, press releases, bills, votes, MPs, councils, donors and organisations, searched together.
        </p>
      </header>

      {/* key remounts on q|type change so useState reinitialises with the current URL value */}
      <SearchInput key={q + '|' + type + '|' + (dept ?? '') + '|' + sort} defaultQ={q} defaultType={type} defaultDept={dept ?? ''} defaultSort={sort} />

      {/* The sign up note (lib/search-note.ts): its script runs straight after it, so on a full load it is shown or
          left hidden before the results are painted. */}
      <style>{'.og-snote{display:none;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 18px;padding:10px 12px;border:1px solid rgba(20,16,13,0.25);background:rgba(255,255,255,0.18);font-size:15px;line-height:1.5}.og-snote[data-show="1"]{display:flex}.og-snote-x{flex:none;min-width:32px;min-height:32px;background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:#14100d}.og-snote-x:focus-visible{outline:2px solid #7a1612;outline-offset:2px}'}</style>
      <SignupNote q={q} returnTo={'/search' + (q ? `?q=${encodeURIComponent(q)}` : '')} />
      <script dangerouslySetInnerHTML={{ __html: `${SEARCH_NOTE_JS}window.__ogNoteSearch(${JSON.stringify(q)});` }} />

      {q.length >= 2 && results.length === 0 && councils.length === 0 && donors.length === 0 && orgs.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', color: INK, marginBottom: '6px' }}>No results for &ldquo;{q}&rdquo;</p>
          <p style={{ fontSize: '14px', color: '#14100d' }}>
            Try different keywords, or{' '}
            <Link href="/departments" style={{ color: ACCENT }}>browse departments</Link>
          </p>
        </div>
      )}

      {councils.length > 0 && (
        <section aria-labelledby="search-councils" style={{ marginBottom: '28px' }}>
          <h2 id="search-councils" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Councils · {councils.length}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {councils.map((c) => <CouncilRow key={c.slug} c={c} />)}
          </ul>
        </section>
      )}

      {orgs.length > 0 && (
        <section aria-labelledby="search-orgs" style={{ marginBottom: '28px' }}>
          <h2 id="search-orgs" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Organisations · {orgMatches.length.toLocaleString('en-GB')}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {orgs.map((o) => <OrgRow key={o.slug} o={o} />)}
          </ul>
          {orgMatches.length > orgs.length && (
            <p style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
              <Link href={`/organisations?q=${encodeURIComponent(q)}`} style={{ color: ACCENT }}>All organisations matching &ldquo;{q}&rdquo;</Link>
            </p>
          )}
        </section>
      )}

      {donors.length > 0 && (
        <section aria-labelledby="search-donors" style={{ marginBottom: '28px' }}>
          <h2 id="search-donors" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Donor names (as registered with the Electoral Commission) · {(donorSearch.more ? donorSearch.totalNames : linkedDonors.length).toLocaleString('en-GB')}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {donors.map((d) => <DonorRow key={d.slug} d={d} />)}
          </ul>
          {(linkedDonors.length > donors.length || donorSearch.more) && (
            <p style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
              <Link href={`/donors?q=${encodeURIComponent(q)}`} style={{ color: ACCENT }}>All donor names matching &ldquo;{q}&rdquo;</Link>
            </p>
          )}
        </section>
      )}

      {results.length > 0 && (
        <section>
          <p style={{ fontFamily: MONO, fontSize: '14px', color: '#14100d', marginBottom: '12px' }}>
            {results.length >= (isPhrase(q) ? PHRASE_LIMIT : TOTAL_LIMIT) ? `${isPhrase(q) ? PHRASE_LIMIT : TOTAL_LIMIT}+ results` : `${results.length} result${results.length === 1 ? '' : 's'}`}
            {type !== 'all' && ` · ${type === 'editorial' || type === 'briefing' ? 'Reports' : TYPE_META[type]?.label ?? type} only`}
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((r, i) => <ResultRow key={i} r={r} />)}
          </ol>
        </section>
      )}

      {!q && (
        <div>
          <p style={{ fontFamily: MONO, fontSize: '14px', color: '#14100d', marginBottom: '12px', letterSpacing: '0.05em' }}>
            POPULAR SEARCHES
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {POPULAR.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                style={{
                  padding: '6px 13px',
                  fontFamily: MONO,
                  fontSize: '14px',
                  color: '#14100d',
                  border: `1px solid ${HAIRLINE}`,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      )}
    </OpenGovShell>
  );
}
