import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// On demand revalidation (owner's approval, 29 Oct 2026, cache Stage 1): refresh cached pages when their data changes,
// instead of on a timer. Secured with CRON_SECRET and fails closed: with no secret configured it refreshes nothing.
//   GET  /api/revalidate?path=/mps/5241                      one path (the original form)
//   POST /api/revalidate  {"paths": ["/a", "/b"], "tags": ["editorials"]}   up to MAX_ITEMS in total
// Both need: Authorization: Bearer $CRON_SECRET. Terminal scripts call it through scripts/revalidate.js.
// A path may be a route pattern with [brackets], such as /mps/[id] (cache Stage 2b, owner's approval, 30 Oct 2026): it
// refreshes every page of that route, so it is passed to Next with the 'page' type. Any other path is an exact page.

const MAX_ITEMS = 300;

function refused(req: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured; nothing refreshed' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return null;
}

const isPattern = (p: string) => p.includes('[');
// A pattern's bracketed segments must be whole segments: [id], [...slug] or [[...slug]].
const validPattern = (p: string) => p.split('/').every((seg) => !seg.includes('[') || /^\[{1,2}(\.\.\.)?[A-Za-z0-9_]+\]{1,2}$/.test(seg));
const validPath = (p: unknown): p is string => typeof p === 'string' && p.startsWith('/') && p.length <= 512 && validPattern(p);
const refreshPath = (p: string) => (isPattern(p) ? revalidatePath(p, 'page') : revalidatePath(p));
const validTag = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9:_.\/-]{1,128}$/.test(t);

export async function GET(req: Request) {
  const no = refused(req);
  if (no) return no;
  const path = new URL(req.url).searchParams.get('path');
  if (!validPath(path)) return NextResponse.json({ error: "missing or invalid 'path' query param" }, { status: 400 });
  refreshPath(path);
  return NextResponse.json({ revalidated: true, path, pattern: isPattern(path), at: new Date().toISOString() });
}

export async function POST(req: Request) {
  const no = refused(req);
  if (no) return no;
  let body: { paths?: unknown; tags?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'body must be JSON: {"paths": [...], "tags": [...]}' }, { status: 400 });
  }
  const paths = Array.isArray(body.paths) ? body.paths : [];
  const tags = Array.isArray(body.tags) ? body.tags : [];
  if (paths.length + tags.length === 0) return NextResponse.json({ error: 'give at least one path or tag' }, { status: 400 });
  if (paths.length + tags.length > MAX_ITEMS) return NextResponse.json({ error: `at most ${MAX_ITEMS} paths and tags in total` }, { status: 400 });
  const bad = [...paths.filter((p) => !validPath(p)), ...tags.filter((t) => !validTag(t))];
  if (bad.length) return NextResponse.json({ error: 'invalid paths or tags', invalid: bad.slice(0, 10) }, { status: 400 });
  for (const p of paths as string[]) refreshPath(p);
  // 'max': the tagged entries are marked stale and refreshed on their next visit (the Next.js 16 form of revalidateTag).
  for (const t of tags as string[]) revalidateTag(t, 'max');
  return NextResponse.json({ revalidated: true, paths, tags, at: new Date().toISOString() });
}
