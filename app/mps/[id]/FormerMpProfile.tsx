// Basic page for a former MP who is not in our mps table (lib/former-mps.ts; owner's decision, 28 Oct 2026). Same
// heading style as a former member's full profile in MpDossier ("Former MP for X (2015 to 2024)"), with every seat
// held and the dates, from Parliament's Members API. The full Parliament record is linked as the source. Any Standards
// findings follow (3 Nov 2026).
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import JsonLd, { buildBreadcrumbs, buildMpPerson } from '@/lib/JsonLd';
import RelatedLine from '../../components/RelatedLine';
import type { RelatedLink } from '@/lib/related-links';
import { lastSeatLine, parliamentMemberUrl, seatYears, type FormerMp } from '@/lib/former-mps';
import StandardsFindings, { type ConductFinding } from './StandardsFindings';
import HistoricRecord from './HistoricRecord';

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
      <BackLink fallbackHref="/mps" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)' }} />
      <h1 style={{ fontSize: 'clamp(22px, 3.4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 12px', color: INK, overflowWrap: 'break-word' }}>{mp.name}</h1>
      {lastSeat && (
        <div style={{ fontSize: 'clamp(15px, 1.9vw, 25px)', marginBottom: '8px', color: INK }}>
          {lastSeatOnly ? lastSeatLine(mp) : <>Former MP for {lastSeat.constituency}{mp.firstYear && mp.lastYear ? ` (${mp.firstYear} to ${mp.lastYear})` : ''}</>}
        </div>
      )}
      {mp.party && (
        <div style={{ fontSize: 'clamp(15px, 1.9vw, 25px)', marginBottom: '28px', color: INK }}>
          {mp.partyColour && <span aria-hidden="true" style={{ display: 'inline-block', width: '0.7em', height: '0.7em', borderRadius: '50%', background: mp.partyColour, marginRight: '0.4em', verticalAlign: 'middle' }} />}
          {mp.party}
        </div>
      )}

      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
          Time in the House of Commons
        </h2>
        {lastSeatOnly && lastSeat.from && <p style={line}>Dates in Parliament&rsquo;s record: {fmtDay(lastSeat.from)}{lastSeat.to ? ` to ${fmtDay(lastSeat.to)}` : ' onwards'}.</p>}
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
        <p style={line}>
          <Link href="/mps" className="og-tap" style={{ color: INK, textDecoration: 'underline' }}>Find your current MP</Link>.
        </p>
        <p style={line}>
          Source: <a href={parliamentMemberUrl(mp.memberId)} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>UK Parliament, {mp.name}: career</a> (Members API).
        </p>
      </section>

      <StandardsFindings findings={conductFindings} />
      <HistoricRecord memberId={mp.memberId} />
      {/* The compact Related line at the end (owner's brief, 3 Nov 2026): reports that name them, when there are any. */}
      <RelatedLine links={related} />
    </OpenGovShell>
  );
}
