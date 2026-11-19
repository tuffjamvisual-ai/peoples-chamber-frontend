'use client';

// MP listing with two view modes driven by ?expand=<party>:
//
//   - No param: show a 2-column grid of clickable party HEADERS only.
//     Each header is a <Link> that navigates to ?expand=<name>.
//
//   - With param: show that one party full-width with a back arrow
//     to /mps. The MP profile back-link from /mps/[id]?from=<party>
//     still routes here via the same `expand` param.
//
// Search filters inside whichever view is active. The search term lives in the address bar as ?q= (24 Oct 2026,
// as on /reports): kept in step with history.replaceState, so no new history entries, and read back on first render.
// Back from a profile (the browser's or the site's "← Back", which uses history) or a reload then shows the same
// search. A full postcode is never written there: it opens the MP, and restoring it would open them again on Back.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { normaliseParty, isCoop, resolvePartyColour } from '@/lib/party-helpers';
import Unavailable from '@/app/components/Unavailable';
import { wordsOf, searchList } from '@/lib/search/words';
import SearchLog from '@/app/components/SearchLog';
import { homeBox } from '@/lib/search-terms';

import '@/app/components/search-box-desk.css';
interface MP {
  member_id: number;
  name: string;
  photo_url: string | null;
  party: string;
  search_name?: string; // the name as Parliament writes it (with any courtesy title), matched by the search box
  constituency: string;
  party_colour?: string | null;
}

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;

const MPS_PER_PAGE = 21;
// MPS-PARTY (owner approved 18 Nov 2026, Cowork ENTRY 284: "Show 20, then more"): from 1,024px the party view lists every MP
// in the party with no page numbers, opening with 20, then "Show 20 more" with the count, and "Show fewer" once more show.
const DESK_FIRST = 20;
const DESK_STEP = 20;
// Phones and tablets keep the party's pages of 21 and, inside a page, 3 then "Show 10 more" (PhoneMore's rule, L7).
const PHONE_FIRST = 3;
const PHONE_STEP = 10;
const DESK = '(min-width: 1024px)';
const PHONE = '(max-width: 1023.98px)';

// The address-aware list (useSearchParams), rendered in the browser under the page's Suspense boundary. The page's
// fallback is the same list with an empty address (MagazineMPsStatic), so /mps is prerendered with the full default list in
// its HTML and nothing moves when this replaces it (Cowork ENTRY 169: /mps stays static, A16; ENTRY 148 layout shift 0).
type ViewProps = { mps: MP[]; expand?: string | null };
type Params = Pick<URLSearchParams, 'get'>;
const NO_PARAMS: Params = new URLSearchParams();

export default function MagazineMPsClient(props: ViewProps) {
  return <MPsView {...props} searchParams={useSearchParams()} />;
}

export function MagazineMPsStatic(props: ViewProps) {
  return <MPsView {...props} searchParams={NO_PARAMS} />;
}

