import NoJsPager from '@/app/components/NoJsPager';
import SearchYourArea from './YourArea';
import { yourArea } from '@/lib/search-your-area';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import SearchInput from './SearchInput';
import SignupNote from './SignupNote';
import SaveSearchButton from './SaveSearchButton';
import SearchTracker from './SearchTracker';
import SearchLog from '../components/SearchLog';
import { homeBox } from '@/lib/search-terms';
import PhoneMore from '../components/PhoneMore';
import { SubFold } from '../components/PhoneFolds';
import { searchNoteInline } from '@/lib/search-note';
import { searchContent, searchContentLoose, searchCouncils, searchConstituencies, searchPeers, isPhrase, LOOSE_BELOW, PHRASE_LIMIT, TOTAL_LIMIT, PER_TABLE, PHRASE_PER_TABLE, type SearchResult, type CouncilSearchResult, type ConstituencySearchResult, type PeerSearchResult } from '@/lib/search-content';
import { searchDonorNames, type DonorNameResult } from '@/lib/donor-search';
import { suggestQuery } from '@/lib/search-suggest';
import { didYouMean, KIND_LABEL } from '@/lib/did-you-mean';
import { searchVocabulary } from '@/lib/search-vocabulary';
import { cachedOrganisationList, searchOrganisations, type OrgListRow } from '@/lib/organisations';
import { phoneUpTo } from '@/lib/breakpoints';
import { searchDirectory, type DirectoryPage } from '@/lib/directory';
import { queryNames, type QueryNames, type SpadHit } from '@/lib/search/name-index';
import { keptWords, mostlyDate, nameLeads } from '@/lib/search/query-understanding';
import { yearListPage } from '@/lib/search/year-list';
import MeaningResults from './MeaningResults';
import { seenKey } from '@/lib/meaning/kinds';

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ResultRow({ r }: { r: SearchResult }) {
  const meta = TYPE_META[r.type] ?? { label: r.type, color: '#14100d' };
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
          {/* One link per result: its title (T1-5x, owner 10 Nov 2026; no second "Continue to full article" link). */}
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
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
  const link: React.CSSProperties = { display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4 };
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.1em', color: INK, border: `1px solid ${PEER_META.color}`, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '3px', textTransform: 'uppercase' }}>
          {PEER_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link href={p.href} style={link}>{p.name}</Link>
          <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d' }}>
            {[p.party, p.peerageType, !p.isCurrent && 'Former member'].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
    </li>
  );
}

// A special adviser (Cowork ENTRY 384 stage B2), in the same row style: the name links to the special advisers page, at
// the adviser's row when they are in the latest appointments list.
const SPAD_META = { label: 'Special adviser', color: PEER_META.color };
function SpadRow({ s }: { s: SpadHit }) {
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.1em', color: INK, border: `1px solid ${SPAD_META.color}`, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '3px', textTransform: 'uppercase' }}>
          {SPAD_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link href={s.href} style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4 }}>
            {s.name}
          </Link>
          <span style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d' }}>
            {[s.area, s.quarter && `listed ${s.quarter}`].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
    </li>
  );
}

// A page of the site (Cowork ENTRY 383 addendum, 19 Nov 2026): a section, list or data page from the directory whose
// name, keywords or description match (lib/directory.ts searchDirectory), in the same row style.
const PAGE_META = { label: 'Page', color: ACCENT };
function PageRow({ p }: { p: DirectoryPage }) {
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <div className="srch-r" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.1em', color: INK, border: `1px solid ${PAGE_META.color}`, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '3px', textTransform: 'uppercase' }}>
          {PAGE_META.label}
        </span>
        <div style={{ minWidth: 0 }}>
          <Link href={p.href} style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: INK, textDecoration: 'none', lineHeight: 1.4, marginBottom: p.desc ? '4px' : 0 }}>
            {p.title}
          </Link>
          {p.desc && <p style={{ fontSize: '15px', color: '#14100d', margin: 0, lineHeight: 1.55 }}>{p.desc.length > 200 ? p.desc.slice(0, 200) + '…' : p.desc}</p>}
        </div>
      </div>
    </li>
  );
}

