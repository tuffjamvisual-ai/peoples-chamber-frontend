import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type GovukSearchResult = {
  title: string;
  description?: string;
  organisations?: Array<{ title: string }>;
  public_timestamp?: string;
  link: string;
};

async function GET_impl(req: Request) {
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
    const res = await fetch(
      'https://www.gov.uk/api/search.json?count=20&order=-public_timestamp&filter_content_store_document_type=press_release',
      { headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } },
    );
    if (!res.ok) return NextResponse.json({ error: `gov.uk ${res.status}` }, { status: 502 });

    const data = (await res.json()) as { results?: GovukSearchResult[] };
    const results = data.results || [];

    let upserted = 0;
    let bodiesFetched = 0;
    for (const item of results) {
      const govUrl = `https://www.gov.uk${item.link}`;

      // Inline body fetch so /news/[slug] no longer has to call gov.uk at
      // render time. ~30KB per release, 100 rows max retained, so the table
      // tops out around 3MB — fine. Failure is non-fatal; the page falls
      // through to a friendly "summary above" message rather than erroring.
      // Added 2026-06-04 to close the last render-time gov.uk fetch.
      let body: string | null = null;
      try {
        const bodyRes = await fetch(`https://www.gov.uk/api/content${item.link}`, {
          headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
        });
        if (bodyRes.ok) {
          const bodyData = (await bodyRes.json()) as { details?: { body?: string } };
          body = bodyData.details?.body || null;
          if (body) bodiesFetched++;
        }
      } catch {
        // Swallow — sync should not fail on a single body fetch.
      }

      const record = {
        title: item.title,
        description: item.description || null,
        organisation: item.organisations?.[0]?.title || 'GOV.UK',
        published_at: item.public_timestamp || null,
        gov_url: govUrl,
        body,
        body_fetched_at: body ? new Date().toISOString() : null,
        fetched_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('press_releases')
        .upsert(record, { onConflict: 'gov_url' });
      if (!error) upserted++;
    }

    // Retention: KEEP EVERYTHING. On 2026-07-11 the full GOV.UK press-release
    // archive was backfilled (metadata only, ~45,600 rows back to 2007), so we
    // no longer trim by age — the daily sync just adds the newest releases on
    // top. (Bodies for old rows are fetched on demand by /news/[slug].) If the
    // table ever needs bounding, reintroduce a date-based delete here, but note
    // it must not delete the intended archive. parliament.uk committee-report
    // rows are still retained separately by sync-commons-press-releases.
    const trimmed = 0;

    return NextResponse.json({
      ok: true,
      fetched: results.length,
      upserted,
      bodiesFetched,
      trimmed,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-press-releases', GET_impl);