function MPsView({ mps, expand, searchParams }: ViewProps & { searchParams: Params }) {
  // Prefer the server-resolved ?expand prop (drives view + re-render on nav);
  // fall back to the client param if the prop is not supplied.
  const selectedParty = expand !== undefined ? expand : searchParams.get('expand');
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const requestedPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  // The address bar's ?q= on first render. The address-aware list renders in the browser only (useSearchParams under the
  // page's Suspense boundary); the prerendered fallback has no address, so no ?q=.
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');

  // Keep ?q= in step with the box, beside ?expand= and ?page=, without adding history entries. It also runs when the
  // address changes (a party, page or "All parties" link), since those links do not carry ?q= and the search stays.
  useEffect(() => {
    const url = new URL(window.location.href);
    const term = searchTerm.trim();
    if (term && !POSTCODE_RE.test(term.toUpperCase().replace(/\s+/g, ''))) url.searchParams.set('q', term);
    else url.searchParams.delete('q');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
  }, [searchTerm, searchParams]);

  const fielded = useMemo(() => mps.map((mp) => ({ item: mp, fields: [wordsOf(`${mp.name} ${mp.search_name || ''}`), wordsOf(mp.constituency || ''), wordsOf(mp.party || '')] })), [mps]);
  const filteredMPs = useMemo(() => {
    if (!searchTerm.trim()) return mps;
    // Every word of the search must start a word of the MP's name (as shown, or as Parliament writes it with any courtesy
    // title, so "Mrs Badenoch" and "Kemi Badenoch" both find Kemi Badenoch), constituency or party, in any order; a one
    // letter typo only if nothing matches exactly; the name first in the order (SEARCH-ALL batch 2, lib/search/words.ts).
    return searchList(fielded, searchTerm).matches;
  }, [mps, fielded, searchTerm]);

  // The search term log (Cowork ENTRY 375 item 2): the ?q= the list opened with (not each letter typed after), with the
  // MPs it matched; a full postcode opens that MP's page instead, so its count is not known (null).
  const [opened] = useState(() => ({ q: (searchParams.get('q') ?? '').trim(), via: searchParams.get('via') }));
  const openedCount = useMemo(() => {
    if (!opened.q) return 0;
    if (POSTCODE_RE.test(opened.q.toUpperCase().replace(/\s+/g, ''))) return null;
    return searchList(fielded, opened.q).matches.length;
  }, [fielded, opened]);

  const mpsByParty = useMemo(() => {
    const acc: Record<string, MP[]> = {};
    for (const mp of filteredMPs) {
      const p = normaliseParty(mp.party);
      (acc[p] ||= []).push(mp);
    }
    return acc;
  }, [filteredMPs]);

  const sortedParties = useMemo(
    () => Object.entries(mpsByParty).sort((a, b) => b[1].length - a[1].length),
    [mpsByParty],
  );

  // The full unfiltered list of party names — used to validate ?expand=
  // even if the current search has filtered the selected party's MPs to zero.
  const allPartyNames = useMemo(() => {
    const set = new Set<string>();
    for (const mp of mps) set.add(normaliseParty(mp.party));
    return set;
  }, [mps]);

  const partyExists = selectedParty != null && allPartyNames.has(selectedParty);
  const selectedPartyMPs = useMemo(() => {
    if (!partyExists) return [] as MP[];
    const list = mpsByParty[selectedParty!] || [];
    // Stable alphabetical order by display name (en-GB collation so
    // accented characters sort the way British readers expect).
    return [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'en-GB', { sensitivity: 'base' }),
    );
  }, [partyExists, mpsByParty, selectedParty]);
  const selectedPartyColour = partyExists ? resolvePartyColour(selectedParty!, selectedPartyMPs) : '#7697a2';
  const totalInSelectedParty = partyExists
    ? mps.filter((m) => normaliseParty(m.party) === selectedParty).length
    : 0;

  return (
    <div style={{ padding: '32px 0', fontFamily: 'var(--font-special-elite), monospace', color: INK }}>
      {partyExists ? (
        <SinglePartyView
          partyName={selectedParty!}
          partyColour={selectedPartyColour}
          partyMPs={selectedPartyMPs}
          totalInParty={totalInSelectedParty}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          requestedPage={requestedPage}
        />
      ) : (
        <AllPartiesView
          sortedParties={sortedParties}
          totalMPs={mps.length}
          matches={filteredMPs}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      )}
      {opened.q && <SearchLog term={opened.q} box={homeBox('mps', opened.via)} results={openedCount} />}

    </div>
  );
}