// The two groups of results (owner, 4 Nov 2026): the record itself, and what mentions the term. Above them since ENTRY 383
// (19 Nov 2026), the site's own pages for the words ('Pages on opengovt').
const PAGES_SHOWN = 8;
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
    via?: string;
  }>;
};

const SEARCHED = 'Reports, press releases, bills, parliamentary votes, constituencies, MPs, peers, special advisers, councils, donors and organisations, searched together.';

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
  // Names inside what was typed (Cowork ENTRY 384 stage B2): 'shabana mahmood salary' searches the name groups for
  // Shabana Mahmood, an area code for its council or constituency; special advisers are matched here too. In memory,
  // from cached lists (lib/search/name-index.ts). With All only.
  const contentRead = q.length >= 2 ? searchContent(q, type, dept, from, to, sort) : Promise.resolve([]);
  const named: QueryNames = inAll ? await queryNames(q) : { recordQ: q, found: null, spads: [] };
  // Your area (Cowork ENTRY 555, 556): the desktop council and MP boxes' results for the same words, with All only.
  const area = inAll ? await yourArea(q) : null;
  const rq = named.recordQ;
  const [allResults, seats, councils, peers, donorSearch, orgList, namedMps]: [SearchResult[], ConstituencySearchResult[], CouncilSearchResult[], PeerSearchResult[], { results: DonorNameResult[]; more: boolean; totalNames: number }, OrgListRow[], SearchResult[] | null] = await Promise.all([
    contentRead,
    wants('constituency') ? searchConstituencies(rq, shown) : Promise.resolve([]),
    wants('council') ? searchCouncils(rq, shown) : Promise.resolve([]),
    wants('peer') ? searchPeers(rq, shown) : Promise.resolve([]),
    wants('donor') ? searchDonorNames(rq, { wordStart: true }) : Promise.resolve(noDonors),
    wants('organisation') ? cachedOrganisationList() : Promise.resolve([]),
    // The MPs for a name found inside the query (the every-word search of the whole query finds none).
    named.found ? searchContent(rq, 'mp', null, null, null) : Promise.resolve(null),
  ]);
  // Some of the words (Cowork ENTRY 384 stage B2): fewer than LOOSE_BELOW reports, releases, bills and votes with every
  // word, so the search is tried again with some of them (lib/search-content.ts searchContentLoose), listed after the
  // every-word results and labelled.
  const strict = allResults.filter((r) => r.type !== 'mp');
  const loose = q.length >= 2 && strict.length < LOOSE_BELOW && type !== 'mp' && sort === 'relevance'
    ? await searchContentLoose(q, type, dept, from, to, new Set(strict.map((r) => r.url)))
    : { results: [] as SearchResult[], words: [] as string[] };
  // The site's own pages for the words (Cowork ENTRY 383 addendum): from the directory, in memory, with All only. If none
  // match every word, the words beside a name found in the query ('salary' in 'shabana mahmood salary'), then the words
  // without filler ('councils' in 'how many councils are there in the uk').
  const kept = keptWords(q).join(' ');
  const directoryPages = !inAll ? [] : [q, named.found?.rest ?? '', kept].reduce<DirectoryPage[]>((got, t) => (got.length || !t.trim() ? got : searchDirectory(t, PAGES_SHOWN)), []);
  // 'pmq 1965', 'votes june 2024' (Cowork ENTRY 489): that year's (or month's) list leads, before every other result.
  const yearPage = inAll ? await yearListPage(q) : null;
  const pages = yearPage ? [yearPage, ...directoryPages.filter((p) => p.href !== yearPage.href)].slice(0, Math.max(PAGES_SHOWN, 1)) : directoryPages;
  const orgMatches = orgList.length ? searchOrganisations(orgList, rq, { wordStart: true }) : [];
  const orgs = orgMatches.slice(0, shown);
  const linkedDonors = donorSearch.results.filter((d) => d.slug);
  const donors = linkedDonors.slice(0, shown);
  // The record itself (an MP's page, a council, a company) apart from the reports, releases, bills and votes that
  // mention the term.
  // An exact constituency name (UX1b): that seat's MP leads the MPs too.
  const exactSeat = seats.find((c) => c.name.toLowerCase() === rq.replace(/^"|"$/g, '').trim().toLowerCase());
  const mps = (namedMps ?? allResults).filter((r) => r.type === 'mp')
    .sort((a, b) => Number(b.constituency === exactSeat?.name) - Number(a.constituency === exactSeat?.name));
  const spads = named.spads;
  const results = [...strict, ...loose.results];
  const hasRecords = seats.length + mps.length + peers.length + spads.length + councils.length + orgs.length + donors.length > 0;
  // A name found inside the query (or the place for an area code) leads: the records come before the pages.
  const recordsFirst = !!named.found && hasRecords && !yearPage;
  // The first group of results shown, which stays open on phones (UX2q); every later one is folded there.
  type Group = 'pages' | 'seats' | 'mps' | 'peers' | 'spads' | 'councils' | 'orgs' | 'donors' | 'content';
  const recordGroups: [Group, number][] = [['seats', seats.length], ['mps', mps.length], ['peers', peers.length], ['spads', spads.length], ['councils', councils.length], ['orgs', orgs.length], ['donors', donors.length]];
  const ordered: [Group, number][] = recordsFirst ? [...recordGroups, ['pages', pages.length]] : [['pages', pages.length], ...recordGroups];
  const firstGroup: Group | null = [...ordered, ['content', results.length] as [Group, number]].find(([, n]) => n > 0)?.[0] ?? null;
  const isEmpty = pages.length === 0 && !hasRecords && results.length === 0;
  // Nothing with every word: the spelling suggestions below are offered even when some-of-the-words results are shown.
  const noneWithEveryWord = pages.length === 0 && !hasRecords && strict.length === 0;
  // The count of reports, releases, bills and votes (Cowork ENTRY 383 addendum item 2). Each table gives at most
  // PER_TABLE rows (100 for a quoted phrase) and TOTAL_LIMIT in all, so a table that gave its full share, or a full total,
  // has more than are listed: the count is what is listed, with '+'. It said '20 results' for youth crime when the press
  // releases had stopped at their 20, and 'N+' from the total including MPs, who are listed in their own group above.
  const perTable = isPhrase(q) ? PHRASE_PER_TABLE : PER_TABLE;
  const perType = new Map<string, number>();
  for (const r of strict) perType.set(r.type, (perType.get(r.type) ?? 0) + 1);
  const contentMore = allResults.length >= (isPhrase(q) ? PHRASE_LIMIT : TOTAL_LIMIT) || [...perType.values()].some((n) => n >= perTable);
  const contentCount = `${results.length.toLocaleString('en-GB')}${contentMore ? '+' : ''}`;
  // "Did you mean" (SR1): only for a search that found nothing with every word, one corrected query from our own titles
  // and page names, as a link with the same filters, never run by itself (lib/search-suggest.ts).
  const suggestion = q.length >= 2 && noneWithEveryWord ? suggestQuery(q, await searchVocabulary()) : null;
  // The one count both the PostHog tracker and the search term log send (Cowork ENTRY 375 item 2).
  const resultsCount = pages.length + strict.length + loose.results.length + mps.length + seats.length + councils.length + peers.length + spads.length + orgMatches.length + (donorSearch.more ? donorSearch.totalNames : linkedDonors.length);
  const suggestionHref = suggestion
    ? `/search?${new URLSearchParams({ q: suggestion, ...(type !== 'all' ? { type } : {}), ...(dept ? { dept } : {}), ...(sort === 'newest' ? { sort } : {}) }).toString()}`
    : null;
  // And the closest MP, constituency, council or donor names (UX4j, lib/did-you-mean.ts): each links to its page.
  const names = q.length >= 3 && noneWithEveryWord ? await didYouMean(q) : [];
  // Which leads (Cowork ENTRY 384 stage B2): the corrected search ('sewige' -> sewage), unless the closest name holds the
  // corrected word ('badnoch' -> Kemi Badenoch, the MP).
  const nameFirst = nameLeads(q, suggestion, names[0]?.name ?? null);
  const leadName = names.length > 0 && (nameFirst || !suggestion) ? names[0] : null;
  const otherNames = leadName ? names.slice(1) : names;
  const didYouMeanLine = leadName ? (
    <>Did you mean <Link href={leadName.href} className="og-tap" style={{ color: ACCENT, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{leadName.name}</Link> ({KIND_LABEL[leadName.kind]})?</>
  ) : suggestion && suggestionHref ? (
    <>Did you mean <Link href={suggestionHref} className="og-tap" style={{ color: ACCENT, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{suggestion}</Link>?</>
  ) : null;
  const recordsFor = named.found ? named.found.code ? `${named.found.code}` : named.found.name : q;
  // 'Related by meaning' (Cowork ENTRY 390 GO): with All only, under everything else; the records listed above are left out
  // of it, by the same key (lib/meaning/kinds.ts seenKey). Not offered when the search is exactly the name of a record
  // listed above, or when a spelling correction is offered: the ENTRY 390 test found no gain there, only near names
  // ('tara smith' to any Smith, 'sewige' to Segen).
  const plain = (t: string) => t.toLowerCase().replace(/["']/g, '').replace(/\s+/g, ' ').trim();
  const isRecordName = [...mps.map((r) => r.title), ...peers.map((p) => p.name), ...seats.map((c) => c.name), ...councils.map((c) => c.name),
    ...orgs.map((o) => o.name), ...donors.map((d) => d.name), ...spads.map((a) => a.name)].some((n) => plain(n) === plain(q));
  // A query that is mostly a year or a date has no meaning to match (ENTRY 489: 'pmq 1965' showed 2025 debates).
  const meaningOn = inAll && !isRecordName && !didYouMeanLine && !mostlyDate(q);
  const meaningSeen = meaningOn ? [...new Set([
    ...pages.map((p) => p.href), ...seats.map((c) => `/constituencies/${c.slug}`), ...mps.map((r) => r.url), ...peers.map((p) => p.href),
    ...spads.map((s) => s.href), ...councils.map((c) => `/councils/${c.slug}`), ...orgs.map((o) => `/organisations/${o.slug}`),
    ...results.map((r) => r.url),
  ].map(seenKey))] : [];

  // The site's own pages: above the records, or below them when a name in the query leads.
  const pagesBlock = pages.length > 0 && (
    <ResultGroup open={firstGroup === 'pages'} label={`Pages on opengovt (${pages.length})`}>
    <section aria-labelledby="search-pages" style={{ marginBottom: '28px' }}>
      <h2 id="search-pages" style={groupHeading}>Pages on opengovt</h2>
      <p style={groupNote}>Sections, lists and data pages on this site for these words.</p>
      <ul id="results-pages" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {pages.map((p) => <PageRow key={p.href} p={p} />)}
      </ul>
    </section>
    </ResultGroup>
  );

  return (
    <OpenGovShell>
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

      {/* With a search, at every width (UX2h phones; UX4b desktop, 10 Nov 2026): the line on what is searched moves to the end
          of the page and the gaps under the title and the search box are smaller, so the first match is on the first screen.
          Without a search, as before. */}
      {q && <style>{`.srch-intro-w { display: none; } .srch-head { margin-bottom: 12px !important; } .srch-box { margin-bottom: 16px !important; }`}</style>}
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
      <style>{`.og-snote{display:none;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 18px;padding:10px 12px;border:1px solid rgba(20,16,13,0.25);background:rgba(255,255,255,0.18);font-size:15px;line-height:1.5}.og-snote[data-show="1"]{display:flex}.og-snote-x{flex:none;min-width:32px;min-height:32px;background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:#14100d}.og-snote-x:focus-visible{outline:2px solid #7a1612;outline-offset:2px}@media ${phoneUpTo(767.98)} {.og-snote-x{min-width:44px;min-height:44px}}`}</style>
      <SignupNote q={q} returnTo={'/search' + (q ? `?q=${encodeURIComponent(q)}` : '')} />
      <script dangerouslySetInnerHTML={{ __html: searchNoteInline(q) }} />
      {/* Signed in members can save the search (job 74 Part 5); lists and alerts are on /preferences. */}
      {/* Saved search alerts cover reports, releases, bills, votes and MPs, so the record only filters do not offer it. */}
      {!RECORD_FILTERS.includes(type) && <SaveSearchButton q={q} type={type} dept={dept} from={from} to={to} sort={sort} />}
      {/* The "search" analytics event for a submitted search, with consent only; the count is every result shown or
          counted on this page (content, councils, organisations, donor names). */}
      <SearchTracker q={q} resultsCount={resultsCount} />
      {/* The search term log (Cowork ENTRY 375 item 2): the term, this box (or the homepage's, via=home), the same count. */}
      {q && <SearchLog term={q} box={homeBox('site', sp.via)} results={resultsCount} />}
      {inAll && <SearchYourArea q={q} area={area} archive={process.env.ARCHIVE_ENABLED === '1'} />}

      {q.length >= 2 && isEmpty && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', color: INK, marginBottom: '6px' }}>No results for &ldquo;{q}&rdquo;</p>
          {didYouMeanLine && <p style={{ fontSize: '17px', color: INK, margin: '0 0 10px' }}>{didYouMeanLine}</p>}
          {otherNames.length > 0 && (
            <p style={{ fontSize: '15px', color: INK, margin: '0 0 10px', lineHeight: 1.8 }}>
              Other close names:{' '}
              {otherNames.map((n, i) => (
                <span key={n.href}>{i > 0 && ', '}<Link href={n.href} className="og-tap" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{n.name}</Link> ({KIND_LABEL[n.kind]})</span>
              ))}
            </p>
          )}
          <p style={{ fontSize: '15px', color: '#14100d' }}>
            Try different keywords, or{' '}
            <Link href="/departments" style={{ color: ACCENT }}>browse departments</Link>
          </p>
        </div>
      )}

      {/* Nothing with every word, but some-of-the-words results below: the spelling suggestion goes above them. */}
      {q.length >= 2 && !isEmpty && noneWithEveryWord && didYouMeanLine && (
        <p style={{ fontSize: '17px', color: INK, margin: '0 0 16px' }}>{didYouMeanLine}</p>
      )}

      {!recordsFirst && pagesBlock}

      {hasRecords && (
        <>
          <h2 style={groupHeading}>Records matching &ldquo;{recordsFor}&rdquo;</h2>
          {/* At every width (UX2h phones; UX4b desktop): this note follows the record results instead (srch-rnote below), so
              the first match sits under the search box and filters. */}
          <style>{`.srch-rnote-w { display: none; }`}</style>
          <p className="srch-rnote-w" style={groupNote}>The page for the constituency, MP, peer, council, organisation or donor itself.</p>
        </>
      )}

      {seats.length > 0 && (
        <ResultGroup open={firstGroup === 'seats'} label={`Constituencies (${seats.length})`}>
        <section aria-labelledby="search-seats" style={{ marginBottom: '28px' }}>
          <h3 id="search-seats" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Constituencies · {seats.length}
          </h3>
          <ul id="results-seats" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {seats.map((c) => <ConstituencyRow key={c.slug} c={c} />)}
          </ul>
          <PhoneMore selector="#results-seats" total={seats.length} step={10} />
        </section>
        </ResultGroup>
      )}

      {mps.length > 0 && (
        <ResultGroup open={firstGroup === 'mps'} label={`MPs (${mps.length})`}>
        <section aria-labelledby="search-mps" style={{ marginBottom: '28px' }}>
          <h3 id="search-mps" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            MPs · {mps.length}
          </h3>
          <ul id="results-mps" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {mps.map((r) => <ResultRow key={r.url} r={r} />)}
          </ul>
          <PhoneMore selector="#results-mps" total={mps.length} step={10} />
        </section>
        </ResultGroup>
      )}

      {peers.length > 0 && (
        <ResultGroup open={firstGroup === 'peers'} label={`Members of the House of Lords (${peers.length})`}>
        <section aria-labelledby="search-peers" style={{ marginBottom: '28px' }}>
          <h3 id="search-peers" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Members of the House of Lords · {peers.length}
          </h3>
          <ul id="results-peers" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {peers.map((p) => <PeerRow key={p.memberId} p={p} />)}
          </ul>
          <PhoneMore selector="#results-peers" total={peers.length} step={10} />
        </section>
        </ResultGroup>
      )}

      {spads.length > 0 && (
        <ResultGroup open={firstGroup === 'spads'} label={`Special advisers (${spads.length})`}>
        <section aria-labelledby="search-spads" style={{ marginBottom: '28px' }}>
          <h3 id="search-spads" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Special advisers · {spads.length}
          </h3>
          <ul id="results-spads" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {spads.map((a) => <SpadRow key={a.name} s={a} />)}
          </ul>
          <PhoneMore selector="#results-spads" total={spads.length} step={10} />
        </section>
        </ResultGroup>
      )}

      {councils.length > 0 && (
        <ResultGroup open={firstGroup === 'councils'} label={`Councils (${councils.length})`}>
        <section aria-labelledby="search-councils" style={{ marginBottom: '28px' }}>
          <h3 id="search-councils" style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Councils · {councils.length}
          </h3>
          <ul id="results-councils" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {councils.map((c) => <CouncilRow key={c.slug} c={c} />)}
          </ul>
          <PhoneMore selector="#results-councils" total={councils.length} step={10} />
        </section>
        </ResultGroup>
      )}

      {orgs.length > 0 && (
        <ResultGroup open={firstGroup === 'orgs'} label={`Organisations (${orgMatches.length.toLocaleString('en-GB')})`}>
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
              <Link href={`/organisations?q=${encodeURIComponent(q)}`} className="og-tap" style={{ color: ACCENT }}>All organisations matching &ldquo;{q}&rdquo;</Link>
            </p>
          )}
        </section>
        </ResultGroup>
      )}

      {donors.length > 0 && (
        <ResultGroup open={firstGroup === 'donors'} label={`Donor names (${(donorSearch.more ? donorSearch.totalNames : linkedDonors.length).toLocaleString('en-GB')})`}>
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
        </ResultGroup>
      )}

      {hasRecords && <p className="srch-rnote-p" style={groupNote}>Records above: the page for the constituency, MP, peer, special adviser, council, organisation or donor itself.</p>}

      {recordsFirst && pagesBlock}

      {results.length > 0 && (
        <ResultGroup open={firstGroup === 'content'} label={`Reports, releases, bills and votes (${contentCount})`}>
        <section>
          <h2 style={groupHeading}>{strict.length ? <>Reports, releases, bills and votes that mention &ldquo;{q}&rdquo;</> : <>Reports, releases, bills and votes with some of your words</>}</h2>
          <p style={{ fontFamily: MONO, fontSize: '15px', color: '#14100d', marginBottom: '12px' }}>
            {contentCount} result{results.length === 1 && !contentMore ? '' : 's'}
            {type !== 'all' && ` · ${type === 'editorial' || type === 'briefing' ? 'Reports' : TYPE_META[type]?.label ?? type} only`}
            {loose.results.length > 0 && (strict.length
              ? ` · after the first ${strict.length}, results with some of your words`
              : ` · none has every word; these have some of them (${loose.words.join(', ')})`)}
          </p>
          <NoJsPager id="results-rows" ownMore count={(results).length} rows="> li" size={25}>
          <ol id="results-all" data-own-more style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((r, i) => <ResultRow key={i} r={r} />)}
          </ol>
          </NoJsPager>
          <PhoneMore selector="#results-all" total={results.length} first={5} step={25} />
        </section>
        </ResultGroup>
      )}

      {/* Related by meaning (Cowork ENTRY 390 GO): asked for by the browser after the results above are shown; it adds a group
          under them or nothing. Folded on phones like every later group, open when it is the only one. */}
      {meaningOn && <MeaningResults q={q} seen={meaningSeen} fold={firstGroup !== null} />}

      {/* T1-DECLUT item 1 (owner, 12 Nov 2026): no 'Popular searches' block; it was a fixed list, not real data. */}
      {q && <p className="srch-intro-p" style={{ fontSize: '16px', lineHeight: 1.8, color: '#14100d', marginTop: '28px' }}>{SEARCHED}</p>}
    </OpenGovShell>
  );
}

// Phones (UX2q, owner approved through Cowork, 10 Nov 2026): the first group of results stays open; each later group is a
// closed native fold labelled with its name and count (SubFold: from 640px up the group shows as before).
function ResultGroup({ open, label, children }: { open: boolean; label: string; children: React.ReactNode }) {
  return open ? <>{children}</> : <SubFold label={label}>{children}</SubFold>;
}
