// /transparency/major-projects/[project_key] — one project in the Government Major Projects Portfolio: its history
// table (rating, end date and whole-life cost for each March) and the department's commentary for each year.
// project_key is the file's project ID (e.g. DFT_0141_2223-Q1), or 'no-id:<DEPT>:<name>' for the 2 rows without one.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import { departments } from '@/lib/departments';
import { fetchMajorProject, deptLabel, projectHref, evaluationLines, REPORT_PAGES } from '@/lib/major-projects';
import { MajorProjectMeta, MajorProjectTable } from '../../../components/MajorProjectHistory';

export const revalidate = 86400;
// Built on first visit and kept for a day (none at build time; there are 261 projects).
export async function generateStaticParams() { return []; }

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

type Props = { params: Promise<{ project_key: string }> };

// Some returns stop mid-sentence ("This is primarily due to the following factors." with nothing after); the
// published file itself ends there (checked against the IPA March 2024 CSV and XLSX, 20 Oct 2026), so say so.
const ENDS_SHORT = /following factors[.,:\u201a]?\s*$/i;
const asPublished = (t: string) => (ENDS_SHORT.test(t) ? `${t.trimEnd()} [text ends here in the published file]` : t);
const keyOf = async (params: Props['params']) => {
  const raw = (await params).project_key;
  try { return decodeURIComponent(raw); } catch { return raw; }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = await keyOf(params);
  const { project } = await fetchMajorProject(key).catch(() => ({ project: null }));
  if (!project) return { title: 'Major project not found', robots: { index: false, follow: false } };
  return {
    title: `${project.name}: major project history`,
    description: `${project.name} (${deptLabel(project.latest.department_code)}) in the Government Major Projects Portfolio: delivery confidence rating, end date and whole life cost in each annual report since March 2024, and the department's commentary.`,
    alternates: { canonical: projectHref(project.key) },
  };
}

export default async function MajorProjectPage({ params }: Props) {
  const key = await keyOf(params);
  const { project: p, latestYear } = await fetchMajorProject(key);
  if (!p) notFound();
  const slug = p.latest.dept_slug;
  const deptName = slug ? departments.find((d) => d.slug === slug)?.name ?? slug : null;
  const narratives = [...p.years].reverse();

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink fallbackHref="/transparency/major-projects" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '18px', marginBottom: '22px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>
          <Link href="/transparency/major-projects" style={{ color: INK, textDecoration: 'none' }}>Transparency · Major projects</Link>
        </p>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 'bold', letterSpacing: '-0.01em', marginBottom: '10px', lineHeight: 1.2 }}>
          {p.name}
        </h1>
        <MajorProjectMeta p={p} latestYear={latestYear} showDepartment />
        {slug && deptName && (
          <p style={{ fontSize: '14px', margin: '4px 0 0' }}>
            Department page: <Link href={`/departments/${slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{deptName}</Link>
          </p>
        )}
      </header>

      <MajorProjectTable p={p} />
      {evaluationLines(p).map((e) => (
        <p key={e.year} style={{ fontSize: '14px', lineHeight: 1.6, margin: '8px 0 0', maxWidth: '72ch' }}>
          {e.stated ? (
            <>Evaluation plan (the department&rsquo;s own statement, {e.dataAsAt}):{' '}
              {e.parts.map((x, i) => (
                <span key={i}>{i > 0 && ' · '}{x.href ? <a href={x.href} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{x.text}</a> : x.text}</span>
              ))}
            </>
          ) : <>Evaluation plan: not stated in the {e.dataAsAt} report</>}
        </p>
      ))}
      <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '10px 0 24px', maxWidth: '62ch' }}>
        Each year&rsquo;s cost is shown with its price basis. Costs are not compared between years: the March 2024 and March 2025 reports
        state no price basis, and from March 2026 costs are in 2024/25 prices.
      </p>

      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 10px' }}>
        The department&rsquo;s commentary
      </h2>
      <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 12px', maxWidth: '62ch' }}>
        This is the department&rsquo;s own commentary. It may use different prices from the table above, so its figures may not match.
      </p>
      {narratives.map((y, i) => (
        <details key={y.report_year} open={i === 0} style={{ borderTop: `1px solid ${INK_HAIRLINE}`, padding: '10px 0' }}>
          <summary style={{ fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>{y.data_as_at}</summary>
          {([['Rating', y.rating_narrative], ['Schedule', y.schedule_narrative], ['Cost', y.cost_narrative]] as const).map(([label, t]) => t && (
            <p key={label} style={{ fontSize: '14px', lineHeight: 1.6, margin: '8px 0 0', whiteSpace: 'pre-line', maxWidth: '72ch' }}><em>{label}:</em> {asPublished(t)}</p>
          ))}
          {!y.rating_narrative && !y.schedule_narrative && !y.cost_narrative && (
            <p style={{ fontSize: '14px', margin: '8px 0 0' }}>No commentary in the file for this year.</p>
          )}
          <p style={{ fontSize: '13px', margin: '8px 0 0' }}>
            Source: <a href={REPORT_PAGES[y.report_year]?.url} style={{ color: INK }}>{REPORT_PAGES[y.report_year]?.title}</a> (<a href={y.source_url} style={{ color: INK }}>data</a>)
          </p>
        </details>
      ))}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, marginTop: '24px' }}>
        Names, figures, dates, ratings and commentary are as the department reported them. Where a rating, cost or date is withheld, the
        file&rsquo;s wording is shown. <Link href="/transparency/major-projects" style={{ color: INK }}>Every major project →</Link>
      </p>
    </OpenGovShell>
  );
}
