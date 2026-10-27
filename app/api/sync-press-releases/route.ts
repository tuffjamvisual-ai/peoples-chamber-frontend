import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { refreshStore } from '@/lib/refresh-stores';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 27 Oct 2026 (job 79): it was killed at 60 s once (25 Oct) and has run to 41 s; its requests had no timeout. Now
// (lib/sync-budget.ts) every request has one cut to the time left, no release starts after 70 per cent of
// maxDuration, the run ends by 80 per cent, and a 429 from GOV.UK stops it cleanly. Releases not reached are picked
// up next run, which reads the newest 20 again (rewriting a release already saved changes nothing). A release whose
// body could not be fetched no longer has its stored body overwritten with nothing.
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
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
    const results = data.results || [];

    let upserted = 0;
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
      try {
        const bodyRes = await politeFetch(`https://www.gov.uk/api/content${item.link}`, {
          headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
        }, { budget });
        if (bodyRes.ok) {
          const bodyData = (await bodyRes.json()) as { details?: { body?: string } };
          body = bodyData.details?.body || null;
          if (body) bodiesFetched++;
        }
      } catch (e) {
        // Out of time or asked to stop: this release is left for the next run.
        if (isPoliteStop(e)) { stoppedBy = (e as Error).message; notReached = results.length - i; break; }
        // Otherwise swallowed: the sync should not fail on a single body fetch.
      }

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
      if (!error) upserted++;
      else { writeErrors++; lastWriteError = error.message; }
    }
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
      partial: stoppedBy !== null,
      stopped_by: stoppedBy,
      not_reached: notReached,
      write_errors: writeErrors,
      fetched: results.length,
      upserted,
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
