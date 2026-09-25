import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Nightly programme timeline seeder.
//
// For each live (or draft) programme in policy_programmes, runs a websearch
// FTS query against press_releases and editorials using the programme's alias
// set, restricted to items published after the programme's most recent existing
// timeline entry_date. Inserts matching items as draft timeline entries
// (is_approved=false, figure_value=null) for human review.
//
// Never touches is_live, is_approved, or figure_value on existing rows.
// Insert-only, draft-only — the same safety contract as every other sync cron.
//
// Schedule: 30 9 * * * (09:30 UTC, after sync-press-releases at 07:00 and
// sync-commons-press-releases at 07:15 have both completed).
//
// Manual single-programme test: GET ?slug=hs2 (auth still required).
// Dry-run preview (no DB writes): GET ?dry=1 (auth still required).
//
// PIPELINE_ENABLED=false: no-ops immediately without querying or inserting.
// Set true and add the vercel.json cron entry to activate.

export const runtime = 'nodejs';
export const maxDuration = 60;

const PIPELINE_ENABLED = false;

// Alias sets keyed by exact policy_programmes.slug values.
// Verified against: SELECT slug FROM policy_programmes ORDER BY slug;
// Result: housing-1-5m-homes | hs2 | nhs-elective-waiting-list | rwanda-asylum-scheme
const PROGRAMME_ALIASES: Record<string, string[]> = {
  'hs2': [
    'HS2', 'High Speed Two', 'High Speed 2',
  ],
  'nhs-elective-waiting-list': [
    'NHS waiting list', 'NHS elective backlog', 'elective waiting times',
  ],
  'rwanda-asylum-scheme': [
    'Rwanda asylum', 'Safety of Rwanda', 'Rwanda scheme',
  ],
  'housing-1-5m-homes': [
    '1.5 million homes', 'housebuilding target', 'housing target',
  ],
};

// Build a websearch_to_tsquery-compatible OR string from an alias list.
// Each alias is double-quoted so multi-word phrases are treated as phrases,
// not independent tokens. Single-word terms (e.g. HS2) are left unquoted
// since they contain no spaces — quoting them works too but is harmless.
function buildFtsQuery(aliases: string[]): string {
  return aliases
    .map((a) => (a.includes(' ') ? `"${a}"` : a))
    .join(' OR ');
}

type ProgrammeRow = {
  id: number;
  slug: string;
  name: string;
  started_date: string | null;
};

type TimelineInsert = {
  programme_id: number;
  entry_date: string;
  title: string;
  body: string | null;
  source_url: string | null;
  source_label: string | null;
  figure_value: null;
  figure_unit: null;
  is_approved: false;
  extraction_meta: {
    _needs_review: true;
    _extracted_by: 'sync-programmes';
    _run_date: string;
  };
};

