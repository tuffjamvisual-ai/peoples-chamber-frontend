// /transparency/major-projects — every project in the Government Major Projects Portfolio since March 2024, from
// the IPA and NISTA annual reports. Reads major_projects (migration 2026-10-20d), loaded by
// scripts/import-major-projects.js. Grouped by the department code in each project's latest report; each project
// links to its own page with the department's commentary.
// Read through major_projects_list() (migration 2026-10-21a), only what the list shows.
// One line per project (owner's decision, 20 Oct 2026): name, latest rating, latest end date, and "Last reported"
// for projects that have left; the history tables are on the project pages and the department tabs.

import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { departments } from '@/lib/departments';
import { fetchMajorProjectList, deptLabel, ratingText, dateText, lastReported, projectHref, REPORT_PAGES } from '@/lib/major-projects';
import EvaluationView from './EvaluationView';

export const revalidate = 86400;

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';
const MONO = '"Special Elite", monospace';

export const metadata: Metadata = {
  title: "Major projects: the government's biggest projects, year by year",
  description: 'Every project in the Government Major Projects Portfolio since March 2024: its delivery confidence rating, end date and whole-life cost in each annual report, and what the department said.',
  alternates: { canonical: '/transparency/major-projects' },
};

export default async function MajorProjectsPage() {
  const { projects, latestYear } = await fetchMajorProjectList();
  const deptName = new Map(departments.map((d) => [d.slug, d.name]));
  const byDept = new Map<string, typeof projects>();
  for (const p of projects) {
    const k = p.latest.department_code.toUpperCase();
    if (!byDept.has(k)) byDept.set(k, []);
    byDept.get(k)!.push(p);
  }
  const codes = [...byDept.keys()].sort();
  const current = projects.filter((p) => p.latest.report_year === latestYear).length;
  // Projects whose March 2025 entry was "No" to "Does the project have an evaluation plan? (self reported)".
  const noPlan = projects.filter((p) => p.noPlan2025)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink fallbackHref="/transparency" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '28px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>Transparency · Major projects</p>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', lineHeight: 1.15 }}>
          The government&rsquo;s biggest projects, year by year
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch' }}>
          The Government Major Projects Portfolio is the list of the largest and riskiest projects departments run. Each March the
          departments report every project&rsquo;s whole-life cost, its end date and a delivery confidence rating of Red, Amber or Green,
          and the government&rsquo;s projects authority (the IPA until 2025, now NISTA) publishes them.
        </p>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '62ch', marginTop: '10px' }}>
          From March 2026 costs are in 2024/25 prices. The reports for March 2024 and March 2025 do not say what price basis their
          costs use, and some departments used their own (HS2&rsquo;s costs were in 2019 prices), so each year&rsquo;s cost is shown with
          its basis and costs are not compared between years.
        </p>
        <p style={{ marginTop: '14px', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT }}>
          {projects.length} projects since March 2024 · {current} in the March {latestYear} report
        </p>
      </header>

      {noPlan.length > 0 && (
        <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '-12px 0 24px' }}>
          <a href="/transparency/major-projects?evaluation=no" style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            In March 2025, {noPlan.length} projects said they had no evaluation plan.
          </a>
        </p>
      )}

      <EvaluationView
        all={<>
      {codes.map((c) => {
        const ps = byDept.get(c)!;
        const slug = ps[0].latest.dept_slug;
        return (
          <section key={c} style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 10px' }}>
              {deptLabel(c)} · {ps.length}
            </h2>
            {slug && (
              <p style={{ fontSize: '14px', margin: '0 0 6px' }}>
                Department page: <Link href={`/departments/${slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{deptName.get(slug) ?? slug}</Link>
              </p>
            )}
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {ps.map((p) => {
                const left = lastReported(p, latestYear);
                return (
                  <li key={p.key} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '8px 0', fontSize: '14px', lineHeight: 1.5 }}>
                    <Link href={projectHref(p.key)} style={{ color: INK, fontWeight: 600, fontSize: '15px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.name}</Link>
                    {' · '}{ratingText(p.latest)}
                    {' · '}End date: {dateText(p.latest.end_date, p.latest.end_text)}
                    {left && <>{' · '}<strong>{left}</strong></>}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

        </>}
        noPlan={
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 10px' }}>
              No evaluation plan in March 2025 · {noPlan.length}
            </h2>
            <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 8px', maxWidth: '62ch' }}>
              Projects whose department answered &ldquo;No&rdquo; to &ldquo;Does the project have an evaluation plan? (self reported)&rdquo; in the March 2025 data.
              {' '}<Link href="/transparency/major-projects" style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>All projects →</Link>
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {noPlan.map((p) => (
                <li key={p.key} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '8px 0', fontSize: '14px', lineHeight: 1.5 }}>
                  <Link href={projectHref(p.key)} style={{ color: INK, fontWeight: 600, fontSize: '15px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.name}</Link>
                  {' · '}{deptLabel(p.latest.department_code)}
                </li>
              ))}
            </ol>
          </section>
        }
      />

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6 }}>
        Sources: {Object.values(REPORT_PAGES).map((r, i) => <span key={r.url}>{i > 0 && '; '}<a href={r.url} style={{ color: INK }}>{r.title}</a></span>)}.
        Names, figures, dates and ratings are as the departments reported them. Where a rating, cost or date is withheld, the file&rsquo;s wording is shown.
      </p>
    </OpenGovShell>
  );
}