function SearchInput({
  searchTerm,
  setSearchTerm,
  count,
  total,
  label,
}: {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  count: number;
  total: number;
  label: string;
}) {
  const router = useRouter();
  const [pcErr, setPcErr] = useState('');
  const triedRef = useRef('');

  // A typed postcode is detected live so the reader jumps straight to their own
  // MP from the same box they use to search by name, party or constituency.
  const cleanPc = searchTerm.toUpperCase().replace(/\s+/g, '');
  const isPostcode = POSTCODE_RE.test(cleanPc);

  // As soon as a complete, valid postcode is typed, look it up automatically and
  // navigate to that MP — no button press. triedRef stops it firing twice for
  // the same postcode (and lets a corrected one fire again).
  useEffect(() => {
    if (!isPostcode) return;
    if (triedRef.current === cleanPc) return;
    triedRef.current = cleanPc;
    let cancelled = false;
    setPcErr('');
    (async () => {
      try {
        const res = await fetch('/api/find-mp?postcode=' + encodeURIComponent(cleanPc));
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setPcErr(data.message || 'No MP found for that postcode.'); return; }
        router.push('/mps/' + data.memberId);
      } catch {
        if (!cancelled) setPcErr('Lookup is unavailable right now. Please try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [isPostcode, cleanPc, router]);

  return (
    <div style={{ marginBottom: '24px' }}>
      <input className="og-sbox-input" data-main-action aria-label="Search MPs by name, party, constituency or postcode"
        type="text"
        placeholder="Search MPs by name, party, constituency or postcode…"
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setPcErr(''); }}
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '10px 14px',
          border: `2px solid ${INK_HAIRLINE}`,
          background: 'transparent',
          color: INK,
          fontFamily: 'inherit',
          fontSize: '15px',
          outline: 'none',
        }}
      />
      {isPostcode ? (
        <p
          role={pcErr ? 'alert' : undefined}
          style={{ marginTop: '8px', fontSize: '15px', fontWeight: 700, color: pcErr ? ACCENT : INK }}
        >
          {pcErr ? pcErr : `Finding the MP for ${cleanPc}…`}
        </p>
      ) : searchTerm.trim() ? (
        // Only while the list is being filtered (T1-DECLUT item 3, owner 12 Nov 2026): '650 of 650 MPs' said nothing.
        <p style={{ marginTop: '8px', fontSize: '15px' }}>
          {count} of {total} {label}
        </p>
      ) : null}
    </div>
  );
}

function MPCard({ mp, fromParty, idx }: { mp: MP; fromParty: string; idx: number }) {
  const tilt = ((idx % 5) - 2) * 1.5 - 0.5;
  return (
    <Link
      href={`/mps/${mp.member_id}?from=${encodeURIComponent(fromParty)}`}
      style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          background: '#ebe5d8',
          padding: '6px 6px 22px 6px',
          width: '96px',
          transform: `rotate(${tilt}deg)`,
          boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
          filter: 'contrast(1.05) brightness(0.98)',
          flexShrink: 0,
        }}
      >
        {mp.photo_url ? (
          <Image
            src={mp.photo_url}
            alt={mp.name}
            width={84}
            height={96}
            loading="lazy"
            sizes="84px"
            style={{ display: 'block', width: '84px', height: '96px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: '84px',
              height: '96px',
              background: '#d6cdb8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: INK,
            }}
          >
            {(mp.name || '?').charAt(0)}
          </div>
        )}
      </div>
      <div style={{ flex: 1, paddingTop: '6px', minWidth: 0 }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', lineHeight: 1.25 }}>
          {mp.name}
        </h3>
        <p style={{ fontSize: '15px' }}>{mp.constituency}</p>
        {isCoop(mp.party) && (
          <p style={{ fontSize: '15px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Lab &amp; Co-op
          </p>
        )}
      </div>
    </Link>
  );
}

// The two folds of the party grid (MPS-PARTY, ENTRY 284). Phones and tablets: this page's 21 cards, 3 then 10 more a press
// (as PhoneMore did). From 1,024px: every card, 20 then 20 more a press; an old ?page= link opens far enough down to show that
// page's MPs and scrolls to the first of them, so old links still land on the same names. Without JavaScript nothing folds.
function PartyFold({ total, startIdx, pageCount, requestedPage }: { total: number; startIdx: number; pageCount: number; requestedPage: number }) {
  const deskStart = total <= DESK_FIRST
    ? total
    : requestedPage > 1
      ? Math.min(total, Math.ceil((startIdx + pageCount) / DESK_STEP) * DESK_STEP)
      : DESK_FIRST;
  const [desk, setDesk] = useState(deskStart);
  const [phone, setPhone] = useState(PHONE_FIRST);

  useEffect(() => {
    if (requestedPage <= 1 || !window.matchMedia(DESK).matches) return;
    const raf = requestAnimationFrame(() => {
      (document.querySelector(`#mps-party-grid > :nth-child(${startIdx + 1})`) as HTMLElement | null)?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [requestedPage, startIdx]);

  const g = '#mps-party-grid';
  const phoneFolds = pageCount > PHONE_FIRST;
  const deskFolds = total > DESK_FIRST;
  const css = [
    '.mpp-desk { display: none; }',
    `@media ${DESK} { .mpp-phone { display: none !important; } .mpp-desk { display: block; } }`,
    `@media ${PHONE} {`,
    `  ${g} > :nth-child(-n+${startIdx}), ${g} > :nth-child(n+${startIdx + pageCount + 1}) { display: none !important; }`,
    phoneFolds ? `  html.og-js ${g} > :nth-child(n+${startIdx + Math.min(phone, pageCount) + 1}) { display: none !important; }` : '',
    '}',
    deskFolds ? `@media ${DESK} { html.og-js ${g} > :nth-child(n+${desk + 1}) { display: none !important; } }` : '',
    // Its own desktop button styles: the shared ones (globals.css) are phones and tablets only since every other list shows
    // whole on desktop (ENTRY 302); this view is the owner's one desktop fold (ENTRY 284).
    deskFolds ? `@media ${DESK} { html.og-js .mpp-desk .og-phone-more { display: block; width: 100%; min-height: 44px; margin: 12px 0 8px; padding: 8px 12px; font-family: inherit; font-size: 15px; font-weight: bold; color: #14100d; background: transparent; border: 1px solid #14100d; cursor: pointer; } html.og-js .mpp-desk .og-more-count { display: block; margin: 12px 0 0; font-size: 15px; color: #14100d; } html.og-js .mpp-desk .og-more-count + .og-phone-more { margin-top: 6px; } }` : '',
  ].join('\n');

  const phoneLeft = pageCount - phone;
  const deskLeft = total - desk;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {phoneFolds && (
        <div className="mpp-phone">
          <p className="og-more-count" aria-live="polite">{Math.min(phone, pageCount).toLocaleString('en-GB')} of {pageCount.toLocaleString('en-GB')}</p>
          {phoneLeft > 0 && (
            <button type="button" className="og-phone-more" onClick={() => setPhone(phone + PHONE_STEP)}>
              Show {Math.min(PHONE_STEP, phoneLeft).toLocaleString('en-GB')} more
            </button>
          )}
          {phone > PHONE_FIRST && (
            <button type="button" className="og-phone-more" onClick={() => setPhone(PHONE_FIRST)}>
              Show fewer
            </button>
          )}
        </div>
      )}
      {deskFolds && (
        <div className="mpp-desk">
          <p className="og-more-count" aria-live="polite">{Math.min(desk, total).toLocaleString('en-GB')} of {total.toLocaleString('en-GB')}</p>
          {deskLeft > 0 && (
            <button type="button" className="og-phone-more" onClick={() => setDesk(desk + DESK_STEP)}>
              Show {Math.min(DESK_STEP, deskLeft).toLocaleString('en-GB')} more
            </button>
          )}
          {desk > DESK_FIRST && (
            <button type="button" className="og-phone-more" onClick={() => setDesk(DESK_FIRST)}>
              Show fewer
            </button>
          )}
        </div>
      )}
    </>
  );
}

function SinglePartyView({
  partyName,
  partyColour,
  partyMPs,
  totalInParty,
  searchTerm,
  setSearchTerm,
  requestedPage,
}: {
  partyName: string;
  partyColour: string;
  partyMPs: MP[];                    // already alphabetised in parent
  totalInParty: number;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  requestedPage: number;
}) {
  const totalPages = Math.max(1, Math.ceil(partyMPs.length / MPS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIdx = (currentPage - 1) * MPS_PER_PAGE;
  const endIdx = Math.min(startIdx + MPS_PER_PAGE, partyMPs.length);
  const pageCount = endIdx - startIdx;

  // Build hrefs for Prev/Next that keep ?expand= and omit ?page= when 1.
  const partyParam = `expand=${encodeURIComponent(partyName)}`;
  const hrefFor = (p: number) => (p <= 1 ? `/mps?${partyParam}` : `/mps?${partyParam}&page=${p}`);

  return (
    <>
      <Link
        href="/mps"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          color: INK,
          textDecoration: 'none',
          fontSize: '16px',
          transform: 'rotate(-0.2deg)',
        }}
      >
        All parties
      </Link>

      <header style={{ marginBottom: '24px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            aria-hidden
            style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', background: partyColour, flexShrink: 0 }}
          />
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '-0.01em', transform: 'rotate(-0.2deg)' }}>
            {partyName}
          </h2>
          <span style={{ fontSize: '15px', marginLeft: '8px' }}>({totalInParty} MPs)</span>
        </div>
      </header>

      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        count={partyMPs.length}
        total={totalInParty}
        label="MPs in this party"
      />

      {partyMPs.length > MPS_PER_PAGE && (
        <p className="mpp-phone" style={{ fontSize: '15px', marginBottom: '16px' }}>
          Showing {startIdx + 1}-{endIdx} of {partyMPs.length.toLocaleString()} · page {currentPage} of {totalPages}
        </p>
      )}

      {/* Every MP of the party is in the grid (MPS-PARTY, ENTRY 284). Up to 1,023px a rule shows only this page's 21, and
          inside them 3, then "Show 10 more" (L7, ENTRY 155), as before. From 1,024px there are no pages: 20, then "Show 20
          more". The folds need html.og-js; the page's own 21 do not (that slice was always there). PartyFold below. */}
      <div
        id="mps-party-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
          width: '100%',
        }}
      >
        {/* The tilt follows the card's place in its page of 21, as when only the page was in the grid. */}
        {partyMPs.map((mp, idx) => (
          <MPCard key={mp.member_id} mp={mp} fromParty={partyName} idx={idx % MPS_PER_PAGE} />
        ))}
      </div>
      <PartyFold
        key={`${partyName}-${currentPage}-${partyMPs.length}`}
        total={partyMPs.length}
        startIdx={startIdx}
        pageCount={pageCount}
        requestedPage={requestedPage > 1 ? currentPage : 1}
      />

      {partyMPs.length === 0 && searchTerm.trim() && (
        <p style={{ fontSize: '15px', marginTop: '24px' }}>
          No MPs in {partyName} match &ldquo;{searchTerm}&rdquo;.
        </p>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mpp-phone"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            marginTop: '32px',
            fontSize: '15px',
          }}
        >
          {currentPage > 1 ? (
            <Link href={hrefFor(currentPage - 1)} style={{ padding: '8px 14px', border: `1px solid ${INK_HAIRLINE}`, color: INK, textDecoration: 'none' }}>
              ← Previous
            </Link>
          ) : (
            <Unavailable note="no earlier page" style={{ padding: '8px 14px', border: `1px dashed ${INK_HAIRLINE}` }}>← Previous</Unavailable>
          )}
          <span style={{ padding: '8px 14px', border: `1px solid ${INK_HAIRLINE}`, background: 'rgba(122,22,18,0.06)' }}>
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={hrefFor(currentPage + 1)} style={{ padding: '8px 14px', border: `1px solid ${INK_HAIRLINE}`, color: INK, textDecoration: 'none' }}>
              Next →
            </Link>
          ) : (
            <Unavailable note="no later page" style={{ padding: '8px 14px', border: `1px dashed ${INK_HAIRLINE}` }}>Next →</Unavailable>
          )}
        </nav>
      )}
    </>
  );
}

