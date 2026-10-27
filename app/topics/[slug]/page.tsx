import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import ServiceIndicator, { servicesForTopic } from '../../components/ServiceIndicator';
import BackLink from '../../components/BackLink';
import { getTopic, topics, topicBillArgs, newestPerTitle, wholeWordsPattern, matchWords } from '@/lib/topics';
import { departments } from '@/lib/departments';
import { editorials } from '@/lib/editorials';
import { listSummary } from '@/lib/editorials/list-summary';
import { readingLabel, textReadingLabel } from '@/lib/reading-time';
import ContinueToArticle from '../../components/ContinueToArticle';
import ParliamentSourceCredit from '@/app/components/ParliamentSourceCredit';

export const revalidate = 86400;

export function generateStaticParams() {
  if (!topics.length) throw new Error('generateStaticParams topics: lib returned zero entries');
  return topics.map((t) => ({ slug: t.slug }));
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopic(slug);
  if (!t) return { title: 'Topic' };
  return {
    title: `${t.title}: Policy Topic`,
    description: t.blurb.slice(0, 200),
    alternates: { canonical: `/topics/${slug}` },
  };
}

const sectionH2: React.CSSProperties = {
  fontFamily: MONO, fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '14px',
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  // Whole-word matching and bills by sponsoring department (rule B, lib/topics.ts).
  const words = wholeWordsPattern(topic.words)!;
  const exclude = wholeWordsPattern(topic.exclude);
  let divQuery = supabase.from('commons_divisions_fts')
    .select('division_date_only, division_number, division_title')
    .filter('division_title', 'imatch', words);
  if (exclude) divQuery = divQuery.not('division_title', 'imatch', exclude);

  const [divRes, billRes, actRes, namedRes, topRes, pollRes, briefRes] = await Promise.all([
    divQuery.order('division_date_only', { ascending: false }).limit(10),
    supabase.rpc('topic_bills', { ...topicBillArgs(topic), p_limit: 40 }),
    // Key Acts (owner's approval, 22 Oct 2026): the 8 newest Acts, newest per title, then any Act named by title.
    supabase.rpc('topic_bills_page', { ...topicBillArgs(topic), p_acts_only: true, p_limit: 40, p_offset: 0 }),
    topic.billTitles?.length
      ? supabase.from('bill').select('id, title, is_act, current_stage, last_update').in('title', topic.billTitles).eq('is_act', true).is('hidden_reason', null).order('last_update', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    // Top MPs by written questions to the topic's departments, ranked in the database (top_question_askers,
    // migration 2026-10-21b) instead of reading every MP's totals here.
    supabase.rpc('top_question_askers', { p_depts: topic.deptApiNames, p_limit: 5 }),
    supabase.from('polls')
      .select('id, question, vote_count_yes, vote_count_no, explainer')
      .eq('archived', false)
      .filter('question', 'imatch', wholeWordsPattern(topic.pollWords)!)
      .order('created_at', { ascending: false })
      .limit(1),
    // Published database briefings, matched to the topic below by its words (Reports, 23 Oct 2026).
    supabase.from('briefings').select('slug, headline, summary, body, published_at, created_at').eq('is_published', true),
  ]);

  // A failed read throws (owner's approval, 21 Oct 2026): six topic pages were once built with no bills when this
  // search timed out. The last good version stays up instead.
  for (const [name, r] of [['divisions', divRes], ['bills', billRes], ['acts', actRes], ['named acts', namedRes], ['poll', pollRes], ['briefings', briefRes]] as const) {
    if (r.error) throw new Error(`topic ${slug} ${name}: ${r.error.message}`);
  }
  const divisions = divRes.data || [];
  type BillRow = { id: number; title: string; is_act: boolean | null; current_stage: string | null; last_update: string };
  // The same bill is often reintroduced each session under the same title (owner's approval, 22 Oct 2026): only the
  // newest of each title is listed, so the 8 shown are different bills. topic_bills returns newest first.
  const newest = newestPerTitle((billRes.data || []) as BillRow[]).slice(0, 8);
  // Bills: active (not yet an Act) first, then most recent Acts.
  const bills = newest.sort((a, b) => Number(!!a.is_act) - Number(!!b.is_act));
  const keyActs = newestPerTitle([...newestPerTitle((actRes.data || []) as BillRow[]).slice(0, 8), ...((namedRes.data || []) as BillRow[])]);

  // Top MPs by written questions to the topic's department(s).
  if (topRes.error) throw new Error(`top_question_askers: ${topRes.error.message}`);
  const topMps = ((topRes.data || []) as { member_id: number; name: string | null; party: string | null; questions: number }[])
    .map((r) => ({ member_id: r.member_id, count: Number(r.questions) || 0, name: r.name, party: r.party }));

  const dept = topic.departmentSlugs.length ? departments.find((d) => d.slug === topic.departmentSlugs[0]) : undefined;
  // Newest first (topic hubs now list every piece on the subject, 16 Oct 2026).
  // Reports on the topic: investigations and file briefings from editorialSlugs, plus published database
  // briefings whose headline and summary match the topic's words (owner's approval, 23 Oct 2026).
  const relatedEditorials = [
    ...topic.editorialSlugs.map((s) => editorials[s]).filter(Boolean).map((e) => ({
      href: `/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`, headline: e.headline, summary: listSummary(e), date: e.publishedAt || '', readingLabel: readingLabel(e),
    })),
    ...((briefRes.data || []) as { slug: string; headline: string; summary: string | null; body: string | null; published_at: string | null; created_at: string }[])
      .filter((b) => matchWords(`${b.headline} ${b.summary ?? ''}`, topic.words, topic.exclude))
      .map((b) => ({ href: `/briefings/${b.slug}`, headline: b.headline, summary: b.summary ?? '', date: (b.published_at || b.created_at).slice(0, 10), readingLabel: textReadingLabel(b.headline, b.body) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const poll = (pollRes.data || [])[0];

  return (
    <OpenGovShell pageStamp="Topics">
      <BackLink
        fallbackHref="/topics"
        label="← All topics"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          {topic.title}
        </h1>
        <p style={{ fontSize: '17px', lineHeight: 1.75, maxWidth: '760px', color: INK }}>{topic.blurb}</p>
      </header>

      {/* Department assessment */}
      {dept && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>The department responsible</h2>
          <Link href={`/departments/${dept.slug}`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, border: `1px solid ${HAIRLINE}`, padding: '16px 18px' }}>
            <div style={{ fontSize: 'clamp(17px, 2vw, 22px)', fontWeight: 'bold', marginBottom: '4px' }}>{dept.name} <span style={{ color: ACCENT }}>→</span></div>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>{dept.description}</p>
          </Link>
        </section>
      )}

      {/* Open Govt data pages for this topic */}
      {topic.dataPages && topic.dataPages.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>Data on Open Govt</h2>
          {topic.dataPages.map((d) => (
            <Link key={d.href} href={d.href} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, border: `1px solid ${HAIRLINE}`, padding: '16px 18px', marginBottom: '10px' }}>
              <div style={{ fontSize: 'clamp(17px, 2vw, 22px)', fontWeight: 'bold', marginBottom: '4px' }}>{d.title} <span style={{ color: ACCENT }}>→</span></div>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>{d.description}</p>
            </Link>
          ))}
        </section>
      )}

      <ServiceIndicator services={servicesForTopic(topic.slug)} />

      {/* Top MPs */}
      {topMps.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>MPs scrutinising this most</h2>
          <p style={{ fontSize: '15px', color: INK, marginBottom: '12px' }}>By written questions tabled to the department this Parliament.</p>
          {topMps.map((r, i) => {
            const m = r;
            return (
              <Link key={r.member_id} href={`/mps/${r.member_id}`} className="no-hover-scale" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '10px 0' }}>
                <span style={{ fontWeight: 'bold' }}>{i + 1}. {String(m.name || '').replace(/\s+MP$/, '')} <span style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'normal' }}>{m.party || ''}</span></span>
                <span style={{ fontFamily: MONO, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>{r.count.toLocaleString()}</span>
              </Link>
            );
          })}
        </section>
      )}

      {/* Recent divisions */}
      {divisions.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>Recent Commons votes</h2>
          {divisions.map((d) => (
            <Link key={`${d.division_date_only}-${d.division_number}`} href={`/divisions/pw-${d.division_date_only}-${d.division_number}-commons`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>{d.division_title}</div>
              <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '3px' }}>{fmtDate(d.division_date_only as string)}</div>
            </Link>
          ))}
        </section>
      )}

      {/* Related bills */}
      {bills.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>Bills and Acts</h2>
          {bills.map((b) => (
            <Link key={b.id} href={`/bills/${b.id}`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>
                {b.title}
                {b.is_act && <span style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Act</span>}
              </div>
              {b.current_stage && <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '3px' }}>{b.current_stage}</div>}
            </Link>
          ))}
        </section>
      )}

      {/* Key Acts, then the topic's full list of bills and Acts */}
      {keyActs.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>Key Acts</h2>
          {keyActs.map((b) => (
            <Link key={b.id} href={`/bills/${b.id}`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>{b.title}</div>
            </Link>
          ))}
        </section>
      )}
      {(bills.length > 0 || keyActs.length > 0) && (
        <p style={{ marginTop: '-4%', marginBottom: '6%', fontSize: '17px' }}>
          <Link href={`/topics/${topic.slug}/bills`} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>All bills and Acts on this topic</Link>
        </p>
      )}

      {/* Related editorials */}
      {relatedEditorials.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>Reports</h2>
          {relatedEditorials.map((e) => (
            <Link key={e.href} href={e.href} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>{e.headline}</div>
              {/* These cards carry no date, so the reading time sits on its own line under the headline. */}
              <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '3px' }}>{e.readingLabel}</div>
              {e.summary && <p style={{ fontSize: '15px', color: INK, marginTop: '4px', lineHeight: 1.5 }}>{e.summary}</p>}
              <ContinueToArticle style={{ marginTop: '4px' }} />
            </Link>
          ))}
        </section>
      )}

      {/* People's Poll */}
      {poll && (
        <section style={{ marginBottom: '4%' }}>
          <h2 style={sectionH2}>The public’s view</h2>
          <div style={{ border: `1px solid ${HAIRLINE}`, padding: '16px 18px' }}>
            <div style={{ fontSize: '17px', fontWeight: 'bold', lineHeight: 1.35, marginBottom: '10px' }}>{poll.question}</div>
            {(() => {
              const yes = Number(poll.vote_count_yes || 0);
              const no = Number(poll.vote_count_no || 0);
              const tot = yes + no || 1;
              return (
                <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '12px' }}>
                  Yes {Math.round((100 * yes) / tot)}% · No {Math.round((100 * no) / tot)}% <span style={{ opacity: 0.7 }}>({tot.toLocaleString()} votes)</span>
                </div>
              );
            })()}
            <Link href={`/polls#poll-${poll.id}`} style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Cast your vote on the opengovt Polls →
            </Link>
          </div>
        </section>
      )}

      <ParliamentSourceCredit />
    </OpenGovShell>
  );
}
