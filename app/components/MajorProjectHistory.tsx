// One major project's history across the annual reports: rating, end date and whole-life cost for each March.
// Used by /transparency/major-projects, its project pages and the Major projects tab on department pages.
// Costs are not compared between years (owner's decision, 20 Oct 2026): each year shows its own price basis.
import Link from 'next/link';
import { type MajorProject, ratingText, dateText, costText, lastReported, earlierNames, deptLabel, projectHref } from '@/lib/major-projects';

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.15)';
const cell = { padding: '4px 10px 4px 0', verticalAlign: 'top', fontSize: '15px', lineHeight: 1.5 } as const;

export function MajorProjectTable({ p }: { p: MajorProject }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
        <thead>
          <tr>
            {['Data as at', 'Rating', 'End date', 'Whole-life cost'].map((h) => (
              <th key={h} scope="col" style={{ ...cell, textAlign: 'left', fontWeight: 600, borderBottom: `1px solid ${HAIRLINE}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.years.map((y) => (
            <tr key={y.report_year}>
              <td style={cell}>{y.data_as_at}</td>
              <td style={cell}>{ratingText(y)}</td>
              <td style={cell}>{dateText(y.end_date, y.end_text)}</td>
              <td style={cell}>{costText(y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The project's name, ID and status line, used above the table.
export function MajorProjectMeta({ p, latestYear, showDepartment }: { p: MajorProject; latestYear: number; showDepartment?: boolean }) {
  const left = lastReported(p, latestYear);
  const old = earlierNames(p);
  return (
    <p style={{ fontSize: '15px', margin: '2px 0 6px', lineHeight: 1.5 }}>
      {showDepartment && <>{deptLabel(p.latest.department_code)} · </>}
      {p.id ?? 'No project ID in the file'}
      {left && <> · <strong>{left}</strong></>}
      {old.length > 0 && <> · Earlier name: {old.join('; ')}</>}
    </p>
  );
}

export function MajorProjectHistory({ p, latestYear, showDepartment }: { p: MajorProject; latestYear: number; showDepartment?: boolean }) {
  return (
    <li style={{ borderBottom: `1px dotted ${HAIRLINE}`, padding: '12px 0' }}>
      <p style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.45, margin: 0 }}>
        <Link href={projectHref(p.key)} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.name}</Link>
      </p>
      <MajorProjectMeta p={p} latestYear={latestYear} showDepartment={showDepartment} />
      <MajorProjectTable p={p} />
      <p style={{ fontSize: '15px', margin: '6px 0 0' }}>
        <Link href={projectHref(p.key)} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>The department&rsquo;s commentary →</Link>
      </p>
    </li>
  );
}
