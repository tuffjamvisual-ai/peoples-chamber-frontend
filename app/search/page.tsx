import NoJsPager from '@/app/components/NoJsPager';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import SearchInput from './SearchInput';
import SignupNote from './SignupNote';
import SaveSearchButton from './SaveSearchButton';
import SearchTracker from './SearchTracker';
import PhoneMore from '../components/PhoneMore';
import { SEARCH_NOTE_JS } from '@/lib/search-note';
import { searchContent, searchCouncils, searchConstituencies, searchPeers, isPhrase, PHRASE_LIMIT, TOTAL_LIMIT, type SearchResult, type CouncilSearchResult, type ConstituencySearchResult, type PeerSearchResult } from '@/lib/search-content';
import { searchDonorNames, type DonorNameResult } from '@/lib/donor-search';
import { suggestQuery } from '@/lib/search-suggest';
import { searchVocabulary } from '@/lib/search-vocabulary';
import { cachedOrganisationList, searchOrganisations, type OrgListRow } from '@/lib/organisations';
import { phoneUpTo, PHONE } from '@/lib/breakpoints';

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
  division:     { label: 'Commons vote',  color: '#7a5c12' },
  mp:           { label: 'MP',            color: '#14100d' },
};
const COUNCIL_META = { label: 'Council', color: '#1a5c5c' };
const SEAT_META = { label: 'Constituency', color: '#2a4a6e' };

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
  const meta = TYPE_META[r.type] ?? { label: r.type, color: '#14100d' };
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '15px',
            letterSpacing: '0.1em',
            color: INK,
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
            <p style={{ fontSize: '15px', color: '#14100d', margin: '0 0 5px', lineHeight: 1.55 }}>
              {r.standfirst.length > 200 ? r.standfirst.slice(0, 200) + '…' : r.standfirst}
            </p>
          )}
          {r.type === 'editorial' && (
            <Link href={r.url} style={{ display: 'block', fontSize: '15px', color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px', margin: '0 0 5px' }}>
              Continue to full article
            </Link>
          )}
          <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d' }}>
            {r.date ? `${r.dateLabel ? `${r.dateLabel} ` : ''}${fmtDate(r.date)}` : ''}
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
            color: INK,
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

// A constituency (UX1b), in the same row style: the seat, then its current MP as a second link.
function ConstituencyRow({ c }: { c: ConstituencySearchResult }) {
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '15px',
            letterSpacing: '0.1em',
            color: INK,
            border: `1px solid ${SEAT_META.color}`,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: '3px',
            textTransform: 'uppercase',
          }}
        >
          {SEAT_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/constituencies/${c.slug}`}
            style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4 }}
          >
            {c.name}
          </Link>
          <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d' }}>
            {c.mp ? (
              <>MP: <Link href={`/mps/${c.mp.memberId}`} className="og-tap" style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{c.mp.name}</Link>{c.mp.party ? ` · ${c.mp.party}` : ''}</>
            ) : 'No sitting MP'}
            {c.nation ? ` · ${c.nation}` : ''}
          </span>
        </div>
      </div>
    </li>
  );
}

// A donor name, in the same row style as the other results: the name as registered and its record count.
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
            color: INK,
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
            color: INK,
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

// A member of the House of Lords, in the same row style.
const PEER_META = { label: 'Peer', color: '#5a1a3a' };
function PeerRow({ p }: { p: PeerSearchResult }) {
  const external = p.href.startsWith('http');
  const link: React.CSSProperties = { display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4 };
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.1em', color: INK, border: `1px solid ${PEER_META.color}`, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '3px', textTransform: 'uppercase' }}>
          {PEER_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          {external
            ? <a href={p.href} target="_blank" rel="noopener noreferrer" style={link}>{p.name}</a>
            : <Link href={p.href} style={link}>{p.name}</Link>}
          <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d' }}>
            {[p.party, p.peerageType, !p.isCurrent && 'Former member', external && "Parliament's profile"].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
    </li>
  );
}

// The two groups of results (owner, 4 Nov 2026): the record itself, and what mentions the term.
const groupHeading: React.CSSProperties = { fontSize: '19px', fontWeight: 'bold', color: INK, margin: '0 0 2px' };
const groupNote: React.CSSProperties = { fontSize: '15px', color: INK, margin: '0 0 16px', lineHeight: 1.5 };
const RECORD_FILTERS = ['constituency', 'peer', 'council', 'organisation', 'donor'];
const FILTERED_SHOWN = 50;

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

const SEARCHED = 'Reports, press releases, bills, parliamentary votes, constituencies, MPs, peers, councils, donors and organisations, searched together.';

export default async function SearchPage({ searchParams }: PageProps) {
  const sp   = await searchParams;
  const q    = (sp.q    ?? '').trim();
  const type = sp.type  ?? 'all';
  const dept = sp.dept  ?? null;
  const from = sp.from  ?? null;
  const to   = sp.to    ?? null;
  const sort = (sp.sort === 'newest' ? 'newest' : 'relevance') as 'relevance' | 'newest';

  // Constituencies (UX1b), councils, peers, organisations and donors are shown with All selected, or alone with their own filter (owner,
  // 4 Nov 2026). A department or date filter does not apply to them. Donor names are name matches only, linked when
  // the donor page exists (lib/donor-search.ts). With All, the first few of each, and the full lists are on their pages.
  const inAll = q.length >= 2 && type === 'all' && !dept && !from && !to;
  const wants = (t: string) => q.length >= 2 && (inAll || type === t);
  const shown = type === 'all' ? 10 : FILTERED_SHOWN;
  const noDonors = { results: [] as DonorNameResult[], more: false, totalNames: 0 };
  const [allResults, seats, councils, peers, donorSearch, orgList]: [SearchResult[], ConstituencySearchResult[], CouncilSearchResult[], PeerSearchResult[], { results: DonorNameResult[]; more: boolean; totalNames: number }, OrgListRow[]] = await Promise.all([
    q.length >= 2 ? searchContent(q, type, dept, from, to, sort) : Promise.resolve([]),
    wants('constituency') ? searchConstituencies(q, shown) : Promise.resolve([]),
    wants('council') ? searchCouncils(q, shown) : Promise.resolve([]),
    wants('peer') ? searchPeers(q, shown) : Promise.resolve([]),
    wants('donor') ? searchDonorNames(q) : Promise.resolve(noDonors),
    wants('organisation') ? cachedOrganisationList() : Promise.resolve([]),
  ]);
  const orgMatches = orgList.length ? searchOrganisations(orgList, q) : [];
  const orgs = orgMatches.slice(0, shown);
  const linkedDonors = donorSearch.results.filter((d) => d.slug);
  const donors = linkedDonors.slice(0, shown);
  // The record itself (an MP's page, a council, a company) apart from the reports, releases, bills and votes that
  // mention the term.
  // An exact constituency name (UX1b): that seat's MP leads the MPs too.
  const exactSeat = seats.find((c) => c.name.toLowerCase() === q.replace(/^"|"$/g, '').trim().toLowerCase());
  const mps = allResults.filter((r) => r.type === 'mp')
    .sort((a, b) => Number(b.constituency === exactSeat?.name) - Number(a.constituency === exactSeat?.name));
  const results = allResults.filter((r) => r.type !== 'mp');
  const hasRecords = seats.length + mps.length + peers.length + councils.length + orgs.length + donors.length > 0;
  const isEmpty = !hasRecords && results.length === 0;
  // "Did you mean" (SR1): only for a search that found nothing, one corrected query from our own titles, as a link with
  // the same filters, never run by itself (lib/search-suggest.ts).
  const suggestion = q.length >= 2 && isEmpty ? suggestQuery(q, await searchVocabulary()) : null;
  const suggestionHref = suggestion
    ? `/search?${new URLSearchParams({ q: suggestion, ...(type !== 'all' ? { type } : {}), ...(dept ? { dept } : {}), ...(sort === 'newest' ? { sort } : {}) }).toString()}`
    : null;

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

      {/* Phones with a search (UX2h): the line on what is searched moves to the end of the page and the gaps under the title
          and the search box are smaller, so the first match is on the first screen. Without a search, and from 640px up, as before. */}
      {q && <style>{`.srch-intro-p { display: none; } @media ${PHONE} { .srch-intro-w { display: none; } .srch-intro-p { display: block; } .srch-head { margin-bottom: 12px !important; } .srch-box { margin-bottom: 12px !important; } }`}</style>}
      <header className="srch-head" style={{ marginBottom: '5%' }}>
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
        <p className="srch-intro-w" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: '#14100d' }}>
          {SEARCHED}
        </p>
      </header>

      {/* key remounts on q|type change so useState reinitialises with the current URL value */}
      <SearchInput key={q + '|' + type + '|' + (dept ?? '') + '|' + sort} defaultQ={q} defaultType={type} defaultDept={dept ?? ''} defaultSort={sort} />

      {/* The sign up note (lib/search-note.ts): its script runs straight after it, so on a full load it is shown or
          left hidden before the results are painted. */}
      <style>{`.og-snote{display:none;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 18px;padding:10px 12px;border:1px solid rgba(20,16,13,0.25);background:rgba(255,255,255,0.18);font-size:15px;line-height:1.5}.og-snote[data-show="1"]{display:flex}.og-snote-x{flex:none;min-width:32px;min-height:32px;background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:#14100d}.og-snote-x:focus-visible{outline:2px solid #7a1612;outline-offset:2px}@media ${phoneUpTo(639.98)} {.og-snote-x{min-width:44px;min-height:44px}}`}</style>
      <SignupNote q={q} returnTo={'/search' + (q ? `?q=${encodeURIComponent(q)}` : '')} />
      <script dangerouslySetInnerHTML={{ __html: `${SEARCH_NOTE_JS}window.__ogNoteSearch(${JSON.stringify(q)});` }} />
      {/* Signed in members can save the search (job 74 Part 5); lists and alerts are on /preferences. */}
      {/* Saved search alerts cover reports, releases, bills, votes and MPs, so the record only filters do not offer it. */}
      {!RECORD_FILTERS.includes(type) && <SaveSearchButton q={q} type={type} dept={dept} from={from} to={to} sort={sort} />}
      {/* The "search" analytics event for a submitted search, with consent only; the count is every result shown or
          counted on this page (content, councils, organisations, donor names). */}
      <SearchTracker q={q} resultsCount={allResults.length + seats.length + councils.length + peers.length + orgMatches.length + (donorSearch.more ? donorSearch.totalNames : linkedDonors.length)} />

      {q.length >= 2 && isEmpty && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', color: INK, marginBottom: '6px' }}>No results for &ldquo;{q}&rdquo;</p>
          {suggestion && suggestionHref && (
            <p style={{ fontSize: '17px', color: INK, margin: '0 0 10px' }}>
              Did you mean <Link href={suggestionHref} className="og-tap" style={{ color: ACCENT, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{suggestion}</Link>?
            </p>
          )}
          <p style={{ fontSize: '15px', color: '#14100d' }}>
            Try different keywords, or{' '}
            <Link href="/departments" style={{ color: ACCENT }}>browse departments</Link>
          </p>
        </div>
      )}

      {hasRecords && (
        <>
          <h2 style={groupHeading}>Records matching &ldquo;{q}&rdquo;</h2>
          {/* Phones (UX2h): this note follows the record results instead (srch-rnote below), so the first match sits under
              the search box. From 640px up, here as before. */}
          <style>{`.srch-rnote-p { display: none; } @media ${PHONE} { .srch-rnote-w { display: none; } .srch-rnote-p { display: block; } }`}</style>
          <p className="srch-rnote-w" style={groupNote}>The page for the constituency, MP, peer, council, organisation or donor itself.</p>
        </>
      )}

      {seats.length > 0 && (
        <section aria-labelledby="search-seats" style={{ marginBottom: '28px' }}>
          <h3 id="search-seats" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Constituencies · {seats.length}
          </h3>
          <ul id="results-seats" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {seats.map((c) => <ConstituencyRow key={c.slug} c={c} />)}
          </ul>
          <PhoneMore selector="#results-seats" total={seats.length} step={10} />
        </section>
      )}

      {mps.length > 0 && (
        <section aria-labelledby="search-mps" style={{ marginBottom: '28px' }}>
          <h3 id="search-mps" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            MPs · {mps.length}
          </h3>
          <ul id="results-mps" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {mps.map((r) => <ResultRow key={r.url} r={r} />)}
          </ul>
          <PhoneMore selector="#results-mps" total={mps.length} step={10} />
        </section>
      )}

      {peers.length > 0 && (
        <section aria-labelledby="search-peers" style={{ marginBottom: '28px' }}>
          <h3 id="search-peers" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Members of the House of Lords · {peers.length}
          </h3>
          <ul id="results-peers" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {peers.map((p) => <PeerRow key={p.memberId} p={p} />)}
          </ul>
          <PhoneMore selector="#results-peers" total={peers.length} step={10} />
        </section>
      )}

      {councils.length > 0 && (
        <section aria-labelledby="search-councils" style={{ marginBottom: '28px' }}>
          <h3 id="search-councils" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Councils · {councils.length}
          </h3>
          <ul id="results-councils" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {councils.map((c) => <CouncilRow key={c.slug} c={c} />)}
          </ul>
          <PhoneMore selector="#results-councils" total={councils.length} step={10} />
        </section>
      )}

      {orgs.length > 0 && (
        <section aria-labelledby="search-orgs" style={{ marginBottom: '28px' }}>
          <h3 id="search-orgs" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Organisations · {orgMatches.length.toLocaleString('en-GB')}
          </h3>
          <ul id="results-orgs" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {orgs.map((o) => <OrgRow key={o.slug} o={o} />)}
          </ul>
          <PhoneMore selector="#results-orgs" total={orgs.length} step={10} />
          {orgMatches.length > orgs.length && (
            <p style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
              <Link href={`/organisations?q=${encodeURIComponent(q)}`} style={{ color: ACCENT }}>All organisations matching &ldquo;{q}&rdquo;</Link>
            </p>
          )}
        </section>
      )}

      {donors.length > 0 && (
        <section aria-labelledby="search-donors" style={{ marginBottom: '28px' }}>
          <h3 id="search-donors" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Donor names (as registered with the Electoral Commission) · {(donorSearch.more ? donorSearch.totalNames : linkedDonors.length).toLocaleString('en-GB')}
          </h3>
          <ul id="results-donors" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {donors.map((d) => <DonorRow key={d.slug} d={d} />)}
          </ul>
          <PhoneMore selector="#results-donors" total={donors.length} step={10} />
          {(linkedDonors.length > donors.length || donorSearch.more) && (
            <p style={{ fontFamily: MONO, fontSize: '15px', marginTop: '8px' }}>
              <Link href={`/donors?q=${encodeURIComponent(q)}`} style={{ color: ACCENT }}>All donor names matching &ldquo;{q}&rdquo;</Link>
            </p>
          )}
        </section>
      )}

      {hasRecords && <p className="srch-rnote-p" style={groupNote}>Records above: the page for the constituency, MP, peer, council, organisation or donor itself.</p>}

      {results.length > 0 && (
        <section>
          <h2 style={groupHeading}>Reports, releases, bills and votes that mention &ldquo;{q}&rdquo;</h2>
          <p style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '12px' }}>
            {allResults.length >= (isPhrase(q) ? PHRASE_LIMIT : TOTAL_LIMIT) ? `${isPhrase(q) ? PHRASE_LIMIT : TOTAL_LIMIT}+ results` : `${results.length} result${results.length === 1 ? '' : 's'}`}
            {type !== 'all' && ` · ${type === 'editorial' || type === 'briefing' ? 'Reports' : TYPE_META[type]?.label ?? type} only`}
          </p>
          <NoJsPager id="results-rows" ownMore count={(results).length} rows="> li" size={25}>
          <ol id="results-all" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((r, i) => <ResultRow key={i} r={r} />)}
          </ol>
          </NoJsPager>
          <PhoneMore selector="#results-all" total={results.length} first={5} step={25} />
        </section>
      )}

      {!q && (
        <div>
          <p style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '12px', letterSpacing: '0.05em' }}>
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
                  fontSize: '15px',
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
      {q && <p className="srch-intro-p" style={{ fontSize: '16px', lineHeight: 1.8, color: '#14100d', marginTop: '28px' }}>{SEARCHED}</p>}
    </OpenGovShell>
  );
}
