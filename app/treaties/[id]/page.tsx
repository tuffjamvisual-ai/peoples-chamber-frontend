import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { getTreaty, isApiId, fmtDate, scrutinyLabel } from '@/lib/si-treaties-data';
import ParliamentSourceCredit from '../../components/ParliamentSourceCredit';

// One treaty laid before Parliament under CRaG, with its timeline (report 81), from the treaties table.
export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isApiId(id)) return {};
  const t = await getTreaty(id);
  if (!t) return {};
  return {
    title: t.title.length > 70 ? `${t.title.slice(0, 67).trimEnd()}...` : t.title,
    description: `${t.command_paper ? `${t.command_paper}: ` : ''}treaty laid before Parliament on ${t.laid_date || 'a date not given'} by ${t.lead_department || 'the government'}, with its scrutiny deadline and committee work.`.slice(0, 155),
    alternates: { canonical: `/treaties/${id}` },
  };
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

export default async function TreatyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isApiId(id)) notFound();
  const t = await getTreaty(id);
  if (!t) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const facts: [string, string][] = [
    ['Command paper', t.command_paper || 'Not given'],
    ['Signed', fmtDate(t.signed_date)],
    ['Laid before Parliament', fmtDate(t.laid_date)],
    ['Lead department', t.lead_department || 'Not given'],
    ['Laid by', t.laying_department || 'Not given'],
    ['Objection deadline', t.crag_end_date ? fmtDate(t.crag_end_date) : 'Not given'],
    ['Scrutiny', scrutinyLabel(t, today)],
  ];

  return (
    <OpenGovShell pageStamp="Treaties">
      <BackLink fallbackHref="/treaties" label="← Treaties" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <header style={{ marginBottom: '18px' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', marginBottom: '8px' }}>Treaty</div>
        <h1 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 'bold', lineHeight: 1.2, margin: 0, overflowWrap: 'anywhere' }}>{t.title}</h1>
      </header>

      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr)', gap: '6px 16px', fontFamily: MONO, fontSize: '15px', margin: '0 0 16px' }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}><dt style={{ fontWeight: 'bold' }}>{k}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{v}</dd></div>
        ))}
      </dl>
      {t.govuk_url && <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 24px' }}><a href={t.govuk_url} rel="noopener" style={{ color: ACCENT }}>The treaty and its explanatory memorandum on GOV.UK</a></p>}

      <section aria-labelledby="treaty-committees" style={{ marginBottom: '24px' }}>
        <h2 id="treaty-committees" style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', margin: '0 0 8px' }}>Committee work</h2>
        {t.committee_reports?.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {t.committee_reports.map((c, i) => (
              <li key={i} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '8px 0', fontSize: '15px', lineHeight: 1.5 }}>
                <span style={{ fontFamily: MONO, fontWeight: 'bold' }}>{fmtDate(c.date)}</span>
                <div style={{ overflowWrap: 'anywhere' }}>{c.link ? <a href={c.link} rel="noopener" style={{ color: INK }}>{c.step}</a> : c.step}</div>
              </li>
            ))}
          </ul>
        ) : <p style={{ fontSize: '15px' }}>No committee has reported on this treaty.</p>}
      </section>

      <section aria-labelledby="treaty-timeline">
        <h2 id="treaty-timeline" style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', margin: '0 0 8px' }}>Its path through Parliament</h2>
        {t.timeline?.length ? (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {t.timeline.map((s, i) => (
              <li key={i} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '8px 0', fontSize: '15px', lineHeight: 1.5 }}>
                <span style={{ fontFamily: MONO, fontWeight: 'bold' }}>{fmtDate(s.date)}{s.date && s.date > today ? ' (to come)' : ''}</span>
                <div style={{ overflowWrap: 'anywhere' }}>{s.link ? <a href={s.link} rel="noopener" style={{ color: INK }}>{s.step}</a> : s.step}</div>
              </li>
            ))}
          </ol>
        ) : <p style={{ fontSize: '15px' }}>The timeline for this treaty has not been read yet. It is added within a few days.</p>}
      </section>

      <ParliamentSourceCredit api="Treaties API" note={<Link href="/treaties" style={{ color: ACCENT }}>All treaties</Link>} />
    </OpenGovShell>
  );
}
