import { NextResponse } from 'next/server';
import { revalidateBillPages } from '@/lib/revalidate-bills';

// Called by the nightly GitHub bill sync (.github/workflows/daily-sync.yml) after it writes, so /bills and the
// session archive show the new data on their next visit. Needs CRON_SECRET; refuses if it is not set.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ revalidated: revalidateBillPages(), at: new Date().toISOString() });
}
