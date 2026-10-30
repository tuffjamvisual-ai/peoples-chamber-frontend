import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import NIGHTLY from '@/lib/nightly-refresh-pages.json';

export const dynamic = 'force-dynamic';

// Nightly page refresh (owner's approval, 30 Oct 2026, cache Stage 2b), in place of the redeploy the nightly workflow
// (.github/workflows/daily-context-update.yml) used to make. That workflow asks /api/revalidate for the same pages when
// it ends, but a request from GitHub can be refused by Vercel's bot protection, and GitHub starts scheduled runs late
// (up to about 3 hours). This cron runs at 05:15 UTC, after the workflow and the 04:45 organisation index, and refreshes
// the pages inside the site. The list is lib/nightly-refresh-pages.json; a path with [brackets] is a route pattern
// (every page of that route). Pages are rebuilt on their next visit.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured; nothing refreshed' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  for (const p of NIGHTLY.paths) {
    if (p.includes('[')) revalidatePath(p, 'page');
    else revalidatePath(p);
  }
  return NextResponse.json({ ok: true, rows_written: NIGHTLY.paths.length, paths: NIGHTLY.paths, at: new Date().toISOString() });
}

export const GET = withHeartbeat('/api/refresh-nightly-pages', GET_impl);
