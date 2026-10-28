// /api/sync-spad-roster (owner, 28 Oct 2026): the latest Cabinet Office "Special adviser data releases: numbers and
// costs" into spad_releases and spad_appointments. Weekly; the release comes out once a year, so a run whose release
// has not changed since the last one (kept in sync_cursor) stops after one search and one content request.
// Uses the shared budget and polite fetching (lib/sync-budget.ts): 20 s per request, Retry-After honoured.
import type { SupabaseClient } from '@supabase/supabase-js';
import { SyncBudget, politeFetch, isPoliteStop, loadCursor, saveCursor } from '@/lib/sync-budget';
import { SPAD_SEARCH, SPAD_UA, parseRelease, dedupe, matchMinisters, type MpName } from '@/lib/spad-roster';
import { runSpadBackgroundSync } from '@/lib/spad-background-sync';
import { syncMinisterStatus } from '@/lib/spad-minister-status';

const ROUTE = '/api/sync-spad-roster';
const CONTENT = 'https://www.gov.uk/api/content';
type Cursor = { release_slug: string; updated: string };

async function json<T>(url: string, budget: SyncBudget): Promise<T> {
  const res = await politeFetch(url, { headers: { 'User-Agent': SPAD_UA, Accept: 'application/json' } }, { budget });
  if (!res.ok) throw new Error(`GOV.UK answered HTTP ${res.status} for ${url.replace('https://www.gov.uk', '')}`);
  return res.json() as Promise<T>;
}

export async function runSpadRosterSync(opts: { supabase: SupabaseClient; maxDurationS: number; force?: boolean }): Promise<{ status: number; body: Record<string, unknown> }> {
  const { supabase } = opts;
  const budget = new SyncBudget(opts.maxDurationS);
  // After the named list, the background: interests, ACOBA advice and the annual reports to read by hand.
  // Then whether each listed minister still holds the post (ministers change; owner, 28 Oct 2026).
  const withBackground = async (body: Record<string, unknown>) => {
    const ministers = await syncMinisterStatus(supabase, budget);
    return { status: 200, body: { ...body, ministers, background: await runSpadBackgroundSync(supabase, budget), elapsed_ms: budget.spent() } };
  };
  try {
    // 1. The latest release (a "transparency" publication; the collection page has the same title).
    const search = await json<{ results: { title: string; link: string; format: string; public_timestamp: string }[] }>(SPAD_SEARCH, budget);
    const latest = (search.results ?? []).filter((r) => r.format === 'transparency' && /special adviser data releases: numbers and costs,/i.test(r.title))
      .sort((a, b) => b.public_timestamp.localeCompare(a.public_timestamp))[0];
    if (!latest) return { status: 502, body: { ok: false, error: 'no "numbers and costs" release found in GOV.UK search' } };
    const slug = latest.link.split('/').pop()!;

    // 2. Its HTML part, through the Content API.
    const pub = await json<{ public_updated_at: string; first_published_at?: string; links?: { children?: { document_type: string; base_path: string }[] } }>(`${CONTENT}${latest.link}`, budget);
    const htmlPath = pub.links?.children?.find((c) => c.document_type === 'html_publication')?.base_path;
    if (!htmlPath) return { status: 502, body: { ok: false, error: `${slug}: no HTML publication` } };
    const prev = await loadCursor<Cursor>(supabase, ROUTE, 400 * 86400_000);
    const { count: saved } = await supabase.from('spad_appointments').select('id', { count: 'exact', head: true }).eq('release_slug', slug);
    if (!opts.force && prev?.release_slug === slug && prev.updated === pub.public_updated_at && (saved ?? 0) > 0) {
      return withBackground({ ok: true, release: slug, unchanged: true, appointments: saved });
    }
    const html = await json<{ details?: { body?: string } }>(`${CONTENT}${htmlPath}`, budget);
    const sourceUrl = `https://www.gov.uk${htmlPath}`;
    const { release, appointments } = parseRelease(html.details?.body ?? '', { slug, sourceUrl, publishedAt: pub.first_published_at ?? latest.public_timestamp });
    const { rows } = dedupe(appointments);
    if (!rows.length || !release.as_at) return { status: 502, body: { ok: false, error: `${slug}: no list or no "as at" date parsed; nothing changed` } };
    if (release.headcount && Math.abs(new Set(rows.map((r) => r.adviser_name)).size - release.headcount) > 5) {
      return { status: 502, body: { ok: false, error: `${slug}: ${new Set(rows.map((r) => r.adviser_name)).size} advisers parsed against ${release.headcount} stated; nothing changed` } };
    }

    // 3. Ministers to MP ids.
    const { data: mps, error: mpError } = await supabase.from('mps').select('member_id, name, display_name, current_member');
    if (mpError) throw new Error(`mps: ${mpError.message}`);
    const { ids, unmatched } = matchMinisters(rows, (mps ?? []) as MpName[]);

    // 4. Write: the release, then its appointments; appointments no longer in the list are removed (this release only).
    const now = new Date().toISOString();
    const { error: relError } = await supabase.from('spad_releases').upsert({ ...release, updated_at: now }, { onConflict: 'release_slug' });
    if (relError) throw new Error(`spad_releases: ${relError.message}`);
    const out = rows.map((r) => ({ ...r, release_slug: slug, as_at: release.as_at, minister_member_id: r.minister_name ? ids.get(r.minister_name) ?? null : null, source_url: sourceUrl, updated_at: now }));
    const { error: apError } = await supabase.from('spad_appointments').upsert(out, { onConflict: 'release_slug,adviser_name,minister_title' });
    if (apError) throw new Error(`spad_appointments: ${apError.message}`);
    const { data: existing, error: readError } = await supabase.from('spad_appointments').select('id, adviser_name, minister_title').eq('release_slug', slug);
    if (readError) throw new Error(`spad_appointments read: ${readError.message}`);
    const keep = new Set(out.map((r) => `${r.adviser_name}|${r.minister_title}`));
    const stale = (existing ?? []).filter((r) => !keep.has(`${r.adviser_name}|${r.minister_title}`)).map((r) => r.id);
    if (stale.length) {
      const { error: delError } = await supabase.from('spad_appointments').delete().in('id', stale);
      if (delError) throw new Error(`spad_appointments remove: ${delError.message}`);
    }
    await saveCursor(supabase, ROUTE, { release_slug: slug, updated: pub.public_updated_at } satisfies Cursor);
    if (unmatched.length) console.log(`[sync-spad-roster] ministers not matched to an MP: ${unmatched.join('; ')}`);
    return withBackground({ ok: true, release: slug, as_at: release.as_at, appointments: out.length, advisers: new Set(out.map((r) => r.adviser_name)).size, removed: stale.length, ministers_matched: ids.size, unmatched_ministers: unmatched });
  } catch (e) {
    if (isPoliteStop(e)) return { status: 200, body: { ok: true, partial: true, reason: (e as Error).message } };
    throw e;
  }
}
