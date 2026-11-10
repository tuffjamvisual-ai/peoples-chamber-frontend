// "Find an MP in this vote" (UX2k, owner approved through Cowork, 10 Nov 2026): the answer to the GET form on a Commons
// division page, so it works with JavaScript off. Names how each MP matching the name or constituency voted in that
// division, from the same rows the division page lists (lib/division-votes.ts). Rendered on request, as it depends on
// what was typed; not indexed.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import { fetchDivisionVotes } from '@/lib/division-votes';
import { displayMpName } from '@/lib/mp-name';
import { ARCHIVE_LAST_DATE } from '@/lib/historic-archive';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const SLUG_RE = /^pw-(\d{4}-\d{2}-\d{2})-(\d+)-commons$/;

export const metadata: Metadata = { title: 'Find an MP in this vote', robots: { index: false, follow: true } };

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export default async function FindMpInDivision({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ name?: string | string[] }> }) {
  const { slug } = await params;
  const m = SLUG_RE.exec(slug);
  if (!m || m[1] <= ARCHIVE_LAST_DATE) notFound();
  const raw = (await searchParams).name;
  const name = (Array.isArray(raw) ? raw[0] : raw ?? '').slice(0, 80).trim();
  const loaded = await fetchDivisionVotes(m[1], parseInt(m[2], 10), `/divisions/${slug}/mp`);
  if (!loaded) notFound();
  const { votes, voteRows } = loaded;
  const title = voteRows[0].division_title || `Commons Division ${m[2]}`;
  const q = fold(name);
  const hits = q.length < 2 ? [] : votes.filter((v) => {
    const n = fold(displayMpName(v.mp?.display_name ?? v.mp?.name) ?? '');
    const c = fold(v.mp?.constituency ?? '');
    return n.includes(q) || c.includes(q);
  }).sort((a, b) => (displayMpName(a.mp?.display_name ?? a.mp?.name) ?? '').localeCompare(displayMpName(b.mp?.display_name ?? b.mp?.name) ?? ''));
  const how = (t: string) => (t === 'aye' ? 'Aye' : t === 'no' ? 'No' : t === 'both' ? 'both lobbies' : t);
  const back = `/divisions/${slug}`;

  return (
    <OpenGovShell pageStamp="Commons Votes">
      <p style={{ margin: '0 0 12px' }}>
        <Link href={back} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontFamily: MONO, fontSize: '15px', color: ACCENT, textDecoration: 'underline' }}>← {title}</Link>
      </p>
      <h1 style={{ fontFamily: MONO, fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 'bold', margin: '0 0 16px', color: INK }}>Find an MP in this vote</h1>
      <form method="get" action={`/divisions/${slug}/mp`} role="search" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '8px', margin: '0 0 20px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 16em', fontFamily: MONO, fontSize: '15px', color: INK }}>
          Name or constituency
          <input type="text" name="name" defaultValue={name} autoComplete="off" required style={{ minHeight: '44px', fontSize: '16px', padding: '8px 10px', border: `1px solid ${INK}`, background: 'transparent', color: INK, borderRadius: 0 }} />
        </label>
        <button type="submit" style={{ minHeight: '44px', fontSize: '16px', padding: '0 18px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 0, fontFamily: MONO, cursor: 'pointer' }}>Find</button>
      </form>
      {q.length < 2 ? (
        <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>Type at least two letters of a name or constituency.</p>
      ) : hits.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK }}>
          No MP matching &ldquo;{name}&rdquo; is recorded in this vote. An MP who did not vote is not listed. <Link href={back} style={{ color: ACCENT }}>Every MP who voted</Link>.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontFamily: MONO, fontSize: '15px', color: INK }}>
          {hits.map((v) => {
            const label = displayMpName(v.mp?.display_name ?? v.mp?.name) ?? `Member ${v.member_id}`;
            return (
              <li key={`${v.member_id}-${v.vote_type}`} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)', padding: '10px 0', minHeight: '44px' }}>
                {v.mp ? <Link href={`/mps/${v.member_id}`} style={{ color: INK, fontWeight: 'bold' }}>{label}</Link> : <strong>{label}</strong>}
                {v.mp?.constituency ? `, ${v.mp.constituency}` : ''}: voted {how(v.vote_type)}{v.is_teller ? ' (teller, not counted)' : ''}.
              </li>
            );
          })}
        </ul>
      )}
    </OpenGovShell>
  );
}
