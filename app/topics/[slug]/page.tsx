import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import ServiceIndicator, { servicesForTopic } from '../../components/ServiceIndicator';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import { getTopic, topics } from '@/lib/topics';
import { departments } from '@/lib/departments';
import { editorials } from '@/lib/editorials';

export const revalidate = 3600;

export function generateStaticParams() {
  if (!topics.length) throw new Error('generateStaticParams topics: lib returned zero entries');
  return topics.map((t) => ({ slug: t.slug }));
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'Special Elite, monospace';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopic(slug);
  if (!t) return { title: 'Topic' };
  return {
    title: `${t.title} — Policy Topic`,
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

  const orFrom = (col: string, kws: string[]) => kws.map((k) => `${col}.ilike.%${k}%`).join(',');

  const [divRes, billRes, contribRes, mpRes, pollRes] = await Promise.all([
    supabase.from('commons_divisions_titled')
      .select('division_date_only, division_number, division_title')
      .or(orFrom('division_title', topic.keywords))
      .order('division_date_only', { ascending: false })
      .limit(10),
    supabase.from('bill')
      .select('id, title, is_act, current_stage, last_update')
      .or(orFrom('title', topic.keywords))
      .order('last_update', { ascending: false })
      .limit(8),
    supabase.from('mp_contribution_totals').select('member_id, wq_top_departments'),
    supabase.from('mps').select('member_id, name, party').or('current_member.is.null,current_member.eq.true'),
    supabase.from('polls')
      .select('id, question, vote_count_yes, vote_count_no, explainer')
      .eq('archived', false)
      .or(orFrom('question', topic.pollKeywords))
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const divisions = divRes.data || [];
  // Bills: active (not yet an Act) first, then most recent Acts.
  const bills = (billRes.data || []).slice().sort((a, b) => Number(!!a.is_act) - Number(!!b.is_act));

  // Top MPs by written questions to the topic's department(s).
  const deptSet = new Set(topic.deptApiNames);
  const nameById = new Map((mpRes.data || []).map((m) => [m.member_id as number, m]));
  const topMps = (contribRes.data || [])
    .map((r) => {
      const arr = Array.isArray(r.wq_top_departments) ? (r.wq_top_departments as { dept: string; count: number }[]) : [];
      let count = 0;
      for (const e of arr) if (deptSet.has(e.dept)) count += Number(e.count) || 0;
      return { member_id: r.member_id as number, count };
    })
    .filter((r) => r.count > 0 && nameById.has(r.member_id))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const dept = topic.departmentSlugs.length ? departments.find((d) => d.slug === topic.departmentSlugs[0]) : undefined;
  const relatedEditorials = topic.editorialSlugs.map((s) => editorials[s]).filter(Boolean);
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

      <ServiceIndicator services={servicesForTopic(topic.slug)} />

      {/* Top MPs */}
      {topMps.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>MPs scrutinising this most</h2>
          <p style={{ fontSize: '15px', color: INK, marginBottom: '12px' }}>By written questions tabled to the department this Parliament.</p>
          {topMps.map((r, i) => {
            const m = nameById.get(r.member_id)!;
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

      {/* Related editorials */}
      {relatedEditorials.length > 0 && (
        <section style={{ marginBottom: '6%' }}>
          <h2 style={sectionH2}>Investigations</h2>
          {relatedEditorials.map((e) => (
            <Link key={e.slug} href={`/editorials/${e.slug}`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>{e.headline} <span style={{ color: ACCENT }}>→</span></div>
              <p style={{ fontSize: '15px', color: INK, marginTop: '4px', lineHeight: 1.5 }}>{e.standfirst}</p>
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

      <ScrollToTopButton />
    </OpenGovShell>
  );
}
