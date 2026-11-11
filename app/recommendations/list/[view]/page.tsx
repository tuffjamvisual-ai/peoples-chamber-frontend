import type { Metadata } from 'next';
import Link from 'next/link';
import PhoneFolds from '../../../components/PhoneFolds';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import { departments } from '@/lib/departments';
import BackLink from '../../../components/BackLink';
import RecommendationList, { type ListRow, type ListReport } from '../../RecommendationList';
import {
  RECOMMENDATIONS_PUBLIC, allStatus, wording, bodiesFor, departmentWords, departmentSlugs, sessionWords, recPath, documentWords, latestMinutesUsed,
  STATUS_ORDER, STATUS_LABELS, datePart, targetPassed, BODY_NOTES,
} from '@/lib/pac';

// /recommendations (owner's approval, 29 Oct 2026, "go stage 4"): the Committee of Public Accounts recommendations
// tracker. Only exists when RECOMMENDATIONS_PUBLIC=1; then it and every recommendation page are in the sitemap, and
// the menu links to it under Departments (30 Oct 2026, "go public").
// Data from lib/pac.ts, cached for a day under the 'pac' tag.
export const revalidate = 86400;
// Served at /recommendations through a rewrite in next.config.ts (owner, 7 Nov 2026, AB1). A page at a fixed address is
// rendered during `next build`, and its read of pac_recommendation_status passed the statement timeout twice on 7 Nov
// while other pages loaded the database, failing the deployment. As a route with no paths built in advance it renders on
// its first request and is then cached exactly as before (revalidate a day; the data under the 'pac' tag), like the
// recommendation pages. Only "all" exists; /recommendations/list/<anything> redirects to /recommendations.
export function generateStaticParams() {
  return [];
}

export const metadata: Metadata = {
  title: 'Public Accounts Committee recommendations',
  description: 'Committee of Public Accounts recommendations and the government’s answers in Treasury Minutes: its response, its target dates and what happened next.',
  alternates: { canonical: '/recommendations' },
};

const INK = '#14100d';
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: INK };
const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.75, color: INK, marginBottom: '14px', maxWidth: '46em' };

