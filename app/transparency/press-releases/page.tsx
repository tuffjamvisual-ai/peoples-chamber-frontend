import type { Metadata } from 'next';
import LastUpdated from '../../components/LastUpdated';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import Pagination from '../../components/Pagination';

// Static /transparency/press-releases route. Lives outside the dynamic
// [section] route because press releases aren't a tabular dataset — each
// one is an individual document with its own /news/[slug] detail page.
// Static wins over dynamic in Next routing, so this file takes precedence
// over [section]/page.tsx for the press-releases slug. The transparency
// hub at /transparency carries the 7th card pointing here. Sitemap has
// the index URL + every /news/[slug] URL it lists, so Google can crawl
// the release pages from the transparency surface. Added 2026-06-04.

export const revalidate = 3600;

const INK = '#14100d';
const ACCENT = '#6b2417';

const SOURCE_HEADER = {
  fontSize: 'clamp(20px, 2.8vw, 30px)',
  fontWeight: 'bold' as const,
  letterSpacing: '-0.01em',
  marginBottom: '22px',
  color: INK,
  transform: 'rotate(-0.2deg)',
  textShadow: '1px 1px 0px rgba(0,0,0,0.08)',
};

type Release = {
  id: number;
  title: string;
  description: string | null;
  organisation: string | null;
  published_at: string | null;
  gov_url: string | null;
};

