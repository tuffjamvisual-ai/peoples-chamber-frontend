// Basic page for a former MP who is not in our mps table (lib/former-mps.ts; owner's decision, 28 Oct 2026). Same
// heading style as a former member's full profile in MpDossier ("Former MP for X (2015 to 2024)"), with every seat
// held and the dates, from Parliament's Members API. No Sources fold (T1-MPCLEAN2, owner 12 Nov 2026). Any Standards
// findings follow (3 Nov 2026). Nothing sits below the sections (owner, 8 Nov 2026, FM1, as MP1 did for sitting MPs): the
// links the Related line held (their record at Prime Minister's Questions, their House of Lords page, reports that name
// them) are part of "Time in the House of Commons".
import StandardsCasesLine from '../../components/StandardsCasesLine';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs, buildMpPerson } from '@/lib/JsonLd';
import type { RelatedLink } from '@/lib/related-links';
import { lastSeatLine, seatYears, type FormerMp } from '@/lib/former-mps';
import StandardsFindings, { type ConductFinding } from './StandardsFindings';
import HistoricRecord from './HistoricRecord';

import BackLink from '@/app/components/BackLink';
const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const line = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 10px', maxWidth: '46em' } as const;

// Parliament's dates carry no time zone ("2005-05-05T00:00:00"): read the date part only, so the day never shifts.
const fmtDay = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null);

export default function FormerMpProfile({ mp, conductFindings = [], related = [] }: { mp: FormerMp; conductFindings?: ConductFinding[]; related?: RelatedLink[] }) {
  const lastSeat = mp.seats[mp.seats.length - 1];
  // Parliament's member record gives the last seat with the whole span of service, so the two are never paired (owner, 7 Nov 2026).
  const lastSeatOnly = !!mp.lastSeatOnly && !!lastSeat;
  return (
    <OpenGovShell pageStamp="MP Profile">
      {/* Person (owner's brief, 3 Nov 2026): a former member, so name, url and sameAs only (lib/JsonLd.tsx). */}
      <JsonLd data={buildMpPerson({ memberId: mp.memberId, fullName: mp.name, party: mp.party ?? null, former: true })} />
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'MPs', path: '/mps' }, { name: mp.name, path: `/mps/${mp.memberId}` }])} />
      {/* "All MPs" (UX1f, 9 Nov 2026), as on a current MP's profile: says where it leads. */}
      <BackLink fallbackHref="/mps" />
      <h1 style={{ fontSize: 'clamp(22px, 3.4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 12px', color: INK, overflowWrap: 'break-word' }}>{mp.name}</h1>
      {lastSeat && (
        <div style={{ fontSize: 'clamp(15px, 1.9vw, 25px)', marginBottom: '8px', color: INK }}>
          {/* T1-5x (owner, 10 Nov 2026): the seat here; the dates and the caveat once, in Time in the House of Commons. */}
          Former MP for {lastSeat.constituency}
        </div>
      )}
      {mp.party && (
        <div style={{ fontSize: 'clamp(15px, 1.9vw, 25px)', marginBottom: '28px', color: INK }}>
          {mp.partyColour && <span aria-hidden="true" style={{ display: 'inline-block', width: '0.7em', height: '0.7em', borderRadius: '50%', background: mp.partyColour, marginRight: '0.4em', verticalAlign: 'middle' }} />}
          {mp.party}
        </div>
      )}

      <StandardsCasesLine memberId={mp.memberId} />

      <section data-main-action style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
          Time in the House of Commons
        </h2>
        {lastSeatOnly && <p style={line}>{lastSeatLine(mp)}{lastSeat.from ? ` Dates in Parliament\u2019s record: ${fmtDay(lastSeat.from)}${lastSeat.to ? ` to ${fmtDay(lastSeat.to)}` : ' onwards'}.` : ''}</p>}
        {!lastSeatOnly && mp.seats.length > 0 && <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
          {mp.seats.map((s) => (
            <li key={`${s.constituency}-${s.from}`} style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, padding: '6px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <strong>{s.constituency}</strong>, {seatYears(s)}
              <span style={{ display: 'block' }}>
                From {fmtDay(s.from)}{s.to ? ` to ${fmtDay(s.to)}` : ''}
              </span>
            </li>
          ))}
        </ul>}
        {mp.seats.length === 0 && <p style={line}>Parliament&rsquo;s record for {mp.name} gives no Commons seat or dates.</p>}
        <p style={line}>
          {mp.name} is no longer an MP.{mp.sitsInLords ? ' They now sit in the House of Lords.' : ''} opengovt keeps full profiles for current MPs; this page {lastSeatOnly ? 'records their last seat and the dates in Parliament’s record' : mp.lastSeatOnly ? 'links to their record at Prime Minister’s Questions' : 'records the seats held and the dates served'}.
        </p>
        {related.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }} aria-label={`More on ${mp.name}`}>
            {related.map((r) => (
              <li key={r.href} style={{ ...line, margin: '0 0 4px' }}>
                <Link href={r.href} className="og-tap" style={{ color: INK, textDecoration: 'underline' }}>{r.label}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StandardsFindings findings={conductFindings} />
      <HistoricRecord memberId={mp.memberId} />
    </OpenGovShell>
  );
}
