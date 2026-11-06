'use client';

import NoJsPager from '@/app/components/NoJsPager';
import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import type { PeerListRow } from '@/lib/lords';

// The /lords list (owner, 3 Nov 2026): every current peer, filtered by party and type of peerage in the browser.
// Peers on leave of absence, suspended or disqualified carry their status.

const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';
const select: CSSProperties = { padding: '8px 12px', background: 'rgba(20,16,13,0.05)', color: INK, border: '1px solid rgba(20,16,13,0.3)', borderRadius: 0, fontFamily: MONO, fontSize: '15px', maxWidth: '100%' };
const label: CSSProperties = { display: 'block', fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' };
const fmtYear = (d: string | null) => (d ? d.slice(0, 4) : '');

export default function LordsIndex({ peers }: { peers: PeerListRow[] }) {
  const [party, setParty] = useState('');
  const [type, setType] = useState('');
  const count = (key: 'party' | 'peerage_type') => {
    const m = new Map<string, number>();
    for (const p of peers) { const v = p[key] || 'Not recorded'; m.set(v, (m.get(v) ?? 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const parties = useMemo(() => count('party'), [peers]); // eslint-disable-line react-hooks/exhaustive-deps
  const types = useMemo(() => count('peerage_type'), [peers]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = peers.filter((p) => (!party || (p.party || 'Not recorded') === party) && (!type || (p.peerage_type || 'Not recorded') === type));

  return (
    <div style={{ color: INK }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <label htmlFor="lords-party" style={label}>Party</label>
          <select id="lords-party" value={party} onChange={(e) => setParty(e.target.value)} style={select}>
            <option value="">All parties</option>
            {parties.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lords-type" style={label}>Type of peerage</label>
          <select id="lords-type" value={type} onChange={(e) => setType(e.target.value)} style={select}>
            <option value="">All types</option>
            {types.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
          </select>
        </div>
      </div>
      <p aria-live="polite" style={{ fontSize: '15px', margin: '0 0 8px' }}>{shown.length.toLocaleString('en-GB')} member{shown.length === 1 ? '' : 's'}</p>
      <NoJsPager id="lords-list" count={(shown).length} rows="> li" size={25}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px' }}>
        {shown.map((p) => (
          <li key={p.member_id} style={{ padding: '7px 0', borderBottom: '1px dashed rgba(20,16,13,0.2)', display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Link href={`/lords/${p.member_id}`} style={{ color: '#7a1612', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.name_display}</Link>
            <span>
              {p.party_colour && <span aria-hidden style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: `#${p.party_colour}`, marginRight: '6px' }} />}
              {[p.party, p.peerage_type, p.start_date ? `since ${fmtYear(p.start_date)}` : ''].filter(Boolean).join(' · ')}
            </span>
            {p.status && p.status !== 'Current Member' && <span style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a1612' }}>{p.status}</span>}
          </li>
        ))}
      </ul>
      </NoJsPager>
    </div>
  );
}