function slugFromGovUrl(govUrl: string | null): string | null {
  if (!govUrl) return null;
  const m = govUrl.match(/\/([a-z0-9-]+)\/?$/i);
  return m ? m[1] : null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Group a set of releases by month, most recent first (input is already sorted).
function groupByMonth(items: Release[]): Map<string, Release[]> {
  const grouped = new Map<string, Release[]>();
  for (const r of items) {
    const monthLabel = r.published_at
      ? new Date(r.published_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : 'Undated';
    if (!grouped.has(monthLabel)) grouped.set(monthLabel, []);
    grouped.get(monthLabel)!.push(r);
  }
  return grouped;
}

// The plain list of release rows (shared by the month-grouped and single-day
// views). Each row links to its on-site /news/[slug] page.
function ReleaseList({ items, fallbackOrg }: { items: Release[]; fallbackOrg: string }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((r) => {
        const slug = slugFromGovUrl(r.gov_url);
        const href = slug ? `/news/${slug}` : null;
        const inner = (
          <>
            <div
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: '15px',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: ACCENT,
                marginBottom: '4px',
              }}
            >
              {r.organisation || fallbackOrg}
              {r.published_at ? ` · ${fmtDate(r.published_at)}` : ''}
            </div>
            <p
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: '15px',
                lineHeight: 1.4,
                color: INK,
                fontWeight: 600,
                marginBottom: r.description ? '6px' : 0,
              }}
            >
              {r.title}
            </p>
            {r.description && (
              <p
                style={{
                  fontFamily: 'Special Elite, monospace',
                  fontSize: '15px',
                  lineHeight: 1.65,
                  color: INK,
                  opacity: 0.85,
                  margin: 0,
                }}
              >
                {r.description}
              </p>
            )}
          </>
        );

        return (
          <li key={r.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(20,16,13,0.12)' }}>
            {href ? (
              <Link href={href} style={{ display: 'block', textDecoration: 'none', color: INK }} className="press-card no-hover-scale">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

const monthH3Style: React.CSSProperties = {
  fontFamily: 'Special Elite, monospace',
  fontSize: '15px',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: ACCENT,
  marginBottom: '16px',
  fontWeight: 600,
  borderBottom: '1px solid rgba(20,16,13,0.18)',
  paddingBottom: '6px',
};

// Render the month-grouped list for one source (used by search results).
function ReleaseMonths({ grouped, noun, fallbackOrg }: { grouped: Map<string, Release[]>; noun: string; fallbackOrg: string }) {
  return (
    <>
      {Array.from(grouped.entries()).map(([month, items]) => (
        <section key={month} style={{ marginBottom: '40px' }}>
          <h3 style={monthH3Style}>
            {month} · {items.length} {items.length === 1 ? noun : `${noun}s`}
          </h3>
          <ReleaseList items={items} fallbackOrg={fallbackOrg} />
        </section>
      ))}
    </>
  );
}

export const metadata: Metadata = {
  title: 'Press Releases',
  description:
    'The full archive of UK Government department press releases from 2007 to today, plus House of Commons select committee reports. Each entry links through to a full text page.',
  alternates: { canonical: '/transparency/press-releases' },
};

const COLS = 'id, title, description, organisation, published_at, gov_url';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#f4e8d4';
const isCommonsRow = (r: Release) => (r.gov_url || '').includes('parliament.uk');
const toDateStr = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
function fmtLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const SEARCH_PER = 100;

// Busiest days (GOV.UK) for the day-view quick-jump. Aggregates ~1,900 dates,
// so cache it hourly (per the heavy-aggregation caching pattern) rather than
// recomputing on every day-mode render.
const getBusiestDays = unstable_cache(
  async (): Promise<Array<{ date: string; count: number }>> => {
    const counts = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from('press_releases')
        .select('published_at')
        .ilike('gov_url', '%gov.uk%')
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const r of data) {
        const d = (r.published_at as string | null)?.slice(0, 10);
        if (d) counts.set(d, (counts.get(d) || 0) + 1);
      }
      if (data.length < 1000) break;
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([date, count]) => ({ date, count }));
  },
  ['press-releases-busiest-days'],
  { revalidate: 3600 },
);

const inputStyle: React.CSSProperties = {
  fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK,
  border: `1px solid ${HAIRLINE}`, background: 'transparent', padding: '8px 10px',
};
const btnStyle: React.CSSProperties = {
  fontFamily: 'Special Elite, monospace', fontSize: '15px', color: CREAM, background: INK,
  border: `1px solid ${INK}`, padding: '8px 16px', cursor: 'pointer',
};
const navLinkStyle: React.CSSProperties = {
  fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK, textDecoration: 'none',
  border: `1px solid ${HAIRLINE}`, padding: '8px 14px', whiteSpace: 'nowrap',
};
const navDisabledStyle: React.CSSProperties = { ...navLinkStyle, color: 'rgba(20,16,13,0.35)', pointerEvents: 'none' };
const dayLabelStyle: React.CSSProperties = {
  fontFamily: 'Special Elite, monospace', fontSize: 'clamp(15px, 2.4vw, 21px)', fontWeight: 700,
  color: INK, textAlign: 'center', flex: '1 1 auto',
};

export default async function PressReleasesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rawQ = (sp.q || '').trim();
  // Strip PostgREST-special characters so the raw or() filter can't be broken.
  const safeQ = rawQ.replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const isSearch = safeQ.length > 0;
  const pageNum = Math.max(1, parseInt(sp.page || '1', 10) || 1);

  // Headline count of GOV.UK rows, shown in the intro in both modes.
  const govCountRes = await supabase
    .from('press_releases')
    .select('id', { count: 'exact', head: true })
    .ilike('gov_url', '%gov.uk%');
  const govTotal = govCountRes.count ?? 0;

  let content: React.ReactNode;

  if (isSearch) {
    // SEARCH MODE — match title / description / organisation across all dates,
    // paginated at the database level (fetch only this page's slice + count).
    const pat = `*${safeQ}*`;
    const orFilter = `title.ilike.${pat},description.ilike.${pat},organisation.ilike.${pat}`;
    const offset = (pageNum - 1) * SEARCH_PER;
    const { data: matchRows, count } = await supabase
      .from('press_releases')
      .select(COLS, { count: 'exact' })
      .or(orFilter)
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + SEARCH_PER - 1);
    const matches = (matchRows || []) as Release[];
    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / SEARCH_PER));
    const gov = matches.filter((r) => !isCommonsRow(r));
    const com = matches.filter(isCommonsRow);
    content = (
      <div>
        <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK, marginBottom: '24px' }}>
          <strong>{total.toLocaleString()}</strong> {total === 1 ? 'result' : 'results'} for &ldquo;<strong>{rawQ}</strong>&rdquo;
          {totalPages > 1 ? ` · page ${pageNum} of ${totalPages}` : ''}.{' '}
          <Link href="/transparency/press-releases" style={{ color: ACCENT, textDecoration: 'underline' }}>Clear search</Link>
        </p>
        {total === 0 ? (
          <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK }}>No press releases match that search.</p>
        ) : (
          <>
            {gov.length > 0 && (
              <>
                <h2 style={SOURCE_HEADER}>UK Government departments</h2>
                <ReleaseMonths grouped={groupByMonth(gov)} noun="release" fallbackOrg="UK Government" />
              </>
            )}
            {com.length > 0 && (
              <>
                <h2 style={{ ...SOURCE_HEADER, marginTop: '52px' }}>House of Commons committee reports</h2>
                <ReleaseMonths grouped={groupByMonth(com)} noun="report" fallbackOrg="House of Commons" />
              </>
            )}
            <Pagination
              currentPage={pageNum}
              totalPages={totalPages}
              baseUrl="/transparency/press-releases"
              qsExtra={`&q=${encodeURIComponent(rawQ)}`}
            />
          </>
        )}
      </div>
    );
  } else {
    // DAY MODE — one day's press releases per page, with day navigation.
    const [latestRes, earliestRes] = await Promise.all([
      supabase.from('press_releases').select('published_at').order('published_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      supabase.from('press_releases').select('published_at').order('published_at', { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
    ]);
    const latestDate = toDateStr(latestRes.data?.published_at);
    const earliestDate = toDateStr(earliestRes.data?.published_at);
    const currentDate = sp.date && DATE_RE.test(sp.date) ? sp.date : latestDate || '';
    const dayStart = `${currentDate}T00:00:00.000Z`;
    const dayEnd = `${currentDate}T23:59:59.999Z`;

    const [dayRes, prevRes, nextRes] = await Promise.all([
      supabase.from('press_releases').select(COLS).gte('published_at', dayStart).lte('published_at', dayEnd).order('published_at', { ascending: false, nullsFirst: false }),
      supabase.from('press_releases').select('published_at').lt('published_at', dayStart).order('published_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      supabase.from('press_releases').select('published_at').gt('published_at', dayEnd).order('published_at', { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
    ]);
    const dayRows = (dayRes.data || []) as Release[];
    const gov = dayRows.filter((r) => !isCommonsRow(r));
    const com = dayRows.filter(isCommonsRow);
    const prevDate = toDateStr(prevRes.data?.published_at);
    const nextDate = toDateStr(nextRes.data?.published_at);
    const busiestDays = await getBusiestDays();

    content = (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {prevDate ? (
            <Link href={`/transparency/press-releases?date=${prevDate}`} style={navLinkStyle} className="no-hover-scale">&larr; Earlier</Link>
          ) : (
            <span style={navDisabledStyle}>&larr; Earlier</span>
          )}
          <span style={dayLabelStyle}>{currentDate ? fmtLongDate(currentDate) : '—'}</span>
          {nextDate ? (
            <Link href={`/transparency/press-releases?date=${nextDate}`} style={navLinkStyle} className="no-hover-scale">Later &rarr;</Link>
          ) : (
            <span style={navDisabledStyle}>Later &rarr;</span>
          )}
        </div>

        <form method="GET" action="/transparency/press-releases" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <label htmlFor="date-jump" style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK }}>Jump to date</label>
          <input id="date-jump" type="date" name="date" defaultValue={currentDate} min={earliestDate || undefined} max={latestDate || undefined} style={inputStyle} />
          <button type="submit" style={btnStyle}>Go</button>
        </form>

        {busiestDays.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK, marginBottom: '8px' }}>Jump to a busy day</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {busiestDays.map((b) => (
                <Link
                  key={b.date}
                  href={`/transparency/press-releases?date=${b.date}`}
                  style={{ ...navLinkStyle, fontSize: '15px', padding: '6px 10px', fontWeight: b.date === currentDate ? 700 : 400 }}
                  className="no-hover-scale"
                >
                  {fmtShortDate(b.date)} · {b.count}
                </Link>
              ))}
            </div>
          </div>
        )}

        {dayRows.length === 0 ? (
          <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', color: INK }}>
            No press releases were published on {currentDate ? fmtLongDate(currentDate) : 'this day'}.
          </p>
        ) : (
          <>
            {gov.length > 0 && (
              <>
                <h2 style={SOURCE_HEADER}>UK Government departments · {gov.length}</h2>
                <ReleaseList items={gov} fallbackOrg="UK Government" />
              </>
            )}
            {com.length > 0 && (
              <>
                <h2 style={{ ...SOURCE_HEADER, marginTop: '40px' }}>House of Commons committee reports · {com.length}</h2>
                <ReleaseList items={com} fallbackOrg="House of Commons" />
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink
        fallbackHref="/transparency"
        label="← Back"
        className="no-hover-scale"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '-6%',
          marginBottom: '12px',
          color: INK,
          textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />

      <header style={{ marginBottom: '28px' }}>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '15px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 500,
            marginBottom: '12px',
            color: ACCENT,
          }}
        >
          Dataset
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
          }}
        >
          Press Releases
        </h1>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '15px',
            lineHeight: 1.75,
            color: INK,
            maxWidth: '720px',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>{govTotal.toLocaleString()}</span>
          {' '}UK Government department press releases spanning the full archive from 2007 to today, plus House of Commons select committee reports, updated daily. Browse a day at a time, or search across every release.
        </p>
      </header>

      {/* Search box — GET form, crawlable, no client JS. Switches to search mode. */}
      <form method="GET" action="/transparency/press-releases" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px', maxWidth: '640px' }}>
        <input
          type="text"
          name="q"
          defaultValue={rawQ}
          placeholder="Search press releases by title, summary or department…"
          aria-label="Search press releases"
          style={{ ...inputStyle, flex: '1 1 240px' }}
        />
        <button type="submit" style={btnStyle}>Search</button>
      </form>

      {content}

      <style>{`
        .press-card { transition: opacity 140ms ease; }
        .press-card:hover { opacity: 0.7; }
      `}</style>
      <LastUpdated sourceKey="press_releases" />
    </OpenGovShell>
  );
}
