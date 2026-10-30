import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import RecommendationList, { type ListRow, type ListReport } from './RecommendationList';
import {
  RECOMMENDATIONS_PUBLIC, allStatus, statusContext, statusText, departmentSlugs, departmentName, sessionWords, recPath, monthYear,
  shownStatuses, STATUS_LABELS, targetWords, type StatusKey,
} from '@/lib/pac';

// /recommendations (owner's approval, 29 Oct 2026, "go stage 4"): the Committee of Public Accounts recommendations
// tracker. Only exists when RECOMMENDATIONS_PUBLIC=1 (Preview only for now); not in the sitemap or the navigation.
// Data from lib/pac.ts, cached for a day under the 'pac' tag.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Public Accounts Committee recommendations',
  description: 'Committee of Public Accounts recommendations and the government’s answers in Treasury Minutes: its response, its target dates and what happened next.',
  alternates: { canonical: '/recommendations' },
};

const INK = '#14100d';
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK };
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.75, color: INK, marginBottom: '14px', maxWidth: '46em' };

export default async function RecommendationsPage() {
  if (!RECOMMENDATIONS_PUBLIC) notFound();
  const [rows, { ctx, implementedDocFor, latestDocument }] = await Promise.all([allStatus(), statusContext()]);
  const shown = new Set(shownStatuses());
  const totals = shownStatuses().map((k) => ({ key: k, label: STATUS_LABELS[k], count: rows.filter((r) => r.status === k).length })).filter((t) => t.count > 0);
  const text = (r: (typeof rows)[number]) => statusText(r, { ...ctx, implementedDocument: implementedDocFor(r.recommendation_id) });
  const moved = [...rows].filter((r) => r.times_target_moved > 0)
    .sort((a, b) => b.times_target_moved - a.times_target_moved || (b.latest_target_month ?? '').localeCompare(a.latest_target_month ?? '') || a.recommendation_id - b.recommendation_id)
    .slice(0, 10);
  const sorted = [...rows].sort((a, b) => b.session.localeCompare(a.session) || b.report_number - a.report_number || a.rec_number.localeCompare(b.rec_number, 'en', { numeric: true }));
  const reports: Record<string, ListReport> = {};
  const list: ListRow[] = sorted.map((r) => {
    const key = `${r.session}/${r.report_number}`;
    reports[key] ??= {
      title: r.report_title,
      meta: `Report ${r.report_number}, ${sessionWords(r.session)}${r.department ? `. ${r.department}` : ''}`,
      departments: departmentSlugs(r.department).length ? departmentSlugs(r.department) : ['other'],
    };
    return [key, r.rec_number, r.status, text(r)];
  });
  const deptSlugs = [...new Set(Object.values(reports).flatMap((r) => r.departments))].filter((s) => s !== 'other');
  const departmentOptions = [...deptSlugs.map((s) => ({ value: s, label: departmentName(s) })).sort((a, b) => a.label.localeCompare(b.label)), { value: 'other', label: 'Other bodies' }];
  const statusOptions = totals.map((t) => ({ value: t.key, label: t.label }));

  return (
    <OpenGovShell pageStamp="Recommendations">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', color: INK }}>
          Public Accounts Committee recommendations
        </h1>
      </header>
      <section style={{ color: INK }}>
        <p style={p}>
          The Committee of Public Accounts examines how government spends public money and makes recommendations to departments. The government answers each recommendation in a Treasury Minute, saying whether it agrees and by when it will act, and reports on the ones still open in Treasury Minutes Progress Reports.
        </p>
        <p style={p}>
          This tracker follows {rows.length.toLocaleString('en-GB')} recommendations through those documents{latestDocument ? `, up to the ${latestDocument.title} (${latestDocument.cp_number}, published ${monthYear(latestDocument.published_on)})` : ''}. The documents are published by HM Treasury on GOV.UK under the Open Government Licence v3.0.
        </p>

        <h2 style={h2}>Where the recommendations stand</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: '40em' }}>
          {totals.map((t) => (
            <li key={t.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px dotted rgba(20,16,13,0.2)', padding: '6px 0', fontSize: '16px' }}>
              <span>{t.label}</span>
              <span style={{ fontWeight: 600 }}>{t.count.toLocaleString('en-GB')}</span>
            </li>
          ))}
        </ul>

        <h2 style={h2}>Most moved targets</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {moved.map((r) => (
            <li key={r.recommendation_id} style={{ borderBottom: '1px dotted rgba(20,16,13,0.2)', padding: '8px 0', fontSize: '16px', lineHeight: 1.5 }}>
              <Link href={recPath(r)} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '2px', overflowWrap: 'anywhere' }}>
                {r.report_title}: recommendation {r.rec_number}
              </Link>
              <span style={{ display: 'block', fontSize: '15px' }}>
                Moved {r.times_target_moved} time{r.times_target_moved === 1 ? '' : 's'}, from {monthYear(r.original_target_month)} to {targetWords(r)}.{r.status !== 'target_in_future' && shown.has(r.status as StatusKey) ? ` ${text(r)}` : ''}
              </span>
            </li>
          ))}
        </ol>

        <h2 style={h2}>All recommendations</h2>
        <RecommendationList reports={reports} rows={list} departmentOptions={departmentOptions} statusOptions={statusOptions} />
      </section>
    </OpenGovShell>
  );
}
