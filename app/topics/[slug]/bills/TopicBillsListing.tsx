import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import { getTopic, topicBillArgs } from '@/lib/topics';

export const TOPIC_BILLS_PER_PAGE = 20;

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Every bill and Act on a topic, newest first, 20 a page (owner's approval, 22 Oct 2026). Shared by
// /topics/[slug]/bills (page 1) and /topics/[slug]/bills/page/[page]; the same matching as the topic page
// (topic_bills_page, migration 2026-10-22a), with every copy of a reintroduced bill listed.
export default async function TopicBillsListing({ slug, page }: { slug: string; page: number }) {
  const topic = getTopic(slug);
  if (!topic) notFound();
  const { data, error } = await supabase.rpc('topic_bills_page', {
    ...topicBillArgs(topic), p_acts_only: false, p_limit: TOPIC_BILLS_PER_PAGE, p_offset: (page - 1) * TOPIC_BILLS_PER_PAGE,
  });
  // A failed read throws, so the last good version stays up.
  if (error) throw new Error(`topic ${slug} bills page ${page}: ${error.message}`);
  const bills = (data || []) as { id: number; title: string; is_act: boolean | null; current_stage: string | null; last_update: string; total: number }[];
  // A page past the end is not a page.
  if (!bills.length && page > 1) notFound();
  const total = Number(bills[0]?.total) || 0;
  const totalPages = Math.max(1, Math.ceil(total / TOPIC_BILLS_PER_PAGE));
  const href = (n: number) => (n === 1 ? `/topics/${slug}/bills` : `/topics/${slug}/bills/page/${n}`);

  return (
    <OpenGovShell pageStamp="Topics">
      <BackLink
        fallbackHref={`/topics/${slug}`}
        label={`← ${topic.title}`}
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Bills and Acts: {topic.title}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Every bill and Act on this topic, most recently updated first: government bills sponsored by the departments responsible, and other bills whose titles name the subject. A bill reintroduced in a later session is listed once for each session.
        </p>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px', opacity: 0.7 }}>
          {total === 0
            ? 'No bills on this topic'
            : <>Showing {(page - 1) * TOPIC_BILLS_PER_PAGE + 1}-{Math.min(page * TOPIC_BILLS_PER_PAGE, total)} of {total.toLocaleString()} · page {page} of {totalPages}</>}
        </p>
      </header>

      <section style={{ marginBottom: '6%' }}>
        {bills.map((b) => (
          <Link key={b.id} href={`/bills/${b.id}`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>
              {b.title}
              {b.is_act && <span style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Act</span>}
            </div>
            <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '3px' }}>
              {[b.current_stage, b.last_update ? `updated ${fmtDate(b.last_update)}` : ''].filter(Boolean).join(' · ')}
            </div>
          </Link>
        ))}
      </section>

      {totalPages > 1 && (
        <nav aria-label="Pages" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 32px', fontSize: '17px', marginBottom: '6%' }}>
          {page > 1 && <Link href={href(page - 1)} style={link}>← Newer</Link>}
          <span style={{ fontFamily: MONO, fontSize: '15px' }}>Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={href(page + 1)} style={link}>Older →</Link>}
        </nav>
      )}

      <p style={{ fontSize: '17px' }}>
        <Link href={`/topics/${slug}`} style={link}>Back to {topic.title}</Link>
      </p>
    </OpenGovShell>
  );
}
