import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import ArticleEndSignup from '../../components/ArticleEndSignup';
import { DATA_SIGNUP_LINE } from '@/lib/signup-lines';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { PROCEDURE_MEANING } from '@/lib/parliament-si-treaties';
import { listSis, siYear, siDepartments, fmtDate, PER_PAGE, type SiFlag } from '@/lib/si-treaties-data';
import ParliamentSourceCredit from '../../components/ParliamentSourceCredit';

// Every statutory instrument laid before Parliament, newest laid first (report 81), from the statutory_instruments
// table (UK Parliament Statutory Instruments API, loaded daily by /api/sync-statutory-instruments-treaties).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Laws Made Without a Vote',
  description: PAGE_DESCRIPTIONS['/laws/made-without-a-vote'],
  alternates: { canonical: '/laws/made-without-a-vote' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';
const FLAGS: { key: SiFlag; label: string }[] = [
  { key: 'committee', label: 'Flagged by a committee' },
  { key: 'prayed', label: 'Prayed against' },
  { key: 'debated', label: 'Debated' },
];

export default async function MadeWithoutAVotePage({ searchParams }: { searchParams: Promise<{ page?: string; department?: string; procedure?: string; flag?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const department = sp.department || undefined;
  const procedure = sp.procedure && sp.procedure in PROCEDURE_MEANING ? sp.procedure : undefined;
  const flag = FLAGS.some((f) => f.key === sp.flag) ? (sp.flag as SiFlag) : undefined;

  const [{ rows, total }, year, departments] = await Promise.all([listSis({ department, procedure, flag, page }), siYear(), siDepartments()]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => {
    const q = new URLSearchParams();
    if (department) q.set('department', department);
    if (procedure) q.set('procedure', procedure);
    if (flag) q.set('flag', flag);
    if (p > 1) q.set('page', String(p));
    const s = q.toString();
    return `/laws/made-without-a-vote${s ? `?${s}` : ''}`;
  };
  const pctRaw = year.laid ? (year.debated / year.laid) * 100 : 0;
  const pct = pctRaw > 0 && pctRaw < 1 ? 'under 1' : String(Math.round(pctRaw));
  const select: React.CSSProperties = { fontFamily: MONO, fontSize: '16px', color: INK, background: '#f4e8d4', border: `1px solid ${INK}`, padding: '7px 8px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' };
  const label: React.CSSProperties = { display: 'block', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '4px' };

  return (
    <OpenGovShell pageStamp="Laws">
      <BackLink fallbackHref="/laws" label="← Laws" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', marginBottom: '12px', lineHeight: 1.1 }}>Laws Made Without a Vote</h1>
        <p style={{ fontSize: '16px', lineHeight: 1.75, maxWidth: '46em', margin: '0 0 10px' }}>
          Ministers make most UK law themselves, through statutory instruments, using powers an Act of Parliament gives them. Under the negative procedure an instrument becomes law, or stays law, unless Parliament objects in time. Few are ever debated.
        </p>
        <p style={{ fontFamily: MONO, fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
          {year.laid.toLocaleString('en-GB')} laid before Parliament in the last 12 months; {year.debated.toLocaleString('en-GB')} of them were debated ({pct} per cent).
        </p>
      </header>

      <form method="get" action="/laws/made-without-a-vote" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', alignItems: 'end', margin: '0 0 22px', padding: '14px 0', borderTop: `1px solid ${HAIRLINE}`, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <label htmlFor="si-department" style={label}>Department</label>
          <select id="si-department" name="department" defaultValue={department || ''} style={select}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="si-procedure" style={label}>Procedure</label>
          <select id="si-procedure" name="procedure" defaultValue={procedure || ''} style={select}>
            <option value="">All procedures</option>
            {Object.keys(PROCEDURE_MEANING).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="si-flag" style={label}>Scrutiny</label>
          <select id="si-flag" name="flag" defaultValue={flag || ''} style={select}>
            <option value="">All instruments</option>
            {FLAGS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <button type="submit" style={{ fontFamily: MONO, fontSize: '16px', padding: '8px 16px', border: `1px solid ${ACCENT}`, background: ACCENT, color: '#f4efe6', cursor: 'pointer' }}>Show</button>
          {(department || procedure || flag) && <Link href="/laws/made-without-a-vote" style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, marginLeft: '12px' }}>Clear</Link>}
        </div>
      </form>

      <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 12px' }}>
        {total.toLocaleString('en-GB')} instruments{pages > 1 ? `, page ${page} of ${pages}` : ''}
      </p>
      {rows.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px' }}>No instruments match these filters.</p>}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((r) => (
          <li key={r.api_id} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '12px 0' }}>
            <Link href={`/statutory-instruments/${r.api_id}`} className="no-hover-scale" style={{ color: INK, textDecoration: 'none', fontSize: 'clamp(15px, 1.8vw, 18px)', fontWeight: 'bold', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
              {r.title}
            </Link>
            <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '4px', lineHeight: 1.5 }}>
              Laid {fmtDate(r.laid_date)}{r.laying_department ? ` · ${r.laying_department}` : ''}{r.procedure ? ` · ${r.procedure}` : ''}{r.si_number ? ` · ${r.si_number}` : ''}
            </div>
            {r.procedure && PROCEDURE_MEANING[r.procedure] && (
              <div style={{ fontSize: '15px', marginTop: '3px', lineHeight: 1.5 }}>{PROCEDURE_MEANING[r.procedure]}</div>
            )}
            {(r.committee_concerns || r.prayed_against || r.debated) && (
              <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '4px', color: ACCENT }}>
                {[r.committee_concerns && 'Flagged by a committee', r.prayed_against && 'Prayed against', r.debated && 'Debated'].filter(Boolean).join(' · ')}
              </div>
            )}
            {r.legislation_url && (
              <a href={r.legislation_url} rel="noopener" style={{ display: 'inline-block', fontFamily: MONO, fontSize: '15px', color: ACCENT, marginTop: '4px' }}>Read it on legislation.gov.uk</a>
            )}
          </li>
        ))}
      </ol>

      {pages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '28px', fontFamily: MONO, fontSize: '15px' }}>
          {page > 1 ? <Link href={href(page - 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>← Previous</Link>
            : <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, opacity: 0.35 }}>← Previous</span>}
          <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}` }}>{page} / {pages}</span>
          {page < pages ? <Link href={href(page + 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>Next →</Link>
            : <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, opacity: 0.35 }}>Next →</span>}
        </nav>
      )}

      <ParliamentSourceCredit api="Statutory Instruments API" note="Instruments laid before Parliament only; some instruments are never laid." />
      <ArticleEndSignup source="data-laws-without-a-vote" line={DATA_SIGNUP_LINE} />
    </OpenGovShell>
  );
}
