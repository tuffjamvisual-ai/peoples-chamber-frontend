// opengovt's own summary of a debate (owner, 31 Oct 2026), shown above the Hansard text: "At a glance", "Who spoke" and
// "The vote". Every figure is counted from Hansard's record of the debate and from our division data; nothing is
// written by AI. Search Console showed 248 debate pages "crawled, not indexed", seen as copies of Hansard.
import Link from 'next/link';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.2)';
const MONO = 'var(--font-special-elite), monospace';

// Names, offices, parties, constituencies and division titles are shown as recorded, hyphens included; the no hyphen
// rule applies to opengovt's own wording only (owner, 31 Oct 2026), and the labels here have none.

export type Speaker = { key: string; name: string; memberId: number | null; linked: boolean; party: string | null; constituency: string | null; contributions: number; office: string | null };
export type VoteSummary = {
  slug: string; title: string; ayes: number; noes: number;
  parties: { party: string; ayes: number; noes: number }[];
  rebels: { memberId: number; name: string; party: string | null; vote: 'Aye' | 'No'; linked: boolean }[];
};

const h2: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' };
const box: React.CSSProperties = { maxWidth: '46em', margin: '0 auto 28px', borderTop: `1px solid ${HAIRLINE}`, paddingTop: '16px', fontSize: '15px', lineHeight: 1.65, color: INK };
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };
const cell: React.CSSProperties = { padding: '4px 10px 4px 0', borderBottom: `1px solid ${HAIRLINE}`, textAlign: 'left' };

export default function DebateSummary({ date, house, location, speakers, words, votes }: {
  date: string | null; house: string | null; location: string | null; speakers: Speaker[]; words: number; votes: VoteSummary[];
}) {
  if (speakers.length === 0 && votes.length === 0) return null;
  const ministers = speakers.filter((s) => s.office);
  const byParty = new Map<string, number>();
  for (const s of speakers) { const p = s.party || 'Party not given'; byParty.set(p, (byParty.get(p) ?? 0) + 1); }
  const parties = [...byParty.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const name = (s: { name: string; memberId: number | null; linked: boolean }) =>
    s.linked && s.memberId != null ? <Link href={`/mps/${s.memberId}`} style={link}>{s.name}</Link> : <span>{s.name}</span>;

  return (
    <>
      <section aria-labelledby="debate-glance" style={box}>
        <h2 id="debate-glance" style={h2}>At a glance</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {date && <li>Date: {date}</li>}
          {(house || location) && <li>Where: {[house ? `House of ${house}` : null, location].filter(Boolean).join(', ')}</li>}
          {ministers.length === 1 && <li>Responding minister: {ministers[0].office!} ({name(ministers[0])})</li>}
          {ministers.length > 1 && (
            <li>Ministers who spoke: {ministers.map((m, i) => <span key={m.key}>{i > 0 && '; '}{m.office!} ({name(m)})</span>)}</li>
          )}
          <li>MPs who spoke: {speakers.length.toLocaleString()}</li>
          {parties.length > 0 && <li>Speakers by party: {parties.map(([p, n]) => `${p} ${n}`).join(', ')}</li>}
          <li>Length: {words.toLocaleString()} words</li>
        </ul>
      </section>

      {speakers.length > 0 && (
        <section aria-labelledby="debate-speakers" style={box}>
          <h2 id="debate-speakers" style={h2}>Who spoke</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, columnWidth: '20em', columnGap: '28px' }}>
            {speakers.map((s) => (
              <li key={s.key} style={{ breakInside: 'avoid', padding: '2px 0' }}>
                {name(s)}
                {[s.party, s.constituency].filter(Boolean).length > 0 && <span>, {[s.party, s.constituency].filter(Boolean).map((x) => x!).join(', ')}</span>}
                <span> ({s.contributions} contribution{s.contributions === 1 ? '' : 's'})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {votes.map((v) => (
        <section key={v.slug} aria-label={`The vote: ${v.title}`} style={box}>
          <h2 style={h2}>The vote</h2>
          <p style={{ margin: '0 0 6px', fontWeight: 'bold' }}>{v.title}</p>
          <p style={{ margin: '0 0 10px' }}>
            Ayes {v.ayes.toLocaleString()}, Noes {v.noes.toLocaleString()}: {v.ayes > v.noes ? 'passed' : v.ayes < v.noes ? 'not passed' : 'tied'}.{' '}
            <Link href={`/divisions/${v.slug}`} style={link}>How every MP voted</Link>
          </p>
          {v.parties.length > 0 && (
            <table style={{ borderCollapse: 'collapse', fontSize: '15px', margin: '0 0 12px' }}>
              <thead><tr><th style={cell}>Party</th><th style={cell}>Aye</th><th style={cell}>No</th></tr></thead>
              <tbody>
                {v.parties.map((p) => (
                  <tr key={p.party}><td style={cell}>{p.party}</td><td style={cell}>{p.ayes}</td><td style={cell}>{p.noes}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ margin: '0 0 4px' }}>
            {v.rebels.length === 0 ? 'No MP voted against the majority of their party.' : `Voted against the majority of their party (${v.rebels.length}):`}
          </p>
          {v.rebels.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {v.rebels.map((r) => (
                <li key={r.memberId}>{name(r)}{r.party ? `, ${r.party}` : ''}, voted {r.vote}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
