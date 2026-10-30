import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { revalidatePath, revalidateTag, noteChanged } from '@/lib/refresh-count';
import { PRESS_RELEASES_LATEST_TAG } from '@/lib/press-releases-latest';
import { newsPath } from '@/lib/news-path';
import { createClient } from '@supabase/supabase-js';
import { refreshStore } from '@/lib/refresh-stores';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';
import { ItemFailures, FLAG_AFTER_RUNS } from '@/lib/sync-item-failures';

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
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
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
    const res = await politeFetch(
      'https://www.gov.uk/api/search.json?count=20&order=-public_timestamp&filter_content_store_document_type=press_release',
      { headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } },
      { budget },
    );
    if (!res.ok) return NextResponse.json({ error: `gov.uk ${res.status}` }, { status: 502 });

    const data = (await res.json()) as { results?: GovukSearchResult[] };
    const failing = await ItemFailures.load(supabase, '/api/sync-press-releases');
    const linkOf = (r: GovukSearchResult) => `https://www.gov.uk${r.link}`;
    // Flagged releases go after the others.
    const results = [...(data.results || []).filter((r) => !failing.isFlagged(linkOf(r))), ...(data.results || []).filter((r) => failing.isFlagged(linkOf(r)))];
    let flaggedFail = 0;

    let upserted = 0;
    let pagesRefreshed = 0;
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
          if (p) { revalidatePath(p); pagesRefreshed++; }
        }
      } else { writeErrors++; lastWriteError = error.message; }
    }
    // New releases: the 'press-releases-latest' read (front page and department pages) and the front page itself.
    // Changes that refresh pages: new releases (the latest lists) and changed ones (their own pages).
    noteChanged(added + pagesRefreshed);
    let latestRefreshed = false;
    if (added > 0) { revalidateTag(PRESS_RELEASES_LATEST_TAG, 'max'); revalidatePath('/'); latestRefreshed = true; }
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
      upserted,
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
