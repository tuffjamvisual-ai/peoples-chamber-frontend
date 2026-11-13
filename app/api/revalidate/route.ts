import { revalidatePath, revalidateTag } from 'next/cache';
import { freshnessChanged } from '@/lib/data-freshness';
import { voteCountsChanged } from '@/lib/mp-page-cache';
import { allMpDataChanged, mpDataChanged } from '@/lib/mp-cache';
import { NextResponse } from 'next/server';
import { indexNowAfter } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

// On demand revalidation (owner's approval, 29 Oct 2026, cache Stage 1): refresh cached pages when their data changes,
// instead of on a timer. Secured with CRON_SECRET and fails closed: with no secret configured it refreshes nothing.
//   GET  /api/revalidate?path=/mps/5241                      one path (the original form)
//   POST /api/revalidate  {"paths": ["/a", "/b"], "tags": ["editorials"]}   up to MAX_ITEMS in total
// Both need: Authorization: Bearer $CRON_SECRET. Terminal scripts call it through scripts/revalidate.js.
// A path may be a route pattern with [brackets], such as /mps/[id] (cache Stage 2b, owner's approval, 30 Oct 2026): it
// refreshes every page of that route, so it is passed to Next with the 'page' type. Any other path is an exact page.

const MAX_ITEMS = 300;

// A refresh means data changed: the shared "last updated" dates expire, and the cached vote counts when MP pages are named (W1).
function dataChanged(paths: string[]) {
  freshnessChanged();
  if (paths.some((p) => p.startsWith('/mps'))) voteCountsChanged();
  // An MP's own cached counts and lists (lib/mp-cache.ts, W2) when their page is named.
  if (paths.some((p) => p.startsWith('/mps/[') )) allMpDataChanged();
  mpDataChanged(paths.map((p) => /^\/mps\/(\d+)/.exec(p)?.[1]).filter((id): id is string => !!id).map(Number));
}

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
  dataChanged([path]);
  indexNowAfter([path], 'revalidate');
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
  // The exact pages refreshed (route patterns and tags name no single address) go to IndexNow (lib/indexnow.ts).
  dataChanged(paths as string[]);
  indexNowAfter(paths as string[], 'revalidate');
  // { expire: 0 } (T1-SITEMAP, Cowork 13 Nov 2026): the tagged data is gone at once, so the next read waits for fresh
  // data. It was 'max' (stale while revalidate), with which a page rebuilt in the seconds after a publish read the old
  // data and kept it for its whole period: the sitemap rebuilt at 14:27:36 on 13 Nov without the report published at
  // 14:26:55. The bundled docs (revalidateTag.md) give { expire: 0 } for a route handler called from outside.
  for (const t of tags as string[]) revalidateTag(t, { expire: 0 });
  return NextResponse.json({ revalidated: true, paths, tags, at: new Date().toISOString() });
}
