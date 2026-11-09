import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { firstThatFits, wholeSentences } from '@/lib/meta-description';
import OpenGovShell from '../../components/OpenGovShell';
import WrittenQuestionsSummary from '../../components/WrittenQuestionsSummary';
import PhoneFolds, { type Fold } from '../../components/PhoneFolds';
import RecordDate from '../../components/RecordDate';
import StandardsCasesLine from '../../components/StandardsCasesLine';
import { longDay, updatedDate } from '@/lib/record-dates';
import { getPeer, peerInterests, peerVoting, lordsDivisionUrl, type Peer } from '@/lib/lords';
import { peerHasPage, parliamentProfileUrl, parliamentRegisterUrl, type Post } from '@/lib/peers';
import { questionsSummary } from '@/lib/mp-written-questions';
import { lookupMember } from '@/lib/former-mps';

// A member of the House of Lords (owner's yes, 3 Nov 2026): name, party, type of peerage, sitting since, posts held,
// a voting record summary with recent votes, the register of interests (owner, 4 Nov 2026), written questions and links
// to the official Parliament profile. No biography. Pages exist for current peers and anyone who has sat since 4 July 2024 (lib/peers.ts peerHasPage); earlier
// former peers go to their Parliament profile, and a member who was only ever an MP goes to /mps/[id]. A former MP now
// in the Lords links to their Commons record, and that record links back. Cached for a day; /api/sync-peers refreshes a
// peer's page when their stored row changes.
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const divider = '1px dashed rgba(20,16,13,0.2)';
const h2: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', margin: '26px 0 8px', color: INK };
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };

const fmt = (d: string | null | undefined) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
const peer = cache((memberId: number) => getPeer(supabase, memberId));
const statusLabel = (p: Peer) => (!p.is_current ? `Former member${p.end_date ? `, left ${fmt(p.end_date)}` : ''}` : p.status && p.status !== 'Current Member' ? p.status : null);

// Description in whole sentences (owner, 7 Nov 2026, L6), never cut with an ellipsis: who, party, peerage type and the
// dates in the Lords from Parliament's record, then what the page lists where that fits.
function lordsDescription(p: Peer, what: string): string {
  const who = `${p.name_display}${what ? ` (${what})` : ''}`;
  const lead = p.is_current
    ? (p.start_date ? `${who} has been a member of the House of Lords since ${fmt(p.start_date)}.` : `${who} is a member of the House of Lords.`)
    : (p.start_date && p.end_date ? `${who} was a member of the House of Lords from ${fmt(p.start_date)} to ${fmt(p.end_date)}.` : `${who} is a former member of the House of Lords.`);
  return wholeSentences([lead, firstThatFits(lead, ["This page lists their posts, votes and written questions from Parliament's records.", 'Their posts, votes and written questions are listed.'])]);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const memberId = Number(id);
  const p = Number.isInteger(memberId) && memberId > 0 ? await peer(memberId) : null;
  if (!p || !peerHasPage(p)) return { title: 'House of Lords', robots: { index: false, follow: true } };
  const what = [p.party, p.peerage_type].filter(Boolean).join(', ');
  // A title another member has held too (two Archbishops of Canterbury) adds their years in the Lords from Parliament's data, so no two pages share a title (owner, 7 Nov 2026).
  const { count: sameName, error: sameErr } = await supabase.from('peers').select('member_id', { count: 'exact', head: true }).eq('name_display', p.name_display);
  if (sameErr) throw new Error(`/lords/[id] same name: ${sameErr.message}`);
  const from = p.start_date?.slice(0, 4), to = p.end_date?.slice(0, 4);
  const years = (sameName ?? 0) > 1 && from ? ` (${to ? (to === from ? from : `${from} to ${to}`) : `since ${from}`})` : '';
  return {
    title: titleWithin(`${p.name_display}${years}${p.party ? `, ${p.party}` : ''}`),
    description: lordsDescription(p, what),
    alternates: { canonical: `/lords/${memberId}` },
  };
}

