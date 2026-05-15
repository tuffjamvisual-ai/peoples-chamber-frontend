import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Generalised on-demand revalidation. Hit with:
//   GET /api/revalidate?path=/mps/5241
//   Authorization: Bearer $CRON_SECRET
// Returns { revalidated, path }. Use after a DB update that needs the
// edge-cached ISR HTML refreshed before its natural revalidate window.
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path || !path.startsWith('/')) {
    return NextResponse.json({ error: "missing or invalid 'path' query param" }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path, at: new Date().toISOString() });
}
