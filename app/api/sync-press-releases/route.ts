import { NextResponse } from 'next/server';
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

export async function GET(req: Request) {
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
    for (const item of results) {
      const record = {
        title: item.title,
        description: item.description || null,
        organisation: item.organisations?.[0]?.title || 'GOV.UK',
        published_at: item.public_timestamp || null,
        gov_url: `https://www.gov.uk${item.link}`,
        fetched_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('press_releases')
        .upsert(record, { onConflict: 'gov_url' });
      if (!error) upserted++;
    }

    // Keep only the last 100 by published_at (oldest first → trim).
    const { data: old } = await supabase
      .from('press_releases')
      .select('id')
      .order('published_at', { ascending: true });
    let trimmed = 0;
    if (old && old.length > 100) {
      const toDelete = old.slice(0, old.length - 100).map((r: { id: number }) => r.id);
      const { error } = await supabase.from('press_releases').delete().in('id', toDelete);
      if (!error) trimmed = toDelete.length;
    }

    return NextResponse.json({
      ok: true,
      fetched: results.length,
      upserted,
      trimmed,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