function PostList({ posts, current }: { posts: Post[]; current: boolean }) {
  const rows = posts.filter((p) => (current ? !p.endDate : !!p.endDate));
  if (!rows.length) return null;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 6px', fontSize: '15px' }}>
      {rows.map((p, i) => (
        <li key={`${p.name}-${p.startDate}-${i}`} style={{ padding: '5px 0', borderBottom: divider }}>
          <strong>{p.name}</strong>
          {p.additionalInfo && p.additionalInfo !== p.name && <span>, {p.additionalInfo}</span>}
          <span style={{ whiteSpace: 'nowrap' }}> · {p.startDate ? fmt(p.startDate) : ''}{p.endDate ? ` to ${fmt(p.endDate)}` : ' to date'}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PeerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();
  const p = await peer(memberId);
  if (!p) {
    // Not a peer: an MP or former MP has a page at /mps/[id]; anyone else is not found.
    const m = await lookupMember(memberId);
    if (m.kind === 'former_mp') permanentRedirect(`/mps/${memberId}`);
    notFound();
  }
  if (!peerHasPage(p)) redirect(parliamentProfileUrl(memberId));

  const [voting, interests, questions, member] = await Promise.all([
    peerVoting(supabase, memberId).catch((e) => { console.error(`/lords/${memberId} votes:`, e instanceof Error ? e.message : e); return null; }),
    peerInterests(supabase, memberId).catch((e) => { console.error(`/lords/${memberId} interests:`, e instanceof Error ? e.message : e); return []; }),
    questionsSummary(supabase, memberId, 'Lords').catch((e) => { console.error(`/lords/${memberId} questions:`, e instanceof Error ? e.message : e); return null; }),
    lookupMember(memberId).catch(() => null), // a former MP: link to the Commons record
  ]);
  const wasMp = member?.kind === 'former_mp';
  const status = statusLabel(p);
  const allPosts = { government: p.government_posts ?? [], opposition: p.opposition_posts ?? [], other: p.other_posts ?? [] };
  const posts = [...allPosts.government, ...allPosts.opposition, ...allPosts.other];
  const committees = p.committee_memberships ?? [];

  // Under each section: the peer's own posts check; the newest sync of the Lords votes and written questions tables.
  const [votesUpdated, questionsUpdated, interestsUpdated] = await Promise.all([
    updatedDate('lords_divisions', 'synced_at'), updatedDate('parliament_written_questions', 'fetched_at'),
    interests.length ? updatedDate('peer_registered_interests', 'last_seen_date') : null,
  ]);
  const countOf = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
  const currentPosts = posts.filter((x) => !x.endDate).length;
  const currentCommittees = committees.filter((x) => !x.endDate).length;
  const folds: Fold[] = [];
  if (posts.length > 0 || committees.length > 0) folds.push({
    id: 'posts',
    label: 'Posts held',
    summary: [currentPosts > 0 && countOf(currentPosts, 'current post'), currentCommittees > 0 && countOf(currentCommittees, 'committee')].filter(Boolean).join(', ') || null,
    node: (
        <div style={{ color: INK }}>
          <h2 id="peer-posts" style={h2}>Posts held</h2>
          <PostList posts={posts} current />
          {committees.some((c) => !c.endDate) && (
            <>
              <h3 style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '12px 0 4px' }}>Committees</h3>
              <PostList posts={committees} current />
            </>
          )}
          {(posts.some((x) => x.endDate) || committees.some((x) => x.endDate)) && (
            <details style={{ marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '15px' }}>Past posts and committees</summary>
              <PostList posts={posts} current={false} />
              <PostList posts={committees} current={false} />
            </details>
          )}
          {p.posts_checked_at && <RecordDate text={`Updated ${longDay(p.posts_checked_at)}`} source="peers.posts_checked_at" />}
        </div>
    ),
  });
  const interestCount = interests.reduce((n, c) => n + c.entries.length, 0);
  if (interestCount > 0) folds.push({
    id: 'interests',
    label: 'Register of interests',
    summary: countOf(interestCount, 'entry', 'entries'),
    node: (
        <div style={{ color: INK }}>
          <h2 id="peer-interests" style={h2}>Register of interests</h2>
          {!p.is_current && p.end_date && (
            <p style={{ fontSize: '15px', margin: '0 0 8px' }}>Last published by Parliament. This member left the House of Lords on {fmt(p.end_date)}.</p>
          )}
          {interests.map((c) => (
            <section key={c.id} style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '12px 0 4px' }}>{c.name}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px' }}>
                {c.entries.map((e) => (
                  <li key={e.interest_id} style={{ padding: '6px 0', borderBottom: divider, overflowWrap: 'anywhere' }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{e.interest_text}</div>
                    {(e.child_interests ?? []).length > 0 && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 12px', borderLeft: '2px solid rgba(20,16,13,0.15)' }}>
                        {(e.child_interests ?? []).map((k, i) => (
                          <li key={k.id ?? i} style={{ padding: '4px 0 4px 12px', whiteSpace: 'pre-wrap' }}>{k.interest || ''}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p style={{ fontSize: '15px', margin: '8px 0 0' }}>
            <a href={parliamentRegisterUrl(memberId)} target="_blank" rel="noopener noreferrer" style={link}>Official register of interests</a>
          </p>
          {interestsUpdated && <RecordDate text={`Updated ${interestsUpdated}`} source="peer_registered_interests.last_seen_date" />}
        </div>
    ),
  });
  if (voting) folds.push({
    id: 'votes',
    label: 'Voting record',
    summary: voting.voted === 0 ? 'no votes recorded' : `voted in ${voting.voted.toLocaleString('en-GB')} of ${voting.divisions.toLocaleString('en-GB')} divisions`,
    node: (
        <div style={{ color: INK }}>
          <h2 id="peer-votes" style={h2}>Voting record</h2>
          {voting.voted === 0 ? (
            <p style={{ fontSize: '15px' }}>No votes recorded in the {voting.divisions.toLocaleString('en-GB')} Lords divisions since {fmt(voting.firstDivision)}.</p>
          ) : (
            <>
              <p style={{ fontSize: '15px', margin: '0 0 8px' }}>
                Voted in <strong>{voting.voted.toLocaleString('en-GB')}</strong> of {voting.divisions.toLocaleString('en-GB')} divisions since {fmt(voting.firstDivision)}:
                {' '}{voting.content.toLocaleString('en-GB')} content, {voting.notContent.toLocaleString('en-GB')} not content.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px' }}>
                {voting.recent.map((v) => (
                  <li key={v.division_id} style={{ padding: '7px 0', borderBottom: divider }}>
                    <span style={{ fontFamily: 'var(--font-special-elite), monospace', whiteSpace: 'nowrap' }}>{fmt(v.division_date)}</span>
                    {' · '}<strong>{v.vote === 'content' ? 'Content' : v.vote === 'not_content' ? 'Not content' : v.vote}</strong>
                    <div>
                      <a href={lordsDivisionUrl(v.division_id)} target="_blank" rel="noopener noreferrer" style={link}>{(v.title || `Division ${v.division_id}`).trim()}</a>
                      {v.bill_id && <> · <Link href={`/bills/${v.bill_id}`} style={link}>the bill</Link></>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {votesUpdated && <RecordDate text={`Updated ${votesUpdated}`} source="lords_divisions.synced_at" />}
        </div>
    ),
  });
  if (questions && questions.total > 0) folds.push({
    id: 'questions',
    label: 'Written questions',
    summary: countOf(questions.total, 'question'),
    node: (
        <div style={{ color: INK }}>
          <h2 id="peer-questions" style={h2}>Written questions</h2>
          <WrittenQuestionsSummary summary={questions} allHref={`/lords/${memberId}/questions`} />
          {questionsUpdated && <RecordDate text={`Updated ${questionsUpdated}`} source="parliament_written_questions.fetched_at" />}
        </div>
    ),
  });

  return (
    <OpenGovShell pageStamp="House of Lords">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'House of Lords', path: '/lords' }, { name: p.name_display, path: `/lords/${memberId}` }])} />
      <Link href="/lords" className="no-hover-scale" style={{ display: 'inline-block', marginBottom: '14px', color: INK, textDecoration: 'none', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        ← House of Lords
      </Link>

      <header style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '8px', color: INK }}>
        {p.thumbnail_url && (
          // Parliament's official thumbnail, served by Parliament (attributed in the site footer, as on MP pages).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumbnail_url} alt={p.name_display} width={120} height={120} loading="eager" fetchPriority="high"
            style={{ width: '120px', height: '120px', objectFit: 'cover', border: `1px solid rgba(20,16,13,0.25)`, background: '#d6cdb8' }} />
        )}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 'bold', margin: '0 0 6px', lineHeight: 1.15 }}>{p.name_display}</h1>
          <p style={{ fontSize: '16px', margin: '0 0 4px' }}>
            {p.party_colour && <span aria-hidden style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: `#${p.party_colour}`, marginRight: '8px' }} />}
            {[p.party, p.peerage_type].filter(Boolean).join(' · ')}
          </p>
          {p.start_date && <p style={{ fontSize: '15px', margin: '0 0 4px' }}>{p.is_current ? 'Sitting since' : 'Sat from'} {fmt(p.start_date)}{!p.is_current && p.end_date ? ` to ${fmt(p.end_date)}` : ''}</p>}
          {status && <p style={{ fontSize: '15px', fontWeight: 'bold', color: ACCENT, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{status}</p>}
          <p style={{ fontSize: '15px', margin: '6px 0 0' }}>
            <a href={parliamentProfileUrl(memberId)} target="_blank" rel="noopener noreferrer" style={link}>Official Parliament profile</a>
            {wasMp && <> · <Link href={`/mps/${memberId}`} style={link}>Record as an MP</Link></>}
          </p>
        </div>
      </header>

      {/* Commissioner for Standards cases (owner, 7 Nov 2026, T1): one line, at every width, for a member with any. */}
      <StandardsCasesLine memberId={memberId} style={{ marginTop: '12px' }} />

      {/* Under 480px each section folds away, as on MP pages; from 480px up they read as before. */}
      <PhoneFolds folds={folds} />
    </OpenGovShell>
  );
}
