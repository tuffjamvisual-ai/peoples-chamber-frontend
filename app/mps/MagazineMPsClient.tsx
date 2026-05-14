'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface MP {
  id: number;
  member_id: number;
  name: string;
  display_name?: string | null;
  photo_url: string | null;
  party: string;
  constituency: string;
}

export default function MagazineMPsClient({ mps }: { mps: MP[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMPs = mps.filter((mp) => {
    const q = searchTerm.toLowerCase();
    return (
      (mp.display_name || mp.name || '').toLowerCase().includes(q) ||
      (mp.constituency || '').toLowerCase().includes(q) ||
      (mp.party || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '32px 0', fontFamily: 'Special Elite, monospace', color: '#14100d' }}>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '32px',
        }}
      >
        {filteredMPs.map((mp, idx) => {
          // Vary the polaroid tilt slightly so they don't all lean identically.
          const tilt = ((idx % 5) - 2) * 1.5 - 0.5; // ~ -3.5° … +2.5°
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

              <div style={{ flex: 1, paddingTop: '10px', minWidth: 0 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px', lineHeight: 1.25 }}>
                  {mp.display_name || mp.name}
                </h3>
                <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '2px' }}>{mp.constituency}</p>
                <p style={{ fontSize: '13px', opacity: 0.8 }}>{mp.party}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
