import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ArticleEndSignup from '../components/ArticleEndSignup';
import { DATA_SIGNUP_LINE } from '@/lib/signup-lines';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { listTreaties, treatyYear, fmtDate, scrutinyLabel, PER_PAGE } from '@/lib/si-treaties-data';
import ParliamentSourceCredit from '../components/ParliamentSourceCredit';
import Unavailable from '@/app/components/Unavailable';

// Every treaty laid before Parliament under the Constitutional Reform and Governance Act 2010, newest laid first
// (report 81), from the treaties table (UK Parliament Treaties API, loaded daily by
// /api/sync-statutory-instruments-treaties).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Treaties',
  description: PAGE_DESCRIPTIONS['/treaties'],
  alternates: { canonical: '/treaties' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';


export default async function TreatiesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const [{ rows, total }, year] = await Promise.all([listTreaties(page), treatyYear()]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => (p <= 1 ? '/treaties' : `/treaties?page=${p}`);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <OpenGovShell pageStamp="Treaties">
      <BackLink fallbackHref="/sections/parliament" label="← Parliament" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', marginBottom: '12px', lineHeight: 1.1 }}>Treaties</h1>
        <p style={{ fontSize: '16px', lineHeight: 1.75, maxWidth: '46em', margin: '0 0 10px' }}>
          The government signs treaties itself. Before most can be ratified it must lay them before Parliament for 21 sitting days, under the Constitutional Reform and Governance Act 2010. Either House can resolve against ratification in that time. After a Lords objection the government can still go ahead by laying a statement; a Commons objection starts the 21 days again, and can be repeated.
        </p>
        <p style={{ fontFamily: MONO, fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
          {year.laid.toLocaleString('en-GB')} laid in the last 12 months; {year.open.toLocaleString('en-GB')} of them still in scrutiny.
        </p>
      </header>

      <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 12px' }}>{total.toLocaleString('en-GB')} treaties{pages > 1 ? `, page ${page} of ${pages}` : ''}</p>
      {rows.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px' }}>No treaties found.</p>}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((t) => (
          <li key={t.api_id} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '12px 0' }}>
            <Link href={`/treaties/${t.api_id}`} className="no-hover-scale" style={{ color: INK, textDecoration: 'none', fontSize: 'clamp(15px, 1.8vw, 18px)', fontWeight: 'bold', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
              {t.title}
            </Link>
            <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '4px', lineHeight: 1.5 }}>
              Laid {fmtDate(t.laid_date)}{t.lead_department ? ` · ${t.lead_department}` : ''}{t.command_paper ? ` · ${t.command_paper}` : ''}
            </div>
            <div style={{ fontFamily: MONO, fontSize: '15px', marginTop: '3px', color: t.scrutiny_concluded ? INK : ACCENT }}>
              {scrutinyLabel(t, today)}{t.committee_reports?.length ? ` · ${t.committee_reports.length} committee ${t.committee_reports.length === 1 ? 'item' : 'items'}` : ''}
            </div>
            {t.govuk_url && <a href={t.govuk_url} rel="noopener" style={{ display: 'inline-block', fontFamily: MONO, fontSize: '15px', color: ACCENT, marginTop: '4px' }}>The treaty on GOV.UK</a>}
          </li>
        ))}
      </ol>

      {pages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '28px', fontFamily: MONO, fontSize: '15px' }}>
          {page > 1 ? <Link href={href(page - 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>← Previous</Link>
            : <Unavailable note="no earlier page" style={{ padding: '8px 14px', border: `1px dashed ${HAIRLINE}` }}>← Previous</Unavailable>}
          <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}` }}>{page} / {pages}</span>
          {page < pages ? <Link href={href(page + 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>Next →</Link>
            : <Unavailable note="no later page" style={{ padding: '8px 14px', border: `1px dashed ${HAIRLINE}` }}>Next →</Unavailable>}
        </nav>
      )}

      <ParliamentSourceCredit api="Treaties API" />
      <ArticleEndSignup source="data-treaties" line={DATA_SIGNUP_LINE} />
    </OpenGovShell>
  );
}
