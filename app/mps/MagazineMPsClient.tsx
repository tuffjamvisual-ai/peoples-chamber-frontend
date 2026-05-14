'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ScrollToTopButton from '../components/ScrollToTopButton';

interface MP {
  id: number;
  member_id: number;
  name: string;
  display_name?: string | null;
  photo_url: string | null;
  party: string;
  constituency: string;
  party_colour?: string | null;
}

export default function MagazineMPsClient({ mps }: { mps: MP[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filteredMPs = useMemo(() => {
    if (!searchTerm.trim()) return mps;
    const q = searchTerm.toLowerCase();
    return mps.filter((mp) => {
      const n = mp.display_name || mp.name || '';
      return (
        n.toLowerCase().includes(q) ||
        (mp.constituency || '').toLowerCase().includes(q) ||
        (mp.party || '').toLowerCase().includes(q)
      );
    });
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

  const isSearching = searchTerm.trim() !== '';
  const toggleParty = (party: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(party)) next.delete(party);
      else next.add(party);
      return next;
    });
  };
  // While searching, every group is visible — keeps results obvious.
  const isOpen = (party: string) => isSearching || expanded.has(party);

  return (
    <div style={{ padding: '32px 0', fontFamily: 'Special Elite, monospace', color: '#14100d' }}>
      <a
        href="/mps"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          color: '#14100d',
          textDecoration: 'none',
          fontSize: '16px',
          transform: 'rotate(-0.2deg)',
        }}
      >
        ← Back to MPs
      </a>

      <div style={{ marginBottom: '32px' }}>
        <input
          type="text"
          placeholder="Search MPs…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '480px',
            padding: '10px 14px',
            border: '2px solid rgba(20,16,13,0.3)',
            background: 'transparent',
            color: '#14100d',
            fontFamily: 'inherit',
            fontSize: '15px',
            outline: 'none',
          }}
        />
        <p style={{ marginTop: '8px', fontSize: '13px', opacity: 0.75 }}>
          {filteredMPs.length} of {mps.length} MPs
        </p>
      </div>

      {sortedParties.map(([party, partyMPs]) => {
        const partyColour = partyMPs[0]?.party_colour ? `#${partyMPs[0].party_colour!.replace('#', '')}` : '#7697a2';
        const open = isOpen(party);
        return (
          <section key={party} style={{ marginBottom: '24px' }}>
            <button
              onClick={() => toggleParty(party)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                border: '2px solid rgba(20,16,13,0.3)',
                background: 'transparent',
                color: '#14100d',
                fontFamily: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden
                style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: partyColour, flexShrink: 0 }}
              />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{party}</span>
              <span style={{ fontSize: '13px', opacity: 0.75, marginLeft: '8px' }}>({partyMPs.length})</span>
              <span style={{ marginLeft: 'auto', fontSize: '22px', lineHeight: 1 }}>{open ? '−' : '+'}</span>
            </button>

            {open && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '24px',
                  marginTop: '20px',
                }}
              >
                {partyMPs.map((mp, idx) => {
                  const tilt = ((idx % 5) - 2) * 1.5 - 0.5;
                  return (
                    <Link
                      key={mp.id}
                      href={`/mps/${mp.member_id}`}
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
                            alt={mp.display_name || mp.name}
                            width={84}
                            height={96}
                            loading="lazy"
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
                              color: '#14100d',
                            }}
                          >
                            {(mp.display_name || mp.name || '?').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, paddingTop: '6px', minWidth: 0 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', lineHeight: 1.25 }}>
                          {mp.display_name || mp.name}
                        </h3>
                        <p style={{ fontSize: '13px', opacity: 0.8 }}>{mp.constituency}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <ScrollToTopButton />
    </div>
  );
}