function AllPartiesView({
  sortedParties,
  totalMPs,
  matches,
  searchTerm,
  setSearchTerm,
}: {
  sortedParties: [string, MP[]][];
  totalMPs: number;
  matches: MP[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}) {
  // With no search, browse by party (clickable headers). The moment the
  // reader searches, show the matching MPs themselves as cards that link
  // straight to the profile — searching a name should reach the person,
  // not dump you back on the party.
  const searching = searchTerm.trim().length > 0;
  // Every match, best first, 60 a page (SEARCH-ALL batch 2: no cap hides a match; was the first 60 only).
  const PER_PAGE = 60;
  const [page, setPage] = useState(1);
  const [pageFor, setPageFor] = useState(searchTerm);
  if (pageFor !== searchTerm) { setPageFor(searchTerm); setPage(1); }
  const pages = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const shownMatches = searching ? matches.slice((page - 1) * PER_PAGE, page * PER_PAGE) : [];
  // Next and Previous take the reader back to the top of the matches (T2, 18 Nov 2026).
  const goPage = (n: number) => { setPage(n); requestAnimationFrame(() => document.getElementById('mps-matches')?.scrollIntoView({ block: 'start' })); };

  return (
    <>
      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        count={matches.length}
        total={totalMPs}
        label="MPs"
      />

      {searching ? (
        matches.length === 0 ? (
          // A postcode (whole or part-typed) never matches a name, so "No MPs match" would
          // show while the lookup runs or before the postcode is complete (audit M5).
          POSTCODE_RE.test(searchTerm.toUpperCase().replace(/\s+/g, '')) ? null
          : /^[A-Z]{1,2}\d[A-Z\d]?\s?\d?[A-Z]?$/i.test(searchTerm.trim()) ? (
            <p style={{ fontSize: '15px', marginTop: '8px' }}>
              Keep typing the full postcode to find the MP.
            </p>
          ) : (
          <p style={{ fontSize: '15px', marginTop: '8px' }}>
            No MPs match &ldquo;{searchTerm}&rdquo;.
          </p>
          )
        ) : (
          <>
            <div
              id="mps-matches"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '20px',
                width: '100%',
              }}
            >
              {shownMatches.map((mp, idx) => (
                <MPCard key={mp.member_id} mp={mp} fromParty={normaliseParty(mp.party)} idx={idx} />
              ))}
            </div>
            {pages > 1 && (
              <nav aria-label="Pages of matching MPs" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '16px', fontSize: '15px' }}>
                <button type="button" disabled={page <= 1} onClick={() => goPage(page - 1)} style={{ minHeight: '44px', padding: '6px 14px', background: 'transparent', color: '#14100d', border: '1px solid #14100d', borderStyle: page <= 1 ? 'dashed' : 'solid', textDecoration: page <= 1 ? 'line-through' : 'none', fontFamily: 'inherit', fontSize: '15px', cursor: page <= 1 ? 'default' : 'pointer' }}>Previous page</button>
                <span>Page {page} of {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => goPage(page + 1)} style={{ minHeight: '44px', padding: '6px 14px', background: 'transparent', color: '#14100d', border: '1px solid #14100d', borderStyle: page >= pages ? 'dashed' : 'solid', textDecoration: page >= pages ? 'line-through' : 'none', fontFamily: 'inherit', fontSize: '15px', cursor: page >= pages ? 'default' : 'pointer' }}>Next page</button>
              </nav>
            )}
          </>
        )
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            columnGap: '32px',
            rowGap: '4px',
            alignItems: 'start',
          }}
        >
          {sortedParties.map(([party, partyMPs]) => {
            const partyColour = resolvePartyColour(party, partyMPs);
            return (
              <Link
                key={party}
                href={`/mps?expand=${encodeURIComponent(party)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  color: INK,
                  textDecoration: 'none',
                  borderBottom: `1px solid ${INK_HAIRLINE}`,
                  marginBottom: '4px',
                }}
                className="no-hover-scale"
              >
                <span
                  aria-hidden
                  style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: partyColour, flexShrink: 0 }}
                />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{party}</span>
                <span style={{ fontSize: '15px', marginLeft: '8px' }}>({partyMPs.length})</span>
                <span style={{ marginLeft: 'auto', fontSize: '22px', lineHeight: 1 }}>→</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
