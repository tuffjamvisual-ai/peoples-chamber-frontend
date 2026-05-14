'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { parties as partyMeta } from '@/lib/parties';

type MP = {
  id: number;
  member_id: number;
  name: string;
  party: string;
  party_colour: string | null;
  constituency: string;
  photo_url: string | null;
};

const ink = '#14100d';
const inkSoft = 'rgba(20,16,13,0.7)';
const inkHairline = 'rgba(20,16,13,0.3)';
const cream = '#ebe5d8';

export default function MagazineMPsClient({ mps }: { mps: MP[] }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggleParty = (party: string) => setExpanded((prev) => (prev === party ? null : party));
  const isSearching = search.trim() !== '';
  const isOpen = (party: string) => isSearching || expanded === party;

  const filtered = useMemo(() => {
    if (!search.trim()) return mps;
    const q = search.toLowerCase();
    return mps.filter(
      (mp) =>
        mp.name.toLowerCase().includes(q) ||
        mp.constituency.toLowerCase().includes(q) ||
        mp.party.toLowerCase().includes(q),
    );
  }, [mps, search]);

  const byParty = useMemo(() => {
    const acc: Record<string, MP[]> = {};
    for (const mp of filtered) {
      const p = mp.party || 'Independent';
      (acc[p] ||= []).push(mp);
    }
    return acc;
  }, [filtered]);

  const parties = Object.keys(byParty).sort((a, b) => byParty[b].length - byParty[a].length);

  return (
    <div style={{ color: ink, fontFamily: 'Special Elite, monospace' }}>
      <header style={{ borderBottom: `1px solid ${inkHairline}`, paddingBottom: '32px', marginBottom: '32px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
          The People&apos;s Chamber · Members
        </p>
        <h1 style={{ fontSize: '44px', fontWeight: 'bold', letterSpacing: '-0.01em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Members of Parliament
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '640px' }}>
          All {mps.length.toLocaleString()} sitting MPs in the House of Commons. Search by name, constituency, or party. Tap an MP for voting record, financial interests, sponsored bills, and contact details.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1px', background: inkHairline, marginTop: '24px', border: `1px solid ${inkHairline}` }}>
          <Stat label="Sitting MPs" value={mps.length} />
          <Stat label="Parties Represented" value={parties.length} />
          <Stat label="Filtered Result" value={filtered.length} accent />
        </div>
      </header>

      <div style={{ marginBottom: '32px' }}>
        <label htmlFor="mp-search" style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 500, marginBottom: '8px' }}>
          Search
        </label>
        <input
          id="mp-search"
          type="search"
          placeholder="Name, constituency, or party…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '40%',
            minWidth: '260px',
            background: cream,
            color: ink,
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: 1.7,
            border: `1px solid ${inkHairline}`,
            borderRadius: '2px',
            padding: '10px 14px',
            outline: 'none',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ borderTop: `1px solid ${inkHairline}`, paddingTop: '24px', fontSize: '14px' }}>
          No MPs match &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <div>
          {parties.map((party) => {
            const partyColour = byParty[party][0]?.party_colour ? `#${byParty[party][0].party_colour!.replace('#', '')}` : '#7697a2';
            const count = byParty[party].length;
            const meta = partyMeta.find((p) => p.name === party);
            const open = isOpen(party);
            return (
              <section key={party} style={{ borderTop: `1px solid ${inkHairline}` }}>
                <button
                  onClick={() => toggleParty(party)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: ink,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden
                    style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: partyColour, flexShrink: 0 }}
                  />
                  <h2 style={{ fontSize: '17px', fontWeight: 'bold', letterSpacing: '-0.005em' }}>{party}</h2>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'monospace' }}>
                    {count} MP{count === 1 ? '' : 's'} {open ? '▲' : '▼'}
                  </span>
                </button>

                {open && meta?.description && (
                  <p style={{ padding: '0 8px 12px', color: inkSoft, fontSize: '13px', lineHeight: 1.6 }}>{meta.description}</p>
                )}

                {open && (
                  <ul
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: '1px',
                      background: inkHairline,
                      border: `1px solid ${inkHairline}`,
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 24px 0',
                    }}
                  >
                    {byParty[party].map((mp) => (
                      <li key={mp.id} style={{ background: cream }}>
                        <Link
                          href={`/mps/${mp.member_id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '14px',
                            borderLeft: '2px solid transparent',
                            color: ink,
                            textDecoration: 'none',
                            transition: 'background 0.15s, border-color 0.15s',
                          }}
                        >
                          {mp.photo_url ? (
                            <Image
                              src={mp.photo_url}
                              alt={mp.name}
                              width={56}
                              height={56}
                              loading="lazy"
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                background: cream,
                                border: `1px solid ${partyColour}`,
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: '#d6cdb8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                border: `1px solid ${partyColour}`,
                                flexShrink: 0,
                              }}
                            >
                              {mp.name?.charAt(0)}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {mp.name}
                            </h3>
                            <p style={{ fontSize: '13px', lineHeight: 1.5, color: inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {mp.constituency}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ padding: '16px 18px', background: cream }}>
      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 500, marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: accent ? '#7a1612' : '#14100d' }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
