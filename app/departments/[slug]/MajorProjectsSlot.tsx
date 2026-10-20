// Major projects tab for a department page: the department's projects in the Government Major Projects
// Portfolio (major_projects), by the department in each project's latest report. Shown only when there is at least
// one (as the Directions tab is). HMRC and VOA projects are on the Treasury tab with their own label.
import Link from 'next/link';
import type { MajorProject } from '@/lib/major-projects';
import { MajorProjectHistory } from '../../components/MajorProjectHistory';

const ACCENT = '#7a1612';
const H2_CLS = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';

export function MajorProjectsSlot({ projects, latestYear }: { projects: MajorProject[]; latestYear: number }) {
  const current = projects.filter((p) => p.latest.report_year === latestYear).length;
  const mixed = new Set(projects.map((p) => p.latest.department_code.toUpperCase())).size > 1;
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Major projects ({projects.length})</h2>
      <p style={{ fontSize: '14px', lineHeight: 1.55, margin: '0 0 10px' }}>
        {`The department’s projects in the Government Major Projects Portfolio, as reported each March. ${current} ${current === 1 ? 'is' : 'are'} in the March ${latestYear} report. Each year’s cost is shown with its price basis; costs are not compared between years, because only March ${latestYear} states one.`}
      </p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {projects.map((p) => <MajorProjectHistory key={p.key} p={p} latestYear={latestYear} showDepartment={mixed} />)}
      </ol>
      <p style={{ fontSize: '14px', margin: '10px 0 0' }}>
        <Link href="/transparency/major-projects" style={{ color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Every major project, all departments →</Link>
      </p>
    </section>
  );
}
