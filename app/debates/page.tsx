import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';

// Commons debates index. Metadata is held in our `debates` table (synced daily
// from Hansard); the full transcript is rendered in-house on /debates/[extId].
// No outbound links anywhere.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Commons Debates',
  description:
    'Every debate held in the House of Commons this Parliament. Read the full record on site, by date and section.',
  alternates: { canonical: '/debates' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'Special Elite, monospace';
const PER_PAGE = 50;

const SECTIONS = ['Commons Chamber', 'Westminster Hall', 'General Committees'];

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function DebatesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const section = sp.section && SECTIONS.includes(sp.section) ? sp.section : null;
  const q = (sp.q || '').trim();
  const pageNum = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const from = (pageNum - 1) * PER_PAGE;

  let query = supabase
    .from('debates')
    .select('hansard_ext_id, title, sitting_date, section, summary, division_ids', { count: 'exact' })
    .order('sitting_date', { ascending: false })
    .order('title', { ascending: true })
    .range(from, from + PER_PAGE - 1);
  if (section) query = query.eq('section', section);
  if (q) query = query.ilike('title', `%${q}%`);

  const { data, count } = await query;
  const rows = data || [];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Group the current page by sitting date for date headers.
  const byDate: { date: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const last = byDate[byDate.length - 1];
    if (last && last.date === r.sitting_date) last.items.push(r);
    else byDate.push({ date: r.sitting_date, items: [r] });
  }

  const qs = (over: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const sec = over.section !== undefined ? over.section : section;
    const qq = over.q !== undefined ? over.q : q;
    const pg = over.page !== undefined ? over.page : pageNum;
    if (sec) p.set('section', String(sec));
    if (qq) p.set('q', String(qq));
    if (pg && Number(pg) > 1) p.set('page', String(pg));
    const s = p.toString();
    return s ? `/debates?${s}` : '/debates';
  };

  const tab = (label: string, value: string | null) => {
    const active = value === section;
    return (
      <Link
        key={label}
        href={qs({ section: value, page: 1 })}
        className="no-hover-scale"
        style={{
          fontFamily: MONO, fontSize: '15px', letterSpacing: '0.04em',
          textDecoration: 'none', padding: '7px 14px',
          border: `1px solid ${active ? ACCENT : HAIRLINE}`,
          background: active ? ACCENT : 'transparent',
          color: active ? '#fff' : INK,
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <OpenGovShell pageStamp="Debates">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '3%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Commons Debates
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          Every debate held in the House of Commons this Parliament, drawn from the official record. Read the full transcript of any debate on this site.
        </p>
      </header>

      <section style={{ border: `1px solid ${HAIRLINE}`, padding: '18px 20px', marginBottom: '24px', maxWidth: '760px', background: 'rgba(122,22,18,0.03)' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: '10px' }}>
          About these records
        </div>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: INK, marginBottom: '12px' }}>
          These are the official records of every debate in the House of Commons this Parliament. Each one is pulled from the parliamentary record and published here in full. Nothing is summarised and nothing links off this site.
        </p>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: INK, marginBottom: '12px' }}>
          Debates happen in three places. The <strong style={{ fontWeight: 'inherit' }}>Commons Chamber</strong> is the main floor of the House. <strong style={{ fontWeight: 'inherit' }}>Westminster Hall</strong> is the second debating room, used for backbench and constituency subjects that do not need a vote. <strong style={{ fontWeight: 'inherit' }}>General Committees</strong> work through the detail of bills and regulations line by line.
        </p>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: INK, marginBottom: '12px' }}>
          A debate may or may not end in a recorded vote. Where a vote is held it appears in the transcript, and the full division showing how every MP voted sits on its own page.
        </p>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: INK, margin: 0 }}>
          The record for a sitting is usually published the same evening, so a debate held today may show its transcript shortly after it finishes.
        </p>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {tab('All', null)}
        {SECTIONS.map((s) => tab(s, s))}
      </div>

      <form action="/debates" method="get" style={{ marginBottom: '20px' }}>
        {section && <input type="hidden" name="section" value={section} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search debates by title…"
          style={{ width: '100%', maxWidth: '480px', padding: '10px 14px', border: `2px solid ${HAIRLINE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: '15px', outline: 'none' }}
        />
      </form>

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '18px' }}>
        {total.toLocaleString()} debate{total === 1 ? '' : 's'}{section ? ` in ${section}` : ''}{q ? ` matching “${q}”` : ''}
        {totalPages > 1 ? ` · page ${pageNum} of ${totalPages}` : ''}
      </p>

      {rows.length === 0 && (
        <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>No debates found.</p>
      )}

      {byDate.map((group) => (
        <section key={group.date} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '8px' }}>
            {fmtDate(group.date)}
          </h2>
          {group.items.map((d) => (
            <div key={d.hansard_ext_id} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}>
              <Link href={`/debates/${d.hansard_ext_id}`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK }}>
                <div style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', fontWeight: 'bold', lineHeight: 1.3 }}>{d.title}</div>
                {d.summary && <div style={{ fontSize: '15px', color: INK, marginTop: '4px', lineHeight: 1.5 }}>{d.summary}</div>}
                <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '3px' }}>{d.section}</div>
              </Link>
              {Array.isArray(d.division_ids) && d.division_ids.length > 0 && (
                <Link href={`/divisions/${d.division_ids[0]}`} className="no-hover-scale" style={{ display: 'inline-block', marginTop: '6px', fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', color: '#fff', background: ACCENT, padding: '3px 9px', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {d.division_ids.length > 1 ? `${d.division_ids.length} votes →` : 'Vote held →'}
                </Link>
              )}
            </div>
          ))}
        </section>
      ))}

      {totalPages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '32px', fontFamily: MONO, fontSize: '15px' }}>
          {pageNum > 1 ? (
            <Link href={qs({ page: pageNum - 1 })} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>← Previous</Link>
          ) : (
            <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, opacity: 0.35 }}>← Previous</span>
          )}
          <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, background: 'rgba(122,22,18,0.06)' }}>{pageNum} / {totalPages}</span>
          {pageNum < totalPages ? (
            <Link href={qs({ page: pageNum + 1 })} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>Next →</Link>
          ) : (
            <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, opacity: 0.35 }}>Next →</span>
          )}
        </nav>
      )}

      <ScrollToTopButton />
    </OpenGovShell>
  );
}
