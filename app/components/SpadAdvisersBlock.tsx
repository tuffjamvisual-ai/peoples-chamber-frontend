// "Special advisers" on a minister's MP page (owner, 28 Oct 2026): the advisers the Cabinet Office lists for them,
// with pay and salary band, linking to the full list on /transparency/special-advisers filtered to this minister.
import Link from 'next/link';
import SpadSource from './SpadSource';
import { SPAD_LIST_ANCHOR, longDate, type SpadRow, type SpadReleaseRow } from '@/lib/spad-display';

export default function SpadAdvisersBlock({ rows, release, memberId, headingStyle }: { rows: SpadRow[]; release: SpadReleaseRow; memberId: number; headingStyle?: React.CSSProperties }) {
  if (!rows.length) return null;
  const titles = [...new Set(rows.map((r) => r.minister_title))];
  return (
    <section aria-label="Special advisers" style={{ marginBottom: '24px' }}>
      <h3 style={headingStyle}>Special advisers</h3>
      <p style={{ margin: '0 0 8px' }}>
        {rows.length} special adviser{rows.length === 1 ? '' : 's'} appointed by this minister ({titles.join('; ')}), in post at {longDate(release.as_at)}.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((r) => (
          <li key={`${r.adviser_name}|${r.minister_title}`} style={{ padding: '6px 0', borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <strong>{r.adviser_name}</strong>: pay band {r.pay_band ?? 'not given'}, salary {r.salary_band_text ?? 'under £81,000 (not published)'}
            {r.notes.length > 0 && <span style={{ fontStyle: 'italic' }}> ({r.notes.join('; ')})</span>}
          </li>
        ))}
      </ul>
      <p style={{ margin: '8px 0 0' }}>
        <Link href={`/transparency/special-advisers?minister=${memberId}#${SPAD_LIST_ANCHOR}`} style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>All special advisers and their ministers →</Link>
      </p>
      <SpadSource slug={release.release_slug} url={release.source_url} />
    </section>
  );
}