export async function GET(req: Request) {
  // ── Auth (identical to daily-briefings pattern) ──────────────────────────
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!PIPELINE_ENABLED) {
    return NextResponse.json(
      { ok: false, paused: true, message: 'sync-programmes pipeline is paused (PIPELINE_ENABLED=false). No queries or inserts ran.' },
      { status: 200 },
    );
  }

  const url = new URL(req.url);
  const slugFilter = url.searchParams.get('slug') ?? null;
  const dryRun = url.searchParams.get('dry') === '1';
  const runDate = new Date().toISOString().slice(0, 10);

  // ── 1. Fetch programmes to process ───────────────────────────────────────
  // supabaseAdmin bypasses RLS so is_live=false draft programmes are also
  // processed — editorial review needs candidate timeline entries before
  // the programme goes live.
  let progQuery = supabaseAdmin
    .from('policy_programmes')
    .select('id, slug, name, started_date');

  if (slugFilter) {
    progQuery = progQuery.eq('slug', slugFilter);
  }

  const { data: programmes, error: progErr } = await progQuery;
  if (progErr) {
    return NextResponse.json({ error: 'db_error', detail: progErr.message }, { status: 500 });
  }
  if (!programmes || programmes.length === 0) {
    return NextResponse.json(
      { ok: false, error: slugFilter ? `no programme with slug '${slugFilter}'` : 'no programmes found' },
      { status: 404 },
    );
  }

  const results: Array<{
    slug: string;
    name: string;
    cutoffDate: string | null;
    candidates: number;
    inserted: number;
    skipped: number;
    entries: Array<{ title: string; entry_date: string; source: string | null; action: 'insert' | 'skip' }>;
  }> = [];

  for (const prog of programmes as ProgrammeRow[]) {
    const aliases = PROGRAMME_ALIASES[prog.slug];
    if (!aliases) {
      results.push({
        slug: prog.slug, name: prog.name,
        cutoffDate: null, candidates: 0, inserted: 0, skipped: 0,
        entries: [{ title: '(no alias set configured for this slug)', entry_date: '', source: null, action: 'skip' }],
      });
      continue;
    }

    // ── 2. Cutoff date: MAX(entry_date) for this programme, else started_date ──
    const { data: maxRow } = await supabaseAdmin
      .from('programme_timeline')
      .select('entry_date')
      .eq('programme_id', prog.id)
      .order('entry_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cutoffDate: string | null = maxRow?.entry_date ?? prog.started_date ?? null;

    // ── 3. Existing source_urls for this programme (dedup set) ───────────────
    const { data: existingUrls } = await supabaseAdmin
      .from('programme_timeline')
      .select('source_url')
      .eq('programme_id', prog.id)
      .not('source_url', 'is', null);

    const seenUrls = new Set<string>(
      (existingUrls ?? []).map((r: { source_url: string | null }) => r.source_url ?? '').filter(Boolean),
    );

    // ── 4. FTS search: press_releases ────────────────────────────────────────
    const ftsQ = buildFtsQuery(aliases);

    let prQuery = supabaseAdmin
      .from('press_releases')
      .select('title, description, organisation, published_at, gov_url')
      .textSearch('search_vec', ftsQ, { type: 'websearch', config: 'english' })
      .not('removed_upstream', 'is', true)
      .not('gov_url', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50);

    if (cutoffDate) prQuery = prQuery.gt('published_at', cutoffDate);

    const { data: pressReleases, error: prErr } = await prQuery;
    if (prErr) {
      return NextResponse.json({ error: 'fts_error', detail: prErr.message, slug: prog.slug }, { status: 500 });
    }

    // ── 5. FTS search: editorials ─────────────────────────────────────────────
    let edQuery = supabaseAdmin
      .from('editorials')
      .select('slug, headline, standfirst, published_at')
      .textSearch('search_vec', ftsQ, { type: 'websearch', config: 'english' })
      .order('published_at', { ascending: false })
      .limit(20);

    if (cutoffDate) edQuery = edQuery.gt('published_at', cutoffDate);

    const { data: editorials, error: edErr } = await edQuery;
    if (edErr) {
      return NextResponse.json({ error: 'fts_error', detail: edErr.message, slug: prog.slug }, { status: 500 });
    }

    // ── 6. Build candidate inserts, dedup by source_url ───────────────────────
    const toInsert: TimelineInsert[] = [];
    const entryLog: (typeof results[0]['entries'][0])[] = [];

    for (const pr of (pressReleases ?? []) as Array<{
      title: string; description: string | null; organisation: string | null;
      published_at: string | null; gov_url: string | null;
    }>) {
      if (!pr.gov_url || !pr.published_at) continue;
      const sourceUrl = pr.gov_url;
      const entryDate = pr.published_at.slice(0, 10);

      if (seenUrls.has(sourceUrl)) {
        entryLog.push({ title: pr.title, entry_date: entryDate, source: sourceUrl, action: 'skip' });
        continue;
      }

      seenUrls.add(sourceUrl); // prevent duplicates within the same run
      toInsert.push({
        programme_id: prog.id,
        entry_date: entryDate,
        title: pr.title,
        body: pr.description ?? null,
        source_url: sourceUrl,
        source_label: pr.organisation ?? null,
        figure_value: null,
        figure_unit: null,
        is_approved: false,
        extraction_meta: { _needs_review: true, _extracted_by: 'sync-programmes', _run_date: runDate },
      });
      entryLog.push({ title: pr.title, entry_date: entryDate, source: sourceUrl, action: 'insert' });
    }

    for (const ed of (editorials ?? []) as Array<{
      slug: string; headline: string; standfirst: string | null; published_at: string | null;
    }>) {
      if (!ed.published_at) continue;
      const sourceUrl = `/editorials/${ed.slug}`;
      const entryDate = ed.published_at.slice(0, 10);

      if (seenUrls.has(sourceUrl)) {
        entryLog.push({ title: ed.headline, entry_date: entryDate, source: sourceUrl, action: 'skip' });
        continue;
      }

      seenUrls.add(sourceUrl);
      toInsert.push({
        programme_id: prog.id,
        entry_date: entryDate,
        title: ed.headline,
        body: ed.standfirst ?? null,
        source_url: sourceUrl,
        source_label: 'opengovt.uk editorial',
        figure_value: null,
        figure_unit: null,
        is_approved: false,
        extraction_meta: { _needs_review: true, _extracted_by: 'sync-programmes', _run_date: runDate },
      });
      entryLog.push({ title: ed.headline, entry_date: entryDate, source: sourceUrl, action: 'insert' });
    }

    // ── 7. Insert (skipped in dry-run) ────────────────────────────────────────
    let inserted = 0;
    if (!dryRun && toInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('programme_timeline')
        .insert(toInsert);
      if (insertErr) {
        return NextResponse.json({ error: 'insert_error', detail: insertErr.message, slug: prog.slug }, { status: 500 });
      }
      inserted = toInsert.length;
    } else {
      inserted = dryRun ? 0 : 0;
    }

    results.push({
      slug: prog.slug,
      name: prog.name,
      cutoffDate,
      candidates: entryLog.length,
      inserted: dryRun ? 0 : toInsert.length,
      skipped: entryLog.filter((e) => e.action === 'skip').length,
      entries: entryLog,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    runDate,
    programmesProcessed: results.length,
    totalInserted: results.reduce((s, r) => s + r.inserted, 0),
    results,
  });
}
