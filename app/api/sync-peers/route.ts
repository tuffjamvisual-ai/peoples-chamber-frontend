import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, isPoliteStop } from '@/lib/sync-budget';
import { noteChanged, revalidatePath } from '@/lib/refresh-count';
import { sameValue, isDryRun } from '@/lib/mp-refresh';
import { fetchPeerList, fetchPeer, fetchPosts, saveList, savePosts, peerHasPage, PAGES_FROM, type PeerRow } from '@/lib/peers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Members of the House of Lords (owner's yes, 3 Nov 2026), daily, through lib/peers.ts (the code the first load used):
//  1. Weekly, when the current list was last read over 6.5 days ago: every current peer from Members/Search (new
//     peers, party, status and thumbnail changes), and each peer stored as current who is no longer listed, read one
//     by one for their end date and reason.
//  2. Every run, with the time left: posts and committees (Biography) of peers with a page (current, or sat since 4
//     July 2024), the longest unchecked first, so every one is read within about a week.
// Only peers whose stored row changed have their /lords/[id] page refreshed, and /lords when the list changed.
// A 429 or the run's time budget stops it cleanly (lib/sync-budget.ts); the next run carries on. ?dry=1 (local tests
// only) reads and compares but writes and refreshes nothing; ?list=1 (local tests only) reads the list whatever its age.

const LIST_EVERY_MS = 6.5 * 24 * 60 * 60 * 1000;
const LIST_COLS = ['name_display', 'name_list_as', 'name_full_title', 'gender', 'party', 'party_id', 'party_colour', 'peerage_type', 'peerage_type_id', 'start_date', 'end_date', 'end_reason', 'status', 'is_current', 'thumbnail_url'] as const;
const POST_COLS = ['government_posts', 'opposition_posts', 'other_posts', 'committee_memberships'] as const;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const budget = new SyncBudget(maxDuration);
  const dry = isDryRun(req);
  const forceList = process.env.VERCEL_ENV !== 'production' && new URL(req.url).searchParams.get('list') === '1';
  const changedPages = new Set<number>();
  let listChanged = false;
  const out: Record<string, unknown> = { dry };

  try {
    // 1. The current list, weekly.
    const { data: newest, error: newestErr } = await db.from('peers').select('synced_at').eq('is_current', true).order('synced_at', { ascending: false }).limit(1);
    if (newestErr) throw new Error(`peers read: ${newestErr.message}`);
    const lastList = newest?.[0]?.synced_at ? new Date(newest[0].synced_at as string).getTime() : 0;
    if (forceList || Date.now() - lastList > LIST_EVERY_MS) {
      const current = await fetchPeerList(true, budget);
      const { data: stored, error } = await db.from('peers').select(['member_id', ...LIST_COLS].join(', ')).eq('is_current', true);
      if (error) throw new Error(`peers read: ${error.message}`);
      const before = new Map(((stored ?? []) as unknown as Array<Record<string, unknown>>).map((r) => [r.member_id as number, r]));
      const { data: knownRows } = await db.from('peers').select('member_id').in('member_id', current.map((r) => r.member_id));
      const known = new Set((knownRows ?? []).map((r) => r.member_id as number));
      const rows: PeerRow[] = [...current];
      // Stored as current but no longer listed: read each for the end date.
      const listed = new Set(current.map((r) => r.member_id));
      for (const id of before.keys()) {
        if (listed.has(id) || budget.stopStarting()) continue;
        const r = await fetchPeer(id, budget);
        if (r) rows.push(r);
      }
      const changed = rows.filter((r) => { const b = before.get(r.member_id); return !b || LIST_COLS.some((c) => !sameValue(b[c], r[c])); });
      for (const r of changed) if (peerHasPage(r)) changedPages.add(r.member_id);
      listChanged = changed.length > 0;
      if (!dry) await saveList(db, rows);
      out.list = { current: current.length, new_peers: current.filter((r) => !known.has(r.member_id)).length, left: rows.length - current.length, changed: changed.length };
    }

    // 2. Posts, the longest unchecked first, for peers with a page.
    const { data: due, error: dueErr } = await db.from('peers').select(['member_id', ...POST_COLS].join(', '))
      .or(`is_current.eq.true,end_date.gte.${PAGES_FROM}`)
      .order('posts_checked_at', { ascending: true, nullsFirst: true }).limit(400);
    if (dueErr) throw new Error(`peers posts read: ${dueErr.message}`);
    let read = 0;
    for (const p of (due ?? []) as unknown as Array<Record<string, unknown>>) {
      if (budget.stopStarting()) break;
      const fresh = await fetchPosts(p.member_id as number, budget);
      read++;
      if (POST_COLS.some((c) => !sameValue(p[c], fresh[c]))) changedPages.add(p.member_id as number);
      if (!dry) await savePosts(db, fresh);
    }
    out.posts = { read, due_listed: (due ?? []).length };
  } catch (e) {
    if (!isPoliteStop(e)) {
      console.error('[sync-peers]', (e as Error).message);
      return NextResponse.json({ ok: false, error: (e as Error).message, ...out }, { status: 500 });
    }
    out.stopped_by = (e as Error).message;
  }

  // Refresh only what changed.
  noteChanged(dry ? 0 : changedPages.size);
  if (!dry) {
    for (const id of changedPages) { revalidatePath(`/lords/${id}`); revalidatePath(`/lords/${id}/questions`); }
    if (listChanged) revalidatePath('/lords');
  }
  return NextResponse.json({ ok: true, ...out, rows_written: dry ? 0 : changedPages.size, refreshed_pages: dry ? 0 : changedPages.size, list_refreshed: !dry && listChanged, syncedAt: new Date().toISOString() });
}

export const GET = withHeartbeat('/api/sync-peers', GET_impl);
