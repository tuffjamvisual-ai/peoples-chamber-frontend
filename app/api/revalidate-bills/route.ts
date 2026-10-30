import { NextResponse } from 'next/server';
import { revalidateBillPages } from '@/lib/revalidate-bills';
import { refreshBills, REFRESH_BATCH } from '@/lib/bill-refresh';

// Called by the nightly GitHub bill sync (.github/workflows/daily-sync.yml) after it writes, so /bills and the
// session archive show the new data on their next visit. Needs CRON_SECRET; refuses if it is not set.
// With a JSON body {"ids": [bill ids]} (owner, 30 Oct 2026, cache Stage 2a part 2; at most REFRESH_BATCH), those bills'
// pages are refreshed too (lib/bill-refresh.ts); the GitHub scripts queue the ids in bill_refresh_queue when this call
// is refused (scripts/bill-refresh-queue.js).
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let ids: number[] = [];
  try {
    const body = (await req.json()) as { ids?: unknown };
    if (Array.isArray(body?.ids)) ids = body.ids.filter((n): n is number => Number.isInteger(n) && (n as number) > 0);
  } catch {
    // No body: the list and session pages only, as before.
  }
  if (ids.length > REFRESH_BATCH) return NextResponse.json({ error: `at most ${REFRESH_BATCH} ids a call` }, { status: 400 });
  const bills = ids.length ? refreshBills(ids) : null;
  return NextResponse.json({ revalidated: revalidateBillPages(), bills, at: new Date().toISOString() });
}
