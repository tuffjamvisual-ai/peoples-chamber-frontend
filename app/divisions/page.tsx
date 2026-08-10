import type { Metadata } from 'next';
import LastUpdated from '../components/LastUpdated';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';

// Browsable index of Commons divisions (recorded votes), newest first. Each
// links to the in-house division page. Data we already hold in mp_division_votes
// (surfaced one row per division via the commons_divisions_titled view).
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Commons Divisions',
  description: 'Every recorded vote in the House of Commons this Parliament, newest first, with how the House divided on each.',
  alternates: { canonical: '/divisions' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'Special Elite, monospace';
const PER_PAGE = 50;

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function DivisionsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const pageNum = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const from = (pageNum - 1) * PER_PAGE;

  const { data, count } = await supabase
    .from('commons_divisions_titled')
    .select('division_date_only, division_number, division_title', { count: 'exact' })
    .order('division_date_only', { ascending: false })
    .order('division_number', { ascending: false })
    .range(from, from + PER_PAGE - 1);

  const rows = data || [];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Group the page by sitting date.
  const byDate: { date: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const last = byDate[byDate.length - 1];
    if (last && last.date === r.division_date_only) last.items.push(r);
    else byDate.push({ date: r.division_date_only as string, items: [r] });
  }

  const href = (p: number) => (p <= 1 ? '/divisions' : `/divisions?page=${p}`);

  return (
    <OpenGovShell pageStamp="Divisions">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '3%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Commons Divisions
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          Every recorded vote in the House of Commons this Parliament, newest first. Open any division to see how every MP voted.
        </p>
      </header>

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '18px' }}>
        {total.toLocaleString()} divisions{totalPages > 1 ? ` · page ${pageNum} of ${totalPages}` : ''}
      </p>

      {rows.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>No divisions found.</p>}

      {byDate.map((group) => (
        <section key={group.date} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '8px' }}>
            {fmtDate(group.date)}
          </h2>
          {group.items.map((d) => (
            <Link
              key={`${d.division_date_only}-${d.division_number}`}
              href={`/divisions/pw-${d.division_date_only}-${d.division_number}-commons`}
              className="no-hover-scale"
              style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '11px 0' }}
            >
              <div style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', fontWeight: 'bold', lineHeight: 1.3 }}>{d.division_title}</div>
              <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '3px' }}>Division {d.division_number}</div>
            </Link>
          ))}
        </section>
      ))}

      {totalPages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '32px', fontFamily: MONO, fontSize: '15px' }}>
          {pageNum > 1 ? (
            <Link href={href(pageNum - 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>← Previous</Link>
          ) : (
            <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, opacity: 0.35 }}>← Previous</span>
          )}
          <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, background: 'rgba(122,22,18,0.06)' }}>{pageNum} / {totalPages}</span>
          {pageNum < totalPages ? (
            <Link href={href(pageNum + 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>Next →</Link>
          ) : (
            <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, opacity: 0.35 }}>Next →</span>
          )}
        </nav>
      )}

      <ScrollToTopButton />
      <LastUpdated sourceKey="division_votes" />
    </OpenGovShell>
  );
}
