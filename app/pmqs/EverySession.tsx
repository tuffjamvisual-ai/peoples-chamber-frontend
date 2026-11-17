import Link from 'next/link';
import NoJsPager, { NoJsFold } from '../components/NoJsPager';
import Pagination from '../components/Pagination';
import { SubFold } from '../components/PhoneFolds';
import { phoneUpTo } from '@/lib/breakpoints';
import PreFixedQuestions, { PREFIXED_PER_PAGE } from './PreFixedQuestions';
import { preFixedSummary } from '@/lib/pm-questions-1945-1961';
import { answeredBy, archiveSessions, groupByPrimeMinister, libraryTotals, longDateArchive, primeMinisterLabel, type ListedSession } from '@/lib/pmqs-archive';
import { cleanWords, datePrefix, pmSlug, preFixedMatching, sessionsMatching, ROW_CAP } from '@/lib/pmqs-search';
import type { PmqsSet } from '@/lib/pmqs';
import { listPath } from '@/lib/list-path';

const INK = '#14100d';
const ACCENT = '#7a1612';
const PER_PAGE = 20;   // sessions on a page; on phones and tablets the newest 3, then "Show 17 more sessions"

export type PmqsFilters = { q?: string; pm?: string; year?: string; page?: string; dpage?: string };

// The Prime Ministers of the 1945 to 1961 questions (lib/pm-questions-1945-1961.ts keys), by name, for the one filter.
const PREFIXED_PM: Record<string, string> = { Macmillan: 'Harold Macmillan', Eden: 'Anthony Eden', Churchill: 'Winston Churchill', Attlee: 'Clement Attlee' };

// Every session, 1961 to now (owner, 5 Nov 2026), found with a search box and Prime Minister and year filters (T2 ENTRY 1,
// Cowork 14 Nov 2026, from T1-AUDIT2): the page carried all 3,000 and more sessions in folds by Prime Minister and year; it
// now carries one page of 20, newest first, and the address holds the choice (?q=, ?pm=, ?year=, ?page=), so a search can
// be shared and Back returns to it. Every session keeps its own address, /pmqs/<date>. A plain form: no JavaScript needed.
// Below it, our count against the Commons Library's.
// Everything the session list shows, from the address's choices (moved out of EverySession for F04 batch 3, unchanged).
export async function pmqsModel(set: PmqsSet, filters: PmqsFilters) {
  const [archive, totals, preFixed] = await Promise.all([archiveSessions(), libraryTotals(), preFixedSummary()]);
  const sessions: ListedSession[] = [
    ...set.sessions.map((s) => ({ date: s.date, answeredBy: s.answeredBy.name })),
    ...archive.map((s) => ({ date: s.date, answeredBy: answeredBy(s.date) })),
  ].sort((x, y) => y.date.localeCompare(x.date));
  const groups = groupByPrimeMinister(sessions);
  const counted = new Map(groups.map((g) => [g.pm, g.count]));
  // The stored note for the two Prime Ministers after the archive's cut off says they are not comparable; their count now
  // comes from the Hansard tables, so the note says what the Library lists, as for the others, where it differs.
  const noteFor = (pm: string, stored: string | null, library: number | null) =>
    stored?.includes('cut-off') ? (library !== null && counted.get(pm) !== library ? `Commons Library lists ${library}` : null) : stored;

  // The choice in the address. An unknown Prime Minister or year is ignored, as if not chosen.
  const words = cleanWords(filters.q ?? '');
  const pmGroup = groups.find((g) => pmSlug(g.pm) === filters.pm) ?? null;
  // The 1945 to 1961 days (T2 ENTRY 3), with the Prime Minister each belongs to; the same filters cover them.
  const preDays = preFixed.groups.flatMap((g) => g.years.flatMap((y) => y.days.map((d) => ({ ...d, pm: PREFIXED_PM[g.key] ?? g.key }))))
    .sort((a, b) => b.date.localeCompare(a.date));
  const prePms = preFixed.groups.map((g) => ({ name: PREFIXED_PM[g.key] ?? g.key, days: g.days }));
  const prePm = prePms.find((p) => pmSlug(p.name) === filters.pm) ?? null;
  const pmKey = pmGroup ? pmSlug(pmGroup.pm) : prePm ? pmSlug(prePm.name) : null;
  // Only before 1961: in the list, but with no sessions.
  const onlyPre = prePms.filter((p) => !groups.some((g) => pmSlug(g.pm) === pmSlug(p.name)));
  const years = [...new Set([...sessions.map((s) => s.date.slice(0, 4)), ...preDays.map((d) => d.date.slice(0, 4))])].sort((a, b) => b.localeCompare(a));
  const year = years.includes(filters.year ?? '') ? filters.year! : null;
  const onDate = words ? datePrefix(words) : null;
  // Who answered and who led for the Opposition are in the list itself; other names and the questions are read.
  const byName = new Set<string>();
  if (words && !onDate) {
    const w = words.toLowerCase();
    for (const s of set.sessions) if (s.answeredBy.name.toLowerCase().includes(w) || s.opposition?.name.toLowerCase().includes(w)) byName.add(s.date);
    for (const s of sessions) if (s.answeredBy?.toLowerCase().includes(w)) byName.add(s.date);
  }
  const [text, preText] = words && !onDate ? await Promise.all([sessionsMatching(words, set), preFixedMatching(words)]) : [null, null];
  const hit = new Set([...byName, ...(text?.dates ?? [])]);
  const pmDates = pmGroup ? new Set(pmGroup.years.flatMap((y) => y.sessions.map((s) => s.date))) : null;
  const found = sessions.filter((s) =>
    (!pmKey || (pmDates?.has(s.date) ?? false)) && (!year || s.date.startsWith(year)) &&
    (!words || (onDate ? s.date.startsWith(onDate) : hit.has(s.date))));
  const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt(filters.page ?? '1', 10) || 1));
  const shown = found.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const chosen = !!(words || pmKey || year);
  const qs = [words && `q=${encodeURIComponent(words)}`, pmKey && `pm=${pmKey}`, year && `year=${year}`].filter(Boolean).join('&');
  const preHit = new Set(preText?.dates ?? []);
  const preFound = preDays.filter((d) =>
    (!pmKey || pmSlug(d.pm) === pmKey) && (!year || d.date.startsWith(year)) &&
    (!words || (onDate ? d.date.startsWith(onDate) : preHit.has(d.date))));
  const prePages = Math.max(1, Math.ceil(preFound.length / PREFIXED_PER_PAGE));
  const dpage = Math.min(prePages, Math.max(1, parseInt(filters.dpage ?? '1', 10) || 1));
  // Each list pages on its own: the other's page stays in its links.
  const sessionQs = [qs, dpage > 1 && `dpage=${dpage}`].filter(Boolean).join('&');
  const preQs = [qs, page > 1 && `page=${page}`].filter(Boolean).join('&');
  // Whether each choice in the address is one this list knows (F04 batch 3: the /pmqs/filter route 404s otherwise, so the
  // cache holds a bounded set of pages; the page itself ignores an unknown one, as before).
  const requested = (v: string | undefined) => (v ? parseInt(v, 10) || 0 : 1);
  const valid = (!filters.pm || pmKey !== null) && (!filters.year || year !== null)
    && requested(filters.page) >= 1 && requested(filters.page) <= pages && requested(filters.dpage) >= 1 && requested(filters.dpage) <= prePages;
  return { archive, totals, preFixed, sessions, groups, counted, noteFor, words, pmGroup, preDays, prePms, prePm, pmKey, onlyPre, years, year, onDate, byName, text, preText, hit, pmDates, found, pages, page, shown, chosen, qs, preHit, preFound, prePages, dpage, sessionQs, preQs, valid };
}

