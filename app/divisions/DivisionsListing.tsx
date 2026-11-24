import { ARCHIVE_NOTE } from '@/lib/historic-archive';
import { SubFold } from '../components/PhoneFolds';
import { notFound } from 'next/navigation';
import LastUpdated from '../components/LastUpdated';
import PageSources from '../components/PageSources';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import Unavailable from '@/app/components/Unavailable';
import { divisionYears } from '@/lib/division-links';
import { handled } from '@/lib/settle';
import DivisionYearLinks from './DivisionYearLinks';
import DivisionMonthLinks from './DivisionMonthLinks';
import { ShowAll } from '../components/NoJsPager';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';
const PER_PAGE = 50;

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
}

// "3 November" for a day's own "Show N more divisions on 3 November" (Cowork 13 Nov 2026, ENTRY 9).
const dayMonth = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });


// One page of the divisions list (F04 batch 2, T2's f04-32-routes.md 3): /divisions is page 1 and /divisions/page/<n> the rest,
// each static and rebuilt only when commons_divisions_fts's tag is refreshed. The page number comes from the path.
export default async function DivisionsListing({ pageNum }: { pageNum: number }) {
  const from = (pageNum - 1) * PER_PAGE;

  // Started before the page's own read and awaited after it, so handled at once (lib/settle.ts): a failed read still
  // throws where it is awaited, but can no longer end the whole server process while the page read is running.
  const yearsP = handled(divisionYears());
  const { data, count } = await cachedQuery(['q:app/divisions/page.tsx:bd6bc8a52e', JSON.stringify([from, PER_PAGE])], tableTags('commons_divisions_fts'), () => supabase
    .from('commons_divisions_fts')
    .select('division_date_only, division_number, division_title', { count: 'exact' })
    .order('division_date_only', { ascending: false })
    .order('division_number', { ascending: false })
    .range(from, from + PER_PAGE - 1));

  const rows = data || [];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (pageNum > totalPages) notFound();

  // Group the page by sitting date.
  const byDate: { date: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const last = byDate[byDate.length - 1];
    if (last && last.date === r.division_date_only) last.items.push(r);
    else byDate.push({ date: r.division_date_only as string, items: [r] });
  }

  const href = (p: number) => (p <= 1 ? '/divisions' : `/divisions/page/${p}`);

  return (
    <OpenGovShell>
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
          Every recorded vote in the House of Commons since March 2016, newest first. Open any division to see how every MP voted. Votes from October 2004 to March 2016 are on the year pages.
        </p>
      </header>

      {/* T1-MOB batch 2 (Cowork 13 Nov 2026): on phones the year links fold; from 768px as before. */}
      <SubFold label="Browse by year">
      <DivisionYearLinks years={await yearsP} />
      {/* T1-A3 (3) (owner approved): the archive's own note under the year links, and the count says what it covers (the
          divisions listed here, March 2016 on; the year pages before that are the Hansard archive). */}
      <p style={{ fontSize: '15px', lineHeight: 1.6, maxWidth: '720px', color: INK, margin: '0 0 14px' }}>{ARCHIVE_NOTE}</p>
      </SubFold>

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '18px' }}>
        {total.toLocaleString()} divisions since March 2016{totalPages > 1 ? ` · page ${pageNum} of ${totalPages}` : ''}
      </p>

      {rows.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>No divisions found.</p>}

      {/* Phones (step 5, 10 Nov 2026; the page was 6,668px): the 3 most recent sitting days, then "Show all <N>". */}
      <ShowAll id="div-days" count={byDate.length} rows="> section" first={3} noun={{ one: 'sitting day', many: 'sitting days' }}>
      <div>
      {byDate.map((group) => (
        <section key={group.date} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '8px' }}>
            {fmtDate(group.date)}
          </h2>
          {/* T1-MOB batch 2 (Cowork 13 Nov 2026): on phones and tablets each day shows its first 3 divisions, then "Show N
              more" (3 Nov 2026 alone had more than 10); from 1,024px as before. */}
          <ShowAll id={`div-${group.date}`} count={group.items.length} rows="> a" first={3} noun={{ one: `division on ${dayMonth(group.date)}`, many: `divisions on ${dayMonth(group.date)}` }}>
          <div>
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
          </div>
          </ShowAll>
        </section>
      ))}
      </div>
      </ShowAll>

      {totalPages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '32px', fontFamily: MONO, fontSize: '15px' }}>
          {pageNum > 1 ? (
            <Link href={href(pageNum - 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>← Previous</Link>
          ) : (
            <Unavailable note="no earlier page" style={{ padding: '8px 14px', border: `1px dashed ${HAIRLINE}` }}>← Previous</Unavailable>
          )}
          <span style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, background: 'rgba(122,22,18,0.06)' }}>{pageNum} / {totalPages}</span>
          {pageNum < totalPages ? (
            <Link href={href(pageNum + 1)} style={{ padding: '8px 14px', border: `1px solid ${HAIRLINE}`, color: INK, textDecoration: 'none' }}>Next →</Link>
          ) : (
            <Unavailable note="no later page" style={{ padding: '8px 14px', border: `1px dashed ${HAIRLINE}` }}>Next →</Unavailable>
          )}
        </nav>
      )}

      {/* Every month page, linked straight from here (Cowork ENTRY 536 item 4), after the list; folded on phones like the
          year links, so the phone page keeps its length. */}
      <SubFold label="Browse by month">
      <DivisionMonthLinks years={await yearsP} />
      </SubFold>

      {/* Cowork ENTRY 410 (owner, 20 Nov 2026): the source the date line named, in a Sources fold. */}
      <PageSources sources={[{ label: 'UK Parliament, Commons Votes', href: 'https://votes.parliament.uk/' }]} />
      <LastUpdated sourceKey="division_votes" />
    </OpenGovShell>
  );
}
