// PMQs attendance since 1979: the House of Commons Library's Table 1 and missed dates (SN04401, updated 4 November 2026),
// with four wrong member ids corrected (corrections_to_source in the data file). The file is kept as prepared; the one
// name Parliament spells differently is corrected here.
import Link from 'next/link';
import NoJsPager, { NoJsFold } from '@/app/components/NoJsPager';
import { SubFold } from '@/app/components/PhoneFolds';
import data from '@/lib/data/pmqs-attendance-2026-11-04.json';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SPELLING: Record<string, string> = { 'Gillian Shepherd': 'Gillian Shephard' };
// Where Hansard records a different date from the Library's file: Hansard's date, with a note.
const HANSARD_DATE: Record<string, { date: string; note: string }> = { '2026-07-07': { date: '2026-07-08', note: 'Commons Library lists 7 July' } };

const CREDIT = "Source: House of Commons Library, Attendance of the Prime Minister at Prime Minister's Questions since 1979 (SN04401), updated 4 November 2026. Member ids checked against Parliament's Members API by opengovt.";

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const th = { padding: '8px 6px', textAlign: 'left' as const, borderBottom: `2px solid ${INK}` };
const thNum = { ...th, textAlign: 'right' as const };
const td = { padding: '6px', verticalAlign: 'top' as const };
const tdNum = { ...td, textAlign: 'right' as const };
const rowLine = { borderBottom: `1px solid ${HAIRLINE}` };
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '15px' };
const h2 = { fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '0 0 12px' };
const h3 = { fontSize: '18px', fontWeight: 'bold', margin: '28px 0 10px' };

// EL1 (owner, 10 Nov 2026): the Library's briefing is linked in the page's Sources fold.
export const PMQS_ATTENDANCE_SOURCE = { label: "House of Commons Library, Attendance of the Prime Minister at Prime Minister's Questions since 1979 (SN04401)", href: data.source.url };

export default function PmqsAttendance() {
  return (
    <section aria-labelledby="pmqs-attendance" style={{ color: INK }}>
      <h2 id="pmqs-attendance" style={h2}>PMQs attendance since 1979</h2>

      <h3 style={h3}>Attendance by Prime Minister</h3>
      {/* Folded on phones (step 5, 10 Nov 2026: the page was 5,098px). */}
      <NoJsFold id="pmqs-pms-f" always label={`The ${data.attendance.length.toLocaleString('en-GB')} Prime Ministers`}>
      <NoJsPager id="pmqs-pms" count={data.attendance.length} rows="> tbody > tr" size={25} cards={[null, 'Sessions', 'Attended', 'Missed', 'Per cent missed']} title={1}>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Prime Minister</th>
            <th style={thNum}>Sessions</th>
            <th style={thNum}>Attended</th>
            <th style={thNum}>Missed</th>
            <th style={thNum}>Per cent missed</th>
          </tr>
        </thead>
        <tbody>
          {data.attendance.map((r) => (
            <tr key={r.prime_minister} style={rowLine}>
              <td style={td}>{r.prime_minister}</td>
              <td style={tdNum}>{r.sessions.toLocaleString('en-GB')}</td>
              <td style={tdNum}>{r.attended.toLocaleString('en-GB')}</td>
              <td style={tdNum}>{r.missed}</td>
              <td style={tdNum}>{r.per_cent_missed.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </NoJsPager>
      </NoJsFold>

      {/* A native fold, closed, at every width (owner, 6 Nov 2026). */}
      <details className="pa-fold" style={{ marginTop: '28px' }}>
      <summary>The {data.missed_dates.length} sessions the Prime Minister missed</summary>
      <div className="pc-wide">
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Date</th>
            <th style={th}>Prime Minister</th>
            <th style={th}>Reason</th>
            <th style={th}>Deputised by</th>
            <th style={th}>Opposition member</th>
          </tr>
        </thead>
        <tbody>
          {data.missed_dates.map((m) => (
            <tr key={m.date} style={rowLine}>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                {longDate(HANSARD_DATE[m.date]?.date ?? m.date)}
                {HANSARD_DATE[m.date] && <div style={{ whiteSpace: 'normal' }}>{HANSARD_DATE[m.date].note}</div>}
              </td>
              <td style={td}>{m.prime_minister}</td>
              <td style={td}>{m.reason}</td>
              <td style={td}>
                <Link href={`/mps/${m.deputy_member_id}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{m.deputy}</Link>
              </td>
              <td style={td}>{m.opposition_member ? (SPELLING[m.opposition_member] ?? m.opposition_member) : null}</td>
            </tr>
          ))}
        </tbody>
      </table>

      </div>
      {/* Phones: the same rows as a list, so the page stays within 10,000px with the fold open (owner, 7 Nov 2026): 15 a
          screen with Previous and Next links, with JavaScript on as well as off (NoJsPager always; PF1, 7 Nov 2026). At 25
          the open fold measured 11,353px with JavaScript on and 10,864px off, over the limit; at 15 it was 9,400px. */}
      <div className="pc-narrow">
        <NoJsPager id="pmqs-missed" always count={data.missed_dates.length} rows="> li" size={15}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '15px', lineHeight: 1.6 }}>
          {data.missed_dates.map((m) => (
            <li key={m.date} style={{ padding: '10px 0', ...rowLine }}>
              <strong>{longDate(HANSARD_DATE[m.date]?.date ?? m.date)}</strong>
              {HANSARD_DATE[m.date] && <div>{HANSARD_DATE[m.date].note}</div>}
              <div>Prime Minister: {m.prime_minister}</div>
              <div>Reason: {m.reason}</div>
              <div>Deputised by: <Link href={`/mps/${m.deputy_member_id}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{m.deputy}</Link></div>
              {m.opposition_member && <div>Opposition member: {SPELLING[m.opposition_member] ?? m.opposition_member}</div>}
            </li>
          ))}
        </ul>
        </NoJsPager>
      </div>
      </details>

      {/* The note and source folded on phones (step 5, 10 Nov 2026: page length). */}
      <SubFold label="Note and source">
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '20px 0 0' }}>{data.source.note_1}.</p>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '12px 0 0' }}>
        {CREDIT} The Library&rsquo;s briefing is in Sources at the end of the page.
      </p>
      </SubFold>
    </section>
  );
}
