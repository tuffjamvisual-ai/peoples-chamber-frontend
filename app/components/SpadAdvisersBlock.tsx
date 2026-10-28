// "Special advisers" on a minister's MP page (owner, 28 Oct 2026): the advisers the Cabinet Office lists for them,
// with pay and salary band and a note of any declared interests, linking to the full list on
// /transparency/special-advisers filtered to this minister, where the interests are shown word for word. The list is
// dated (31 March 2026): where the minister has since left the post (spad_minister_status, Members API), the block
// says so in the past tense.
import Link from 'next/link';
import SpadSource from './SpadSource';
import { SPAD_LIST_ANCHOR, longDate, type SpadRow, type SpadReleaseRow } from '@/lib/spad-display';

const pronoun = (gender: string | null | undefined, name: string) => (gender === 'F' ? 'She' : gender === 'M' ? 'He' : name);

export default function SpadAdvisersBlock({ rows, release, interests = {}, leftOn = {}, ministerName, gender, memberId, headingStyle }: {
  rows: SpadRow[]; release: SpadReleaseRow; interests?: Record<string, { total: number; recusals: number }>;
  leftOn?: Record<string, string | null>; ministerName: string; gender?: string | null; memberId: number; headingStyle?: React.CSSProperties;
}) {
  if (!rows.length) return null;
  const titles = [...new Set(rows.map((r) => r.minister_title))];
  return (
    <section aria-label="Special advisers" style={{ marginBottom: '24px' }}>
      <h3 style={headingStyle}>Special advisers</h3>
      {titles.map((title) => {
        const n = rows.filter((r) => r.minister_title === title).length;
        const left = leftOn[title];
        return left ? (
          <p key={title} style={{ margin: '0 0 8px' }}>
            When the Cabinet Office last published its list ({longDate(release.as_at)}), {n} special adviser{n === 1 ? '' : 's'} worked for {ministerName} as {title.replace(/^The /, 'the ')}. {pronoun(gender, ministerName)} left this post on {longDate(left)}.
          </p>
        ) : (
          <p key={title} style={{ margin: '0 0 8px' }}>
            {n} special adviser{n === 1 ? '' : 's'} appointed by this minister ({title}), in post at {longDate(release.as_at)}.
          </p>
        );
      })}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((r) => (
          <li key={`${r.adviser_name}|${r.minister_title}`} style={{ padding: '6px 0', borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <strong>{r.adviser_name}</strong>: pay band {r.pay_band ?? 'not given'}, salary {r.salary_band_text ?? 'under £81,000 (not published)'}
            {r.notes.length > 0 && <span style={{ fontStyle: 'italic' }}> ({r.notes.join('; ')})</span>}
            {interests[r.adviser_name] && (
              <span style={{ display: 'block' }}>
                Declared interests: {interests[r.adviser_name].total}{interests[r.adviser_name].recusals ? `, including ${interests[r.adviser_name].recusals} recusal${interests[r.adviser_name].recusals === 1 ? '' : 's'}` : ''} (see the full list)
              </span>
            )}
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