export default async function RecommendationsPage({ params }: { params: Promise<{ view: string }> }) {
  if (!RECOMMENDATIONS_PUBLIC || (await params).view !== 'all') notFound();
  const [rows, w, latestMinutes] = await Promise.all([allStatus(), wording(), latestMinutesUsed()]);
  // The total and every box come from the same rows, so the boxes add up to the total.
  const total = rows.length;
  const totals = STATUS_ORDER.map((k) => ({ key: k, label: STATUS_LABELS[k], count: rows.filter((r) => r.status === k).length })).filter((t) => t.count > 0);
  const moved = [...rows].filter((r) => r.times_target_moved > 0)
    .sort((a, b) => b.times_target_moved - a.times_target_moved || (b.latest_target_month ?? '').localeCompare(a.latest_target_month ?? '') || a.recommendation_id - b.recommendation_id)
    .slice(0, 10);
  const sorted = [...rows].sort((a, b) => b.session.localeCompare(a.session) || b.report_number - a.report_number || a.rec_number.localeCompare(b.rec_number, 'en', { numeric: true }));
  const reports: Record<string, ListReport> = {};
  const seenBodies = new Map<string, string>();
  const list: ListRow[] = sorted.map((r) => {
    const key = `${r.session}/${r.report_number}`;
    if (!reports[key]) {
      const bodies = bodiesFor(r.department);
      for (const b of bodies) seenBodies.set(b.key, b.name);
      reports[key] = {
        title: r.report_title,
        meta: `Report ${r.report_number}, ${sessionWords(r.session)}. ${departmentWords(r.department)}`,
        bodies: bodies.map((b) => b.key),
        pages: departmentSlugs(r.department),
        other: bodies.length === 0 || bodies.some((b) => !b.page),
      };
    }
    return [key, r.rec_number, r.status, w.text(r)];
  });
  const departmentOptions = [
    ...[...seenBodies].map(([value, label]) => ({ value: `body:${value}`, label })).sort((a, b) => a.label.localeCompare(b.label)),
    { value: 'other', label: 'Other bodies' },
  ];
  // Groups first (the department tab's "See all" links open them), then each status.
  const statusOptions = [
    { value: 'group:open', label: 'Open' }, { value: 'group:delivered', label: 'Delivered' }, { value: 'group:rejected', label: 'Rejected' },
    { value: 'group:target_passed', label: 'Target passed' },
    ...totals.map((t) => ({ value: t.key, label: t.label })),
  ];
  const pageNames = Object.fromEntries(departments.map((d) => [d.slug, d.name]));

  return (
    <OpenGovShell pageStamp="Recommendations">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '8px', color: INK }}>
          Public Accounts Committee recommendations
        </h1>
        <p style={{ ...p, margin: 0 }}>{total.toLocaleString('en-GB')} recommendations, followed through the government&rsquo;s Treasury Minutes.</p>
      </header>
      {/* At every width (UX3i, owner approved through Cowork, 10 Nov 2026; was phones only, status first, 4 Nov 2026): the
          search and the list first, then "About these recommendations" (a closed native fold), the status summary and the
          most moved targets. CSS order, the same with JavaScript off. */}
      <style>{`
        .rec-page { display: flex; flex-direction: column; }
        .rec-all { order: 1; }
        .rec-intro { order: 2; margin-top: 24px; }
        .rec-more { order: 3; }
        .rec-all > h2:first-child { margin-top: 0 !important; }
        .rec-intro > summary { display: flex; align-items: center; min-height: 44px; cursor: pointer; font-size: 16px; font-weight: bold; color: ${INK}; }
      `}</style>
      <section className="rec-page" style={{ color: INK }}>
        <details className="rec-intro">
        <summary>About these recommendations</summary>
        <p style={p}>
          The Committee of Public Accounts examines how government spends public money and makes recommendations to departments. The government answers each recommendation in a Treasury Minute, saying whether it agrees and by when it will act, and reports on the ones still open in Treasury Minutes Progress Reports.
        </p>
        <p style={p}>
          This tracker follows {total.toLocaleString('en-GB')} recommendations through those documents{latestMinutes ? `, up to the ${documentWords(latestMinutes)}` : ''}. The documents are published by HM Treasury on GOV.UK under the Open Government Licence v3.0.
        </p>
        </details>

        {/* UX5 (T1-6, 11 Nov 2026): on phones the status summary and the most moved targets are closed folds, so the page
            opens within the phone length; from 480px up they show as before. Folded, nothing cut. */}
        <div className="rec-more">
        <PhoneFolds showContents={false} folds={[
          { id: 'status', label: 'Where the recommendations stand', summary: `${total.toLocaleString('en-GB')} in all`, node: (
        <div className="rec-status">
        <h2 style={h2}>Where the recommendations stand</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: '40em' }}>
          {totals.map((t) => (
            <li key={t.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px dotted rgba(20,16,13,0.2)', padding: '6px 0', fontSize: '16px' }}>
              <span>{t.label}</span>
              <span style={{ fontWeight: 600 }}>{t.count.toLocaleString('en-GB')}</span>
            </li>
          ))}
          <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', fontSize: '16px', fontWeight: 700 }}>
            <span>Total</span>
            <span>{total.toLocaleString('en-GB')}</span>
          </li>
        </ul>

        </div>
          ) },
          { id: 'moved', label: 'Most moved targets', summary: `${moved.length.toLocaleString('en-GB')} recommendations`, node: (
        <div className="rec-moved">
        <h2 style={h2}>Most moved targets</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {moved.map((r) => (
            <li key={r.recommendation_id} style={{ borderBottom: '1px dotted rgba(20,16,13,0.2)', padding: '8px 0', fontSize: '16px', lineHeight: 1.5 }}>
              <Link href={recPath(r)} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '2px', overflowWrap: 'anywhere' }}>
                {r.report_title}: recommendation {r.rec_number}
              </Link>
              <span style={{ display: 'block', fontSize: '15px' }}>
                Moved {r.times_target_moved} time{r.times_target_moved === 1 ? '' : 's'}, from {datePart(w.firstTarget(r))} to {datePart(r.latest_target_text)}.{targetPassed(r.latest_target_month) ? ' Target passed.' : ''}{r.status !== 'target_in_future' ? ` ${w.text(r)}.` : ''}
              </span>
            </li>
          ))}
        </ol>
        </div>
          ) },
        ]} />
        </div>

        <div className="rec-all">
        <h2 style={h2}>All recommendations</h2>
        <RecommendationList reports={reports} rows={list} departmentOptions={departmentOptions} statusOptions={statusOptions} pageNames={pageNames} bodyNotes={BODY_NOTES} />
        </div>
      </section>
    </OpenGovShell>
  );
}
