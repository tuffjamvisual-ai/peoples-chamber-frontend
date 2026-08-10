import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAndParseWikipedia, fetchAndParseBritPolls, mergeAndDedup, type VIPoll } from '@/lib/votingIntention';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Sync Westminster voting-intention polls into vi_polls.
// Primary: Wikipedia (authoritative, complete incl. Survation, CC BY-SA).
// Secondary: BritPolls JSON (CC BY 4.0) — corroborates / same-day-fresh only.
// Fallback guard: if the Wikipedia parse returns too few rows (format change or
// vandalism), do NOT overwrite the good data — keep existing rows and still take
// BritPolls' fresh polls. Added 2026-07-11.

const WIKI_MIN_ROWS = 30;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  let wiki: VIPoll[] = [];
  let wikiError: string | null = null;
  try {
    wiki = await fetchAndParseWikipedia();
  } catch (e) {
    wikiError = (e as Error).message;
  }

  let brit: VIPoll[] = [];
  try {
    brit = await fetchAndParseBritPolls();
  } catch {
    /* BritPolls is optional; ignore failure */
  }

  const wikiHealthy = wiki.length >= WIKI_MIN_ROWS;
  // If Wikipedia is unhealthy, don't let it overwrite good rows — only take fresh
  // BritPolls polls not already stored.
  let toUpsert: VIPoll[];
  if (wikiHealthy) {
    toUpsert = mergeAndDedup(wiki, brit);
  } else {
    toUpsert = brit; // freshness only; existing Wikipedia rows are left untouched
  }

  const now = new Date().toISOString();
  const records = toUpsert.map((p) => ({ ...p, fetched_at: now }));

  let upserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < records.length; i += CHUNK) {
    const { error, count } = await supabase
      .from('vi_polls')
      .upsert(records.slice(i, i + CHUNK), { onConflict: 'pollster,fieldwork_end,area,poll_type', count: 'exact' });
    if (error) return NextResponse.json({ ok: false, error: error.message, wikiError }, { status: 502 });
    upserted += count ?? 0;
  }

  return NextResponse.json({
    ok: true,
    wikiRows: wiki.length,
    britRows: brit.length,
    wikiHealthy,
    wikiError,
    merged: toUpsert.length,
    upserted,
    syncedAt: now,
  });
}
