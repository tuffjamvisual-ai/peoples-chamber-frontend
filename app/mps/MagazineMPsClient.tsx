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
// Search filters inside whichever view is active.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ScrollToTopButton from '../components/ScrollToTopButton';

interface MP {
  member_id: number;
  name: string;
  photo_url: string | null;
  party: string;
  constituency: string;
  party_colour?: string | null;
}

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';

export default function MagazineMPsClient({ mps }: { mps: MP[] }) {
  const searchParams = useSearchParams();
  const selectedParty = searchParams.get('expand');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMPs = useMemo(() => {
    if (!searchTerm.trim()) return mps;
    const q = searchTerm.toLowerCase();
    return mps.filter(
      (mp) =>
        mp.name.toLowerCase().includes(q) ||
        (mp.constituency || '').toLowerCase().includes(q) ||
        (mp.party || '').toLowerCase().includes(q),
    );
  }, [mps, searchTerm]);

  const mpsByParty = useMemo(() => {
    const acc: Record<string, MP[]> = {};
    for (const mp of filteredMPs) {
      const p = mp.party || 'Independent';
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
    for (const mp of mps) set.add(mp.party || 'Independent');
    return set;
  }, [mps]);

  const partyExists = selectedParty != null && allPartyNames.has(selectedParty);
  const selectedPartyMPs = partyExists ? mpsByParty[selectedParty!] || [] : [];
  const selectedPartyColour =
    partyExists && selectedPartyMPs[0]?.party_colour
      ? `#${selectedPartyMPs[0].party_colour!.replace('#', '')}`
      : partyExists
        ? (() => {
            const fromAll = mps.find((m) => (m.party || 'Independent') === selectedParty);
            return fromAll?.party_colour ? `#${fromAll.party_colour.replace('#', '')}` : '#7697a2';
          })()
        : '#7697a2';

  return (
    <div style={{ padding: '32px 0', fontFamily: 'Special Elite, monospace', color: INK }}>
      {partyExists ? (
        <SinglePartyView
          partyName={selectedParty!}
          partyColour={selectedPartyColour}
          partyMPs={selectedPartyMPs}
          totalInParty={mps.filter((m) => (m.party || 'Independent') === selectedParty).length}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      ) : (
        <AllPartiesView
          sortedParties={sortedParties}
          totalMPs={mps.length}
          filteredMPs={filteredMPs.length}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      )}

      <ScrollToTopButton />
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
  return (
    <div style={{ marginBottom: '24px' }}>
      <input
        type="text"
        placeholder="Search MPs…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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
      <p style={{ marginTop: '8px', fontSize: '13px', opacity: 0.75 }}>
        {count} of {total} {label}
      </p>
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
        <p style={{ fontSize: '13px', opacity: 0.8 }}>{mp.constituency}</p>
      </div>
    </Link>
  );
}

function SinglePartyView({
  partyName,
  partyColour,
  partyMPs,
  totalInParty,
  searchTerm,
  setSearchTerm,
}: {
  partyName: string;
  partyColour: string;
  partyMPs: MP[];
  totalInParty: number;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}) {
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
        ← All parties
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
          <span style={{ fontSize: '15px', opacity: 0.75, marginLeft: '8px' }}>({totalInParty} MPs)</span>
        </div>
      </header>

      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        count={partyMPs.length}
        total={totalInParty}
        label="MPs in this party"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
          width: '100%',
        }}
      >
        {partyMPs.map((mp, idx) => (
          <MPCard key={mp.member_id} mp={mp} fromParty={partyName} idx={idx} />
        ))}
      </div>

      {partyMPs.length === 0 && searchTerm.trim() && (
        <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '24px' }}>
          No MPs in {partyName} match &ldquo;{searchTerm}&rdquo;.
        </p>
      )}
    </>
  );
}

function AllPartiesView({
  sortedParties,
  totalMPs,
  filteredMPs,
  searchTerm,
  setSearchTerm,
}: {
  sortedParties: [string, MP[]][];
  totalMPs: number;
  filteredMPs: number;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}) {
  return (
    <>
      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        count={filteredMPs}
        total={totalMPs}
        label="MPs"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          columnGap: '32px',
          rowGap: '4px',
          alignItems: 'start',
        }}
      >
        {sortedParties.map(([party, partyMPs]) => {
          const partyColour = partyMPs[0]?.party_colour
            ? `#${partyMPs[0].party_colour!.replace('#', '')}`
            : '#7697a2';
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
              <span style={{ fontSize: '13px', opacity: 0.75, marginLeft: '8px' }}>({partyMPs.length})</span>
              <span style={{ marginLeft: 'auto', fontSize: '22px', lineHeight: 1 }}>→</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