export default async function EverySession({ set, filters }: { set: PmqsSet; filters: PmqsFilters }) {
  const { totals, sessions, groups, counted, noteFor, words, pmGroup, preDays, prePm, pmKey, onlyPre, years, year, text, preText, found, pages, page, shown, chosen, preFound, dpage, sessionQs, preQs } = await pmqsModel(set, filters);
  const label = { display: 'block', fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' } as const;
  const field = { width: '100%', minHeight: '48px', padding: '10px 12px', fontSize: '16px', fontFamily: 'inherit', color: INK, background: 'rgba(20,16,13,0.05)', border: '1px solid rgba(20,16,13,0.3)', borderRadius: '2px' } as const;

  return (
    <section data-main-action aria-labelledby="pmqs-every-session" style={{ color: INK, marginBottom: '40px' }}>
      <h2 id="pmqs-every-session" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '0 0 8px' }}>Every session since 1961</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
        {sessions.length.toLocaleString('en-GB')} sessions from 24 October 1961 to {longDateArchive(sessions[0].date)}, newest first. A session on the day the office changed hands counts for the outgoing Prime Minister.
      </p>
      <style>{`.pmq-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0 0 16px; max-width: 640px; } .pmq-q { grid-column: 1 / -1; }
        .pmq-row { display: flex; gap: 8px; } .pmq-row input { flex: 1 1 auto; min-width: 0; }`}</style>
      <form method="GET" action="/pmqs" role="search" aria-label="Find a session" className="pmq-form">
        <div className="pmq-q">
          <label htmlFor="pmq-q" style={label}>Search the sessions</label>
          <div className="pmq-row">
            <input id="pmq-q" name="q" type="search" defaultValue={words} placeholder="Words, an MP or a date" style={field} />
            <button type="submit" style={{ flex: 'none', minHeight: '48px', padding: '0 16px', fontSize: '15px', fontFamily: 'inherit', fontWeight: 'bold', color: INK, background: 'transparent', border: `1px solid ${INK}`, cursor: 'pointer' }}>Find</button>
          </div>
        </div>
        <div>
          <label htmlFor="pmq-pm" style={label}>Prime Minister</label>
          <select id="pmq-pm" name="pm" defaultValue={pmKey ?? ''} style={field}>
            <option value="">All</option>
            {groups.map((g) => <option key={g.pm} value={pmSlug(g.pm)}>{primeMinisterLabel(g.pm)} ({g.count.toLocaleString('en-GB')})</option>)}
            {onlyPre.map((p) => <option key={p.name} value={pmSlug(p.name)}>{p.name} (before 1961: {p.days.toLocaleString('en-GB')} days of questions)</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pmq-year" style={label}>Year</label>
          <select id="pmq-year" name="year" defaultValue={year ?? ''} style={field}>
            <option value="">All</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </form>
      <p role="status" style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px' }}>
        {chosen
          ? <>{found.length.toLocaleString('en-GB')} {found.length === 1 ? 'session' : 'sessions'}{words ? <> matching &ldquo;{words}&rdquo;</> : null}{pmGroup ? <>, {primeMinisterLabel(pmGroup.pm)}</> : prePm ? <>, {prePm.name}</> : null}{year ? <>, {year}</> : null}</>
          : <>The newest sessions</>}
        {pages > 1 ? <> (page {page} of {pages})</> : null}.
        {chosen && <>{' '}<Link href="/pmqs" className="og-tap" style={{ minWidth: '44px', color: ACCENT, textDecoration: 'underline' }}>Clear</Link></>}
        {text?.capped && <> This search matched more than {ROW_CAP.toLocaleString('en-GB')} contributions, so some older sessions may be missing: add a word, a Prime Minister or a year to narrow it.</>}
      </p>
      {shown.length > 0 ? (
        <NoJsPager id="pmqs-found" count={shown.length} rows="> li" size={PER_PAGE} first={3} noun={{ one: 'session', many: 'sessions' }}>
          <ul className="pa-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {shown.map((s) => (
              <li key={s.date}>
                <a href={`/pmqs/${s.date}`}>{longDateArchive(s.date)}</a>
                {s.answeredBy && <div>Answered by {s.answeredBy}</div>}
              </li>
            ))}
          </ul>
        </NoJsPager>
      ) : (
        <p style={{ fontSize: '15px', lineHeight: 1.6 }}>No session matches. Try fewer words, another spelling, or all years.</p>
      )}
      {/* Without a search the pages are path addresses (F04 batch 3, static); a search keeps its ?q= address. */}
      <Pagination currentPage={page} totalPages={pages} baseUrl="/pmqs" qsExtra={sessionQs ? `&${sessionQs}` : ''}
        hrefFor={words ? undefined : (p) => listPath('/pmqs', { pm: pmKey, year, page: String(p), dpage: String(dpage) })} />
      <div className="pfq-wrap">
        {/* Phones and tablets (T1-GUARD, owner approved 13 Nov 2026): folded up to 1,023px. */}
        <style>{`@media ${phoneUpTo(1023.98)} { .pfq-wrap .pf-sb > #before-fixed-pmqs { display: none; } }`}</style>
        <SubFold label="Questions to the Prime Minister, 1945 to 1961" summary={chosen ? `${preFound.length.toLocaleString('en-GB')} ${preFound.length === 1 ? 'day' : 'days'}` : null} tablets>
          <PreFixedQuestions found={preFound} totalDays={preDays.length} page={dpage} chosen={chosen} capped={!!preText?.capped} qsExtra={preQs ? `&${preQs}` : ''}
            hrefFor={words ? undefined : (p) => listPath('/pmqs', { pm: pmKey, year, page: String(page), dpage: String(p) })} />
        </SubFold>
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '28px 0 10px' }}>Our count against the Commons Library</h3>
      {/* Folded on phones (step 5, 10 Nov 2026: the page was 5,098px). */}
      <NoJsFold id="pmqs-count-f" always tablets label={`The ${totals.length.toLocaleString('en-GB')} Prime Ministers`}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 6px', textAlign: 'left', borderBottom: `2px solid ${INK}` }}>Prime Minister</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: `2px solid ${INK}` }}>In the record</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: `2px solid ${INK}` }}>Commons Library</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', borderBottom: `2px solid ${INK}` }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.prime_minister} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
              <td style={{ padding: '6px', verticalAlign: 'top' }}>{t.prime_minister}</td>
              <td style={{ padding: '6px', verticalAlign: 'top', textAlign: 'right' }}>{(counted.get(t.prime_minister) ?? 0).toLocaleString('en-GB')}</td>
              <td style={{ padding: '6px', verticalAlign: 'top', textAlign: 'right' }}>{t.library_total?.toLocaleString('en-GB') ?? ''}</td>
              <td style={{ padding: '6px', verticalAlign: 'top' }}>{noteFor(t.prime_minister, t.note, t.library_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </NoJsFold>
    </section>
  );
}
