// One statutory instrument from the statutory_instruments table (UK Parliament Statutory Instruments API; report 81),
// with its timeline. /statutory-instruments/[id] shows this for an API id; a numeric id is a Commons division on an
// instrument (the older statutory_instrument table) and keeps its own view.

import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { PROCEDURE_MEANING, type SiRow } from '@/lib/parliament-si-treaties';
import { fmtDate, type SiVersions } from '@/lib/si-treaties-data';
import ParliamentSourceCredit from '../../components/ParliamentSourceCredit';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

export default function ApiInstrument({ si, versions }: { si: SiRow; versions: SiVersions }) {
  const today = new Date().toISOString().slice(0, 10);
  // The made version of a draft, and the draft a made instrument came from (lib/si-treaties-data.ts getSiVersions).
  const madeAs = !si.si_number && versions.made
    ? <>Made as <Link href={`/statutory-instruments/${versions.made.api_id}`} style={{ color: ACCENT }}>{versions.made.si_number || versions.made.title}</Link></>
    : null;
  const facts: [string, React.ReactNode][] = [
    ['Number', si.si_number || madeAs || 'Not yet numbered (laid in draft)'],
    ...(versions.draft ? [[versions.draft.procedure?.startsWith('Proposed') ? 'Proposed as' : 'Laid in draft as',
      <Link key="d" href={`/statutory-instruments/${versions.draft.api_id}`} style={{ color: ACCENT }}>{versions.draft.procedure || 'the draft'}{versions.draft.laid_date ? `, laid ${fmtDate(versions.draft.laid_date)}` : ''}</Link>]] as [string, React.ReactNode][] : []),
    ...(versions.made && si.si_number ? [['Followed by', <Link key="m" href={`/statutory-instruments/${versions.made.api_id}`} style={{ color: ACCENT }}>{versions.made.si_number || versions.made.title}</Link>]] as [string, React.ReactNode][] : []),
    ['Procedure', si.procedure || 'Not given'],
    ['Laid by', si.laying_department || 'Not given'],
    ['Laid before Parliament', fmtDate(si.laid_date)],
    ['Made', si.made_date ? fmtDate(si.made_date) : 'Not yet made'],
    ['Comes into force', si.in_force_date ? fmtDate(si.in_force_date) : 'Not given'],
  ];
  const flags = [si.committee_concerns && 'Flagged by a committee', si.prayed_against && 'Prayed against', si.debated && 'Debated'].filter(Boolean) as string[];

  return (
    <OpenGovShell pageStamp="Laws">
      <BackLink fallbackHref="/laws/made-without-a-vote" label="← Laws made without a vote" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <header style={{ marginBottom: '18px' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', marginBottom: '8px' }}>Statutory instrument</div>
        <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 38px)', fontWeight: 'bold', lineHeight: 1.15, margin: '0 0 10px', overflowWrap: 'anywhere' }}>{si.title}</h1>
        {si.procedure && PROCEDURE_MEANING[si.procedure] && <p style={{ fontSize: '16px', lineHeight: 1.7, margin: 0 }}>{PROCEDURE_MEANING[si.procedure]}</p>}
        {flags.length > 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, margin: '8px 0 0' }}>{flags.join(' · ')}</p>}
      </header>

      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr)', gap: '6px 16px', fontFamily: MONO, fontSize: '15px', margin: '0 0 20px' }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}><dt style={{ fontWeight: 'bold' }}>{k}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{v}</dd></div>
        ))}
      </dl>
      {si.legislation_url && (
        <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 24px' }}><a href={si.legislation_url} rel="noopener" style={{ color: ACCENT }}>Read it on legislation.gov.uk</a></p>
      )}

      <section aria-labelledby="si-timeline">
        <h2 id="si-timeline" style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', margin: '0 0 8px' }}>Its path through Parliament</h2>
        {si.timeline?.length ? (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {si.timeline.map((s, i) => (
              <li key={i} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '8px 0', fontSize: '15px', lineHeight: 1.5 }}>
                <span style={{ fontFamily: MONO, fontWeight: 'bold' }}>{fmtDate(s.date)}{s.date && s.date > today ? ' (to come)' : ''}</span>
                {s.houses?.length ? <span style={{ fontFamily: MONO }}> · {s.houses.join(' and ')}</span> : null}
                <div style={{ overflowWrap: 'anywhere' }}>{s.link ? <a href={s.link} rel="noopener" style={{ color: INK }}>{s.step}</a> : s.step}</div>
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ fontSize: '15px' }}>The timeline for this instrument has not been read yet. It is added within a few days.</p>
        )}
      </section>

      <ParliamentSourceCredit api="Statutory Instruments API" note={<Link href="/laws/made-without-a-vote" style={{ color: ACCENT }}>All laws made without a vote</Link>} />
    </OpenGovShell>
  );
}
