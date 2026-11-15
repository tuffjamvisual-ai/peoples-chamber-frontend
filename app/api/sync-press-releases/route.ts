import { bearerMatches } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { freshnessChanged } from '@/lib/data-freshness';
import { indexNowAfter } from '@/lib/indexnow';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { revalidatePath, revalidateTag, noteChanged } from '@/lib/refresh-count';
import { PRESS_RELEASES_LATEST_TAG } from '@/lib/press-releases-latest';
import { PRESS_SYNC_CHECKED_TAG, CHECKED_ROUTE } from '@/lib/press-sync-checked';
import { newsPath } from '@/lib/news-path';
import { createClient } from '@supabase/supabase-js';
import { refreshStore } from '@/lib/refresh-stores';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';
import { ItemFailures, FLAG_AFTER_RUNS } from '@/lib/sync-item-failures';
import { refreshTables, DIVISION_TABLES, SI_TABLES } from '@/lib/source-tags';
import { newsTagForPath } from '@/lib/news-tag';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 27 Oct 2026 (job 79): it was killed at 60 s once (25 Oct) and has run to 41 s; its requests had no timeout. Now
// (lib/sync-budget.ts) every request has one cut to the time left, no release starts after 70 per cent of
// maxDuration, the run ends by 80 per cent, and a 429 from GOV.UK stops it cleanly. Releases not reached are picked
// up next run, which reads the newest 20 again (rewriting a release already saved changes nothing). A release whose
// body could not be fetched no longer has its stored body overwritten with nothing.
// 28 Oct 2026 (owner): a release whose body fails FLAG_AFTER_RUNS runs in a row (lib/sync-item-failures.ts) goes to the
// back of the run's list; the run returns 200 with partial: true, and the freshness email names the release and error.
const STORES_RESERVE_MS = 8_000; // kept for the stats refresh at the end

type GovukSearchResult = {
  title: string;
  description?: string;
  organisations?: Array<{ title: string }>;
  public_timestamp?: string;
  link: string;
};

async function GET_impl(req: Request) {
  const budget = new SyncBudget(maxDuration);
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  try {
    const SEARCH = 'https://www.gov.uk/api/search.json?order=-public_timestamp&filter_content_store_document_type=press_release';
    const res = await politeFetch(`${SEARCH}&count=20`,
      { headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } },
      { budget },
    );
    if (!res.ok) return NextResponse.json({ error: `gov.uk ${res.status}` }, { status: 502 });
    const checkedAt = new Date().toISOString(); // GOV.UK answered: the 'Checked GOV.UK at' time (T1-PR)

    const data = (await res.json()) as { results?: GovukSearchResult[] };
    // T1-PRESSWEEKDAY (owner approved 15 Nov 2026, COWORK-TO-T1 ENTRY 128): the press jobs run Monday to Friday only, so
    // on Mondays (UTC) the look-back goes at least 3 days: further pages of 100, newest first, until a release older than
    // 3 days is reached (at most 300), and any of those not already stored are added after the usual newest 20, which are
    // handled as on every run. GOV.UK published 2 to 20 releases a day in the two weeks to 14 Nov (fewer at weekends).
    let weekendExtra = 0;
    if (new Date().getUTCDay() === 1) {
      const since = Date.now() - 3 * 86_400_000;
      const extra: GovukSearchResult[] = [];
      for (let start = 0; start < 300; start += 100) {
        const r = await politeFetch(`${SEARCH}&count=100&start=${start}`,
          { headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } }, { budget });
        if (!r.ok) break;
        const page = ((await r.json()) as { results?: GovukSearchResult[] }).results || [];
        extra.push(...page);
        const oldest = page.at(-1)?.public_timestamp;
        if (page.length < 100 || (oldest && Date.parse(oldest) < since)) break;
      }
      const seen = new Set((data.results || []).map((x) => x.link));
      const links = extra.filter((x) => x.link && !seen.has(x.link)).map((x) => `https://www.gov.uk${x.link}`);
      const { data: have } = links.length ? await supabase.from('press_releases').select('gov_url').in('gov_url', links) : { data: [] };
      const stored = new Set(((have ?? []) as { gov_url: string }[]).map((h) => h.gov_url));
      const missing = extra.filter((x) => x.link && !seen.has(x.link) && !stored.has(`https://www.gov.uk${x.link}`));
      weekendExtra = missing.length;
      data.results = [...(data.results || []), ...missing];
    }
    const failing = await ItemFailures.load(supabase, '/api/sync-press-releases');
    const linkOf = (r: GovukSearchResult) => `https://www.gov.uk${r.link}`;
    // Flagged releases go after the others.
    const results = [...(data.results || []).filter((r) => !failing.isFlagged(linkOf(r))), ...(data.results || []).filter((r) => failing.isFlagged(linkOf(r)))];
    let flaggedFail = 0;

    let upserted = 0;
    let pagesRefreshed = 0;
    const changedNews: string[] = [];
    let added = 0;
    // Releases already stored, so a changed one can have its page refreshed (owner's approval, 29 Oct 2026, cache
    // Stage 1). A new release's own page renders on its first visit, but the lists of the latest releases (the front
    // page and the department pages) are refreshed after the loop (owner, 30 Oct 2026).
    const urls = results.map((item) => `https://www.gov.uk${item.link}`);
    const { data: storedRows } = urls.length
      ? await supabase.from('press_releases').select('gov_url, title, description, body').in('gov_url', urls)
      : { data: [] };
    const stored = new Map(((storedRows ?? []) as { gov_url: string; title: string | null; description: string | null; body: string | null }[]).map((r) => [r.gov_url, r]));
    let bodiesFetched = 0;
    let writeErrors = 0;
    let lastWriteError: string | null = null;
    let stoppedBy: string | null = null;
    let notReached = 0;
    for (const [i, item] of results.entries()) {
      if (budget.stopStarting(STORES_RESERVE_MS)) { stoppedBy = 'time budget'; notReached = results.length - i; break; }
      const govUrl = `https://www.gov.uk${item.link}`;

      // Inline body fetch so /news/[slug] no longer has to call gov.uk at
      // render time. ~30KB per release, 100 rows max retained, so the table
      // tops out around 3MB — fine. Failure is non-fatal; the page falls
      // through to a friendly "summary above" message rather than erroring.
      // Added 2026-06-04 to close the last render-time gov.uk fetch.
      let body: string | null = null;
      let bodyError: string | null = null;
      try {
        const bodyRes = await politeFetch(`https://www.gov.uk/api/content${item.link}`, {
          headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
        }, { budget });
        if (bodyRes.ok) {
          const bodyData = (await bodyRes.json()) as { details?: { body?: string } };
          body = bodyData.details?.body || null;
          if (body) bodiesFetched++;
        } else bodyError = `content API ${bodyRes.status}`;
      } catch (e) {
        // Out of time or asked to stop: this release is left for the next run.
        if (isPoliteStop(e)) { stoppedBy = (e as Error).message; notReached = results.length - i; break; }
        // Otherwise the sync does not fail on a single body fetch; the release is counted towards being flagged.
        bodyError = (e as Error).message || 'no answer';
      }
      if (bodyError) { if (failing.failed(govUrl, item.title, `body: ${bodyError}`)) flaggedFail++; }
      else failing.succeeded(govUrl);

      const record = {
        title: item.title,
        description: item.description || null,
        organisation: item.organisations?.[0]?.title || 'GOV.UK',
        published_at: item.public_timestamp || null,
        gov_url: govUrl,
        ...(body ? { body, body_fetched_at: new Date().toISOString() } : {}),
        fetched_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('press_releases')
        .upsert(record, { onConflict: 'gov_url' });
      if (!error) {
        upserted++;
        const old = stored.get(govUrl);
        if (!old) added++;
        if (old && (old.title !== record.title || old.description !== record.description || (body && old.body !== body))) {
          const p = newsPath(govUrl);
          if (p) { revalidatePath(p); revalidateTag(newsTagForPath(p), 'max'); pagesRefreshed++; changedNews.push(p); }
        }
      } else { writeErrors++; lastWriteError = error.message; }
    }
    // New releases: the 'press-releases-latest' read (front page and department pages) and the front page itself.
    // Changes that refresh pages: new releases (the latest lists) and changed ones (their own pages).
    noteChanged(added + pagesRefreshed);
    let latestRefreshed = false;
    // T1-PR (12 Nov 2026): { expire: 0 }, not 'max'. With 'max' the first request after the refresh was served the old
    // list while the new one loaded, so the front page rebuilt by revalidatePath('/') could show the rows from before.
    // Every run that reached GOV.UK also stores its time for the 'Checked GOV.UK at' line and refreshes the two pages
    // that show it, whether or not anything was added.
    if (added > 0) { revalidateTag(PRESS_RELEASES_LATEST_TAG, { expire: 0 }); latestRefreshed = true; }
    const { error: checkedErr } = await supabase.from('sync_cursor').upsert({ route: CHECKED_ROUTE, cursor: { at: checkedAt }, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    if (checkedErr) console.error(`[press] could not store the checked time: ${checkedErr.message}`);
    else revalidateTag(PRESS_SYNC_CHECKED_TAG, { expire: 0 });
    // T1-HOMESPEED (owner approved 15 Nov 2026, COWORK-TO-T1 ENTRY 126): no revalidatePath('/') here any more. The front
    // page reads the latest releases and the checked time through the two tags refreshed above, which already rebuild it.
    // A path refresh also expired every other cached read on the page (Next checks a page's own path tag on each cached
    // read), so every hourly run made the next visitor wait while the State of the nation figures were read again from
    // the ONS, one request a second: 13 to 15 s rebuilds, every hour from 02:00 on 15 Nov.
    if (added > 0 || !checkedErr) revalidatePath('/transparency/press-releases');
    if (added > 0 || changedNews.length) { freshnessChanged(); refreshTables('press_releases'); } // A16: table tag after a real change
    indexNowAfter([...changedNews, ...(added > 0 ? ['/'] : [])], 'sync-press-releases');
    const failuresSaved = await failing.save();
    if (writeErrors > 0 && upserted === 0) {
      return NextResponse.json({ ok: false, error: `press_releases upsert failed: ${lastWriteError}`, upserted }, { status: 500 });
    }

    // Retention: KEEP EVERYTHING. On 2026-07-11 the full GOV.UK press-release
    // archive was backfilled (metadata only, ~45,600 rows back to 2007), so we
    // no longer trim by age — the daily sync just adds the newest releases on
    // top. (Bodies for old rows are fetched on demand by /news/[slug].) If the
    // table ever needs bounding, reintroduce a date-based delete here, but note
    // it must not delete the intended archive. parliament.uk committee-report
    // rows are still retained separately by sync-commons-press-releases.
    const trimmed = 0;

    // /transparency/press-releases reads stored totals (lib/refresh-stores.ts); a failed refresh does not fail the sync.
    const statsRefresh = upserted > 0 ? await refreshStore(supabase, 'refresh_press_release_stats') : null;

    return NextResponse.json({
      ok: writeErrors === 0,
      partial: stoppedBy !== null || flaggedFail > 0,
      flagged_failed: flaggedFail,
      flagged_after_runs: FLAG_AFTER_RUNS,
      failing_items: failing.summary(),
      failures_saved: failuresSaved,
      stopped_by: stoppedBy,
      not_reached: notReached,
      write_errors: writeErrors,
      fetched: results.length,
      upserted, weekend_extra: weekendExtra,
      pages_refreshed: pagesRefreshed,
      added,
      latest_refreshed: latestRefreshed,
      bodiesFetched,
      trimmed,
      stats_refresh: statsRefresh,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (isPoliteStop(err)) throw err; // recorded as a clean partial run by withHeartbeat
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-press-releases', GET_impl);
