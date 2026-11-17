// Cron: the Parliament archive backfill and top up (owner's approval, 29 Oct 2026, "go"). Writes ONLY to
// parliament_written_questions, hansard_contributions, hansard_debates and parliament_archive_sync_state
// (scripts/migrations/2026-10-29a-parliament-archive.sql and 2026-10-30f-hansard-debates.sql).
//
// Sources, one after the other in each run:
//   speeches   Commons spoken contributions from the Hansard API, sitting days from 2024-07-04 in date order. For each
//              day: the day's sections (sectionsforday), the debates in each spoken section (sectiontrees), then one
//              request per debate (debates/debate), whose items carry every contribution's full text. Backfill
//              finished 30 Oct 2026; it now tops up the last 3 days every 6 hours.
//   debates    Debates from our own database, Stage 1 (owner's approval, 30 Oct 2026). The same day walk again over
//              every sitting day, storing what the debate page needs: each record's overview (title, house, date,
//              location, previous and next) in hansard_debates, the parent links and positions from the section trees,
//              and for every item its order, type, speaker label (AttributedTo) and HTML (value_html), alongside
//              contribution_text as before. Parent headings and sitting headers are fetched once each too; only their
//              own items are stored (their children are stored under the children's own ids).
//   re-fetch   A debate is fetched again once a day until it is 14 days old, then settled_at is set. A re-fetch that
//              changes the text re-stores the debate and is recorded in the debates cursor (text_changes); the page
//              refresh comes in Stage 2. Hansard answering 400 or 404 for a stored id sets gone_at.
//   our ids    Once the debates backfill has finished, once a day: every Commons id in our debates table that has no
//              hansard_debates row is fetched (Hansard re-issues some sitting headers under new ids; those get gone_at).
//   monthly    Once the debates backfill has finished, once every 30 days: 20 random settled debates are fetched again;
//              any whose text differs is re-stored and listed in the cursor (monthly), which the freshness monitor shows.
//   questions  Written questions, Commons and Lords, tabled from 2024-07-04 in date order: a list page of ids for each
//              day, then one detail request per question, because list pages cut answers short. Starts only once
//              speeches has finished_at set.
//   answered   In the daily 03:08 UTC run (once a day since T1-CRONDAILY, 15 Nov 2026): newly answered and corrected
//              questions, whatever day they were tabled (runAnswered), with most of the run's time (ANSWERED_PHASE_MS).
//   weekly     The Sunday 03:08 UTC run (owner, 16 Nov 2026, COWORK-TO-T1 ENTRY 205 option b; was Sunday 07:00 to 11:00, which
//              no run reaches any more): the last 90 days of answers against Parliament's lists, a day at a time
//              (runWeekly). A pass the Sunday run leaves part done carries on in the next daily runs until it finishes.
//   unanswered Daily: the unanswered list, for new holding answers and withdrawals (runUnanswered).
//   refresh    At the end of every run, the pages of members whose answers changed in it (refreshAnswerPages).
// The cursor (parliament_archive_sync_state.cursor) is the current date and position in it, saved with every batch of
// rows, so a run that stops part way loses nothing. Rows are upserted by primary key, so a batch read twice is never
// duplicated. When a source reaches today it sets finished_at; from then on speeches and questions top up only the last
// 3 days, at most once every TOP_UP_EVERY_MS, so a run every 10 minutes does not reread the same days each time (the
// questions top up keeps its place across runs: QCursor below).
// While the questions backfill is unfinished, the debates backfill takes 60 per cent of a run's remaining time.
//
// Saves go in batches of ITEM_BATCH rows (owner, 30 Oct 2026): a whole debate in one upsert (up to 2,002 items) hit the
// statement timeout at 15:28 on 30 Oct, and value_html roughly doubles each row.
//
// Archived speeches are never hard deleted (owner, 30 Oct 2026): a contribution Hansard drops from a re-published
// debate gets removed_at (migration 2026-10-30g). Anything that reads the archive for readers (the Stage 2 debate page,
// a future search) must filter removed_at IS NULL. The sync's own reads below see removed rows on purpose.
//
// Politeness: one request at a time, at least 0.5 s apart. HTTP 429 or 5xx: last_error is recorded, the cursor saved,
// and the run ends cleanly (the next run tries again); nothing is retried in a loop. New requests stop at 80 per cent
// of maxDuration.

import { bearerMatches } from '@/lib/cron-auth';
import { indexNowAfter } from '@/lib/indexnow';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { noteChanged, revalidatePath, revalidateTag } from '@/lib/refresh-count';
import { answerPaths } from '@/lib/written-answers-refresh';
import { htmlToText } from '@/lib/written-question-row';
import { questionTag } from '@/lib/question-pages';
import { TOPIC_READS_TAG } from '@/lib/topic-reads';
import { refreshTables } from '@/lib/source-tags';

export const dynamic = 'force-dynamic';
export const maxDuration = 270;

const ROUTE = '/api/sync-parliament-archive';
import {
  START, BUDGET_MS, RESERVE_MS, DB_TIMEOUT_MS, TOP_UP_DAYS, TOP_UP_EVERY_MS, SETTLE_DAYS, REFETCH_AFTER_MS, OUR_IDS_EVERY_MS, MONTHLY_EVERY_MS, MONTHLY_SAMPLE, ANSWERED_EVERY_MS, ANSWERED_PHASE_MS, UNANSWERED_EVERY_MS, UNANSWERED_PHASE_MS, WEEKLY_EVERY_MS, WEEKLY_PHASE_MS, TOP_UP_PHASE_MS, REFETCH_PHASE_MS, OUR_IDS_PHASE_MS, MONTHLY_PHASE_MS, HANSARD, SKIP_SECTIONS, StopRun, SourceRefused, day, addDays, up, Run, runQuestions, runAnswered, runWeekly, runUnanswered, inWeeklyWindow, type State, type Row, readAll, type Listed, type DayCursor, type TreeNode, type Debate, type Known,
  catchupLockedUntil,
} from '@/lib/parliament-archive';

// ---------- debates and speeches ----------

// An entry of a sitting day's section trees: a leaf debate, a parent heading or a sitting header. parent and position
// place it among its parent's children; kids are its own children's ids. Cursors saved before Stage 1 have leaves
// only, without parent, position or kids.

async function debatesForDay(run: Run, date: string): Promise<Listed[]> {
  const sections = await run.getJson<string[]>(`${HANSARD}/overview/sectionsforday.json?date=${date}&house=Commons`);
  const out: Listed[] = [];
  for (const section of (Array.isArray(sections) ? sections : []).filter((s) => !SKIP_SECTIONS.has(s))) {
    const tree = await run.getJson<TreeNode | TreeNode[]>(`${HANSARD}/overview/sectiontrees.json?date=${date}&house=Commons&section=${encodeURIComponent(section)}`);
    for (const root of Array.isArray(tree) ? tree : [tree]) {
      const items = root.SectionTreeItems ?? [];
      const extId = new Map<number, string>();
      for (const i of items) if (i.Id != null && i.ExternalId) extId.set(i.Id, up(i.ExternalId)!);
      const kids = new Map<number, string[]>();
      for (const i of items) if (i.ParentId != null && i.ExternalId) kids.set(i.ParentId, [...(kids.get(i.ParentId) ?? []), up(i.ExternalId)!]);
      const siblings = new Map<number | null, number>();
      for (const i of items) {
        const parentId = i.ParentId ?? null;
        const position = siblings.get(parentId) ?? 0;
        siblings.set(parentId, position + 1);
        if (!i.ExternalId) continue;
        out.push({
          id: i.ExternalId, title: (i.Title ?? '').trim(), section,
          parent: parentId != null ? extId.get(parentId) ?? null : null, position,
          kids: i.Id != null ? kids.get(i.Id) ?? [] : [],
        });
      }
    }
  }
  return out;
}

function slug(s: string) { return s.replace(/[^A-Za-z0-9]+/g, '').slice(0, 60) || 'Debate'; }

const fingerprint = (r: Row) =>
  [r.ext_id, r.item_order, r.item_type, r.attributed_to ?? '', r.value_html ?? ''].join('\u0001');

type StoreOpts = {
  originalId: string;                                   // the id as Hansard listed it (rows before Stage 1 kept its case)
  date: string; title?: string; section?: string;       // fallbacks when the overview lacks them
  place?: { parent: string | null; position: number };  // from the day's section tree
  kids: string[] | null;                                // the tree's children, or null to read them from hansard_debates
  known: boolean;                                       // stored before: a text change is recorded
  settledAt: string | null;                             // kept when already settled
  via: string;
};

// Stores one debate record: its own items (Timestamps and items without an id, which show nothing, are left out) and
// then its hansard_debates row, so a row with fetched_at always has its items. A re-fetch whose items are unchanged
// writes only the hansard_debates row.
async function storeDebate(run: Run, guid: string, deb: Debate, o: StoreOpts): Promise<'stored' | 'changed' | 'unchanged'> {
  const ov = deb.Overview ?? {};
  const date = (ov.Date ?? '').slice(0, 10) || o.date;
  const title = (ov.Title ?? o.title ?? '').trim();
  const location = ov.Location ?? o.section ?? null;
  const now = new Date().toISOString();
  let incomplete = false;
  const rows: Row[] = [];
  (deb.Items ?? []).forEach((i, n) => {
    if (i.ItemType === 'Timestamp') return;
    const text = htmlToText(i.Value);
    if (!i.ExternalId) { if (text) incomplete = true; return; }
    rows.push({
      ext_id: i.ExternalId,
      member_id: i.MemberId || null,
      house: 'Commons',
      sitting_date: date,
      debate_title: title,
      debate_section: location,
      debate_ext_id: guid,
      contribution_text: text,
      url: `https://hansard.parliament.uk/Commons/${date}/debates/${o.originalId}/${slug(title)}#contribution-${i.ExternalId}`,
      fetched_at: now,
      item_order: n,
      item_type: i.ItemType,
      attributed_to: (i.AttributedTo ?? '').trim() || null,
      value_html: i.Value ?? null,
      removed_at: null,
    });
  });
  // Children the record has but the tree (or, on a re-fetch, hansard_debates) does not: their items are not stored.
  const childIds = (deb.ChildDebates ?? []).map((c) => up(c.Overview?.ExtId)).filter((x): x is string => !!x);
  if (childIds.length) {
    const expected = new Set(o.kids ?? await run.childrenOf(guid));
    if (childIds.some((c) => !expected.has(c))) incomplete = true;
  }

  // Hansard sometimes publishes one sitting as two records that list the same contribution ids (two "Draft Double
  // Taxation Relief" records of 1 Dec 2025 share 37). ext_id is the primary key, so a contribution already stored
  // under another debate is stored again for this one as "<id>@<this debate>", and neither debate loses items.
  const stored = await run.storedItems([guid, o.originalId]);
  const mine = new Set(stored.map((r) => r.ext_id));
  const copyKey = (e: unknown) => `${e}@${guid}`;
  const elsewhere = await run.storedElsewhere(rows.map((r) => String(r.ext_id)).filter((e) => !mine.has(e) && !mine.has(copyKey(e))), [guid, o.originalId]);
  for (const r of rows) if (mine.has(copyKey(r.ext_id)) || elsewhere.has(String(r.ext_id))) r.ext_id = copyKey(r.ext_id);
  // Speeches: the copy with the longest text.
  const longer = (a: Row, b: Row) => String(a.contribution_text ?? '').length > String(b.contribution_text ?? '').length;
  const byKey = new Map<unknown, Row>();
  for (const r of rows) { const kept = byKey.get(r.ext_id); if (!kept || longer(r, kept)) byKey.set(r.ext_id, r); }
  const unique = [...byKey.values()];
  // Compared with the rows not marked removed; a removed row listed again makes the debate changed, which clears it.
  const live = stored.filter((r) => !r.removed_at);
  const same = o.known && live.length === unique.length
    && JSON.stringify(live.map(fingerprint).sort()) === JSON.stringify(unique.map(fingerprint).sort());
  const result = o.known ? (same ? 'unchanged' : 'changed') : 'stored';
  if (!same) {
    await run.upsert('hansard_contributions', 'ext_id', rows, 'speeches', longer);
    const keep = new Set(unique.map((r) => r.ext_id));
    const stale = live.map((r) => r.ext_id).filter((id) => !keep.has(id));
    // Only after a complete fetch: a 200 with an Overview and Items present (getDebate returns null for anything else,
    // and errors and timeouts throw before this point), and at least one item stored from it.
    const complete = Array.isArray(deb.Items) && deb.Items.length > 0 && unique.length > 0;
    if (complete && stale.length) await run.markRemoved(stale);
    if (o.known) run.extra.changes.push({ guid, at: now, via: o.via });
  }
  if (!o.known) {
    if (unique.length) run.extra.with_items++;
    if (childIds.length || (o.kids?.length ?? 0) > 0) run.extra.parents_filled++;
  }

  const settled = o.settledAt ?? (date <= addDays(day(new Date()), -SETTLE_DAYS) ? now : null);
  await run.write('hansard_debates', 'guid', [{
    guid, house: ov.House || 'Commons', sitting_date: date, title, location,
    ...(o.place ? { parent_guid: o.place.parent, position: o.place.position } : {}),
    prev_guid: up(ov.PreviousDebateExtId), prev_title: (ov.PreviousDebateTitle ?? '').trim() || null,
    next_guid: up(ov.NextDebateExtId), next_title: (ov.NextDebateTitle ?? '').trim() || null,
    fetched_at: now, settled_at: settled, gone_at: null, incomplete,
  }]);
  return result;
}

const fresh = (k: Known) => !!k.fetched_at && Date.now() - new Date(k.fetched_at).getTime() < REFETCH_AFTER_MS;

// Walks sitting days from `from` to `until`: the section trees, then every listed record not already stored and
// settled (or fetched in the last day). `only` (local tests): just these ids, with their parents and children.
async function runDays(run: Run, s: State, from: string, until: string, topUp: boolean, only?: Set<string>) {
  const base = run.rows;
  let cur: DayCursor = (!topUp && s.cursor && typeof s.cursor.date === 'string') ? (s.cursor as DayCursor) : { date: from };
  if (cur.date < from) cur = { date: from };
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const save = async () => { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: null }, !topUp); };
  try {
    while (cur.date <= until) {
      if (!cur.debates) { cur = { date: cur.date, debates: await debatesForDay(run, cur.date), next: 0 }; }
      const list = cur.debates ?? [];
      const wanted = only ? withFamily(list, only) : null;
      const known = await run.knownDebates([...new Set(list.map((d) => up(d.id)!))]);
      while ((cur.next ?? 0) < list.length) {
        const d = list[cur.next ?? 0];
        const guid = up(d.id)!;
        const k = known.get(guid);
        const skip = (wanted && !wanted.has(guid)) || (k && (k.gone_at || k.settled_at || fresh(k)));
        if (!skip) {
          const deb = await run.getDebate(d.id);
          if (!deb) await run.markGone(guid, { title: d.title, sitting_date: cur.date, location: d.section, house: 'Commons' });
          else await storeDebate(run, guid, deb, {
            originalId: d.id, date: cur.date, title: d.title, section: d.section,
            place: d.parent !== undefined ? { parent: d.parent, position: d.position ?? 0 } : undefined,
            kids: d.kids ?? null, known: !!k, settledAt: null, via: topUp ? 'top up' : 'backfill',
          });
          known.set(guid, { guid, fetched_at: new Date().toISOString(), settled_at: null, gone_at: null });
        }
        cur.next = (cur.next ?? 0) + 1;
        if (!topUp && !skip) await save();
      }
      cur = { date: addDays(cur.date, 1) };
      if (!topUp) await save();
    }
    // Reached today: backfill finished; a top up just records its run.
    await run.saveState({ ...s, cursor: topUp ? s.cursor : { date: until }, rows_done: rowsDone(), last_error: null, finished_at: topUp ? s.finished_at : (s.finished_at ?? new Date().toISOString()) });
    return 'done';
  } catch (e) {
    if (e instanceof StopRun) { await save(); return 'partial'; }
    if (e instanceof SourceRefused) { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: `${e.message} at ${new Date().toISOString()}` }); return 'refused'; }
    throw e;
  }
}

// The listed ids, their parents up to the sitting header, and all their children.
function withFamily(list: Listed[], only: Set<string>) {
  const parentOf = new Map(list.map((d) => [up(d.id)!, d.parent ?? null]));
  const out = new Set<string>();
  for (const id of only) for (let g: string | null = id; g && !out.has(g); g = parentOf.get(g) ?? null) out.add(g);
  const down = new Set(only);
  for (let grew = true; grew;) {
    grew = false;
    for (const [g, p] of parentOf) if (p && down.has(p) && !down.has(g)) { down.add(g); grew = true; }
  }
  for (const g of down) out.add(g);
  return out;
}

// Stops a pass cleanly on the budget or a refusal, as runDays does.
async function pass(fn: () => Promise<string>): Promise<string> {
  try { return await fn(); } catch (e) {
    if (e instanceof StopRun) return 'partial';
    if (e instanceof SourceRefused) return 'refused';
    throw e;
  }
}

// Daily re-fetch of the debates under 14 days old, oldest fetch first.
async function runRefetch(run: Run, only?: string) {
  return pass(async () => {
    let rows: { guid: string; sitting_date: string }[];
    if (only) rows = [{ guid: only, sitting_date: '' }];
    else if (run.dry) rows = [];
    else {
      const cutoff = new Date(Date.now() - REFETCH_AFTER_MS).toISOString();
      const { data, error } = await run.db.from('hansard_debates').select('guid, sitting_date')
        .is('settled_at', null).is('gone_at', null).lt('fetched_at', cutoff).order('fetched_at').limit(200);
      if (error) throw new Error(`hansard_debates read: ${error.message}`);
      rows = (data ?? []) as typeof rows;
    }
    for (const r of rows) {
      const deb = await run.getDebate(r.guid);
      if (!deb) { await run.markGone(r.guid); continue; }
      await storeDebate(run, r.guid, deb, { originalId: r.guid, date: r.sitting_date, kids: null, known: true, settledAt: null, via: 're-fetch' });
    }
    return rows.length === 200 ? 'partial' : 'done';
  });
}


// Once a day after the backfill: Commons ids in our debates table with no hansard_debates row.
async function runOurIds(run: Run) {
  return pass(async () => {
    const ours = await readAll<{ hansard_ext_id: string; title: string | null; sitting_date: string | null; section: string | null; house: string | null }>((a, b) =>
      run.db.from('debates').select('hansard_ext_id, title, sitting_date, section, house').not('hansard_ext_id', 'is', null).order('id').range(a, b));
    const have = new Set((await readAll<{ guid: string }>((a, b) => run.db.from('hansard_debates').select('guid').order('guid').range(a, b))).map((r) => r.guid));
    const missing = ours.filter((d) => !/lords/i.test(d.house ?? '') && !have.has(up(d.hansard_ext_id)!));
    for (const d of missing) {
      const guid = up(d.hansard_ext_id)!;
      if (have.has(guid)) continue;
      have.add(guid);
      const deb = await run.getDebate(d.hansard_ext_id);
      if (!deb) await run.markGone(guid, { title: d.title, sitting_date: d.sitting_date, location: d.section, house: 'Commons' });
      else await storeDebate(run, guid, deb, { originalId: d.hansard_ext_id, date: d.sitting_date ?? '', title: d.title ?? undefined, section: d.section ?? undefined, kids: null, known: false, settledAt: null, via: 'our ids' });
    }
    run.extra.our_ids_checked_at = new Date().toISOString();
    return `done (${missing.length} missing)`;
  });
}

// Once every 30 days after the backfill: 20 random settled debates fetched again and compared.
async function runMonthly(run: Run) {
  return pass(async () => {
    const settledRows = () => run.db.from('hansard_debates').select('guid, sitting_date, settled_at').not('settled_at', 'is', null).is('gone_at', null);
    const { count, error } = await run.db.from('hansard_debates').select('guid', { count: 'exact', head: true }).not('settled_at', 'is', null).is('gone_at', null);
    if (error) throw new Error(`hansard_debates count: ${error.message}`);
    const offsets = new Set<number>();
    while (offsets.size < Math.min(MONTHLY_SAMPLE, count ?? 0)) offsets.add(Math.floor(Math.random() * (count ?? 0)));
    const differed: string[] = [];
    const gone: string[] = [];
    for (const off of offsets) {
      const { data, error: e } = await settledRows().order('guid').range(off, off);
      if (e) throw new Error(`hansard_debates read: ${e.message}`);
      const r = (data ?? [])[0] as { guid: string; sitting_date: string; settled_at: string } | undefined;
      if (!r) continue;
      const deb = await run.getDebate(r.guid);
      if (!deb) { await run.markGone(r.guid); gone.push(r.guid); continue; }
      const res = await storeDebate(run, r.guid, deb, { originalId: r.guid, date: r.sitting_date, kids: null, known: true, settledAt: r.settled_at, via: 'monthly check' });
      if (res === 'changed') differed.push(r.guid);
    }
    run.extra.monthly = { at: new Date().toISOString(), checked: offsets.size, differed, gone };
    if (differed.length) console.log(`[sync-parliament-archive] monthly check: text differs for ${differed.join(', ')}; re-stored`);
    return `done (${differed.length} of ${offsets.size} differed)`;
  });
}


// The pages of members whose answers changed in this run, all sent together at its end.
function refreshAnswerPages(run: Run) {
  const { members, paths } = answerPaths(run.answerChanges);
  const send = !run.dry || run.pretendChanged;
  if (send) {
    noteChanged(run.answerChanges.length);
    for (const p of paths) revalidatePath(p);
    for (const r of run.answerChanges) revalidateTag(questionTag(r.id), 'max'); // A16: each changed question's own data
    if (!run.dry) indexNowAfter(paths, 'sync-parliament-archive');
  }
  return { rows: run.answerChanges.length, members, paths: paths.length, sent: send };
}

// ---------- the run ----------

// Database calls get their own timeout, so a stalled save cannot hold the run past the limit.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DB_TIMEOUT_MS);
  init?.signal?.addEventListener('abort', () => ctrl.abort());
  return fetch(input, { ...init, signal: ctrl.signal, cache: 'no-store' }).finally(() => clearTimeout(timer));
}

// Local tests only, never honoured on Vercel production:
//   ?source=speeches|questions|debates&date=YYYY-MM-DD fetches that one day (as a top up, so no cursor is touched);
//   ?source=answered&date=YYYY-MM-DD reads every answer and correction from that date, as the half hourly pass does;
//   ?source=weekly&date=YYYY-MM-DD checks every answered day from that date, as the Sunday pass does;
//   ?source=unanswered&date=YYYY-MM-DD checks the unanswered list, as the daily pass does (the date is not used);
//   &pretend_changed=1 counts every question read as changed, and refreshes the pages of this local server even if dry;
//   with source=debates, &only=GUID,GUID stores just those debates with their parents and children;
//   ?source=refetch&guid=GUID re-fetches one stored id; ?budget_ms shortens the run;
//   &dry=1 reads and writes nothing in the database and returns the rows it would write;
//   with source=questions, &missing_only=1 fetches only the day's questions not already stored.
function testOptions(req: Request) {
  if (process.env.VERCEL_ENV === 'production') return null;
  const u = new URL(req.url);
  const date = u.searchParams.get('date');
  const source = u.searchParams.get('source');
  const guid = u.searchParams.get('guid');
  const dry = u.searchParams.get('dry') === '1';
  const budgetMs = Number(u.searchParams.get('budget_ms')) || BUDGET_MS;
  const missingOnly = u.searchParams.get('missing_only') === '1';
  const pretendChanged = u.searchParams.get('pretend_changed') === '1';
  if (source === 'refetch' && guid && /^[0-9A-Fa-f-]{36}$/.test(guid)) return { source, date: '', guid: up(guid)!, only: null, dry, budgetMs, missingOnly: false, pretendChanged: false };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (source !== 'speeches' && source !== 'questions' && source !== 'debates' && source !== 'answered' && source !== 'weekly' && source !== 'unanswered')) return null;
  const only = u.searchParams.get('only');
  return { date, source, guid: null, only: only ? new Set(only.split(',').map((g) => up(g)!).filter(Boolean)) : null, dry, budgetMs, missingOnly, pretendChanged };
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: fetchWithTimeout } });

  const test = testOptions(req);
  const run = new Run(db, test?.budgetMs ?? BUDGET_MS, !test, !!test?.dry);
  run.pretendChanged = !!test?.pretendChanged;
  const today = day(new Date());
  const results: Record<string, string> = {};
  const due = (st: State, every: number, at?: unknown) => {
    const last = typeof at === 'string' ? at : st.last_run_at;
    return !last || Date.now() - new Date(last).getTime() > every;
  };

  let refreshed = { rows: 0, members: 0, paths: 0, sent: false };
  try {
    if (test) {
      if (test.source === 'refetch') results.refetch = await runRefetch(run, test.guid!);
      else {
        const s = await run.state(test.source === 'debates' ? 'speeches' : test.source === 'answered' || test.source === 'weekly' || test.source === 'unanswered' ? 'questions' : test.source);
        results[test.source] = test.source === 'unanswered' ? await runUnanswered(run, s, today) : test.source === 'weekly' ? await runWeekly(run, s, test.date, today) : test.source === 'answered' ? await runAnswered(run, s, test.date) : test.source === 'questions'
          ? await runQuestions(run, s, test.date, test.date, true, test.missingOnly && !test.dry)
          : await runDays(run, s, test.date, test.date, true, test.only ?? undefined);
      }
    } else {
      const debates = await run.state('debates');   // read first: the baseline for its counters
      const speeches = await run.state('speeches');
      // 1. Speeches: the top up of the last 3 days every 6 hours (its backfill finished 30 Oct 2026).
      if (!speeches.finished_at) results.speeches = await runDays(run, speeches, START, today, false);
      else if (due(speeches, TOP_UP_EVERY_MS)) results.speeches = await run.phase(TOP_UP_PHASE_MS, () => runDays(run, speeches, addDays(today, -TOP_UP_DAYS), today, true));
      // 2. The daily re-fetch of debates under 14 days old.
      if (run.timeLeft() > RESERVE_MS * 2) results.refetch = await run.phase(REFETCH_PHASE_MS, () => runRefetch(run));
      // 3. The debates backfill; once it has finished, the daily check of our ids and the monthly check.
      const questions = await run.state('questions');
      if (!debates.finished_at) {
        if (run.timeLeft() > RESERVE_MS * 2) {
          const share = questions.finished_at ? Infinity : Math.floor((run.timeLeft() - RESERVE_MS) * 0.6);
          results.debates = await run.phase(share, () => runDays(run, debates, START, today, false));
        }
      } else {
        if (run.timeLeft() > RESERVE_MS * 2 && due(debates, OUR_IDS_EVERY_MS, debates.cursor?.our_ids_checked_at)) results.ourIds = await run.phase(OUR_IDS_PHASE_MS, () => runOurIds(run));
        const monthlyAt = (debates.cursor?.monthly as Row | undefined)?.at;
        if (run.timeLeft() > RESERVE_MS * 2 && due(debates, MONTHLY_EVERY_MS, monthlyAt ?? '1970-01-01')) results.monthly = await run.phase(MONTHLY_PHASE_MS, () => runMonthly(run));
      }
      // 4. Questions start once the speeches backfill has finished, and only while time is left in this run.
      const sp = await run.state('speeches');
      // The weekly catch-up from the owner's Mac holds the questions while it runs (ENTRY 216): leave them to it.
      const catchupUntil = await catchupLockedUntil(db);
      if (catchupUntil) results.questions = `skipped: the catch-up holds the questions until ${catchupUntil}`;
      else if (sp.finished_at && run.timeLeft() > RESERVE_MS * 2) {
        // Newly tabled questions first (ENTRY 211, 17 Nov 2026): the last 3 days' list pages, each question not yet held
        // stored from its page when it is whole there, else read on its own; held questions are left to the answered and
        // unanswered passes. The answered step then has what is left of the run.
        const q = await run.state('questions');
        const qTopUpDue = !!q.cursor?.top_up || due(q, TOP_UP_EVERY_MS);
        if (!q.finished_at) results.questions = await runQuestions(run, q, START, today, false);
        else if (qTopUpDue) results.questions = await runQuestions(run, q, addDays(today, -TOP_UP_DAYS), today, true, true, true);
        const beforeAnswered = await run.state('questions');
        if (beforeAnswered.finished_at && (beforeAnswered.cursor?.answered || due(beforeAnswered, ANSWERED_EVERY_MS, beforeAnswered.cursor?.answered_ok_at ?? '1970-01-01'))) {
          results.answered = await run.phase(ANSWERED_PHASE_MS, () => runAnswered(run, beforeAnswered, null));
        }
        const beforeWeekly = await run.state('questions');
        // A part done pass carries on in any run; a new one starts only in the Sunday run.
        if (beforeWeekly.finished_at && run.timeLeft() > RESERVE_MS * 2 && (beforeWeekly.cursor?.weekly || (inWeeklyWindow(new Date()) && due(beforeWeekly, WEEKLY_EVERY_MS, beforeWeekly.cursor?.weekly_ok_at ?? '1970-01-01')))) {
          results.weekly = await run.phase(WEEKLY_PHASE_MS, () => runWeekly(run, beforeWeekly, null, today));
        }
        const beforeUnanswered = await run.state('questions');
        if (beforeUnanswered.finished_at && run.timeLeft() > RESERVE_MS * 2 && (beforeUnanswered.cursor?.unanswered || due(beforeUnanswered, UNANSWERED_EVERY_MS, beforeUnanswered.cursor?.unanswered_ok_at ?? '1970-01-01'))) {
          results.unanswered = await run.phase(UNANSWERED_PHASE_MS, () => runUnanswered(run, beforeUnanswered, today));
        }
      }
      // The debates counters, text changes and checks, on the latest saved debates state.
      await run.saveState(await run.state('debates'), false);
    }
  } finally {
    // In a finally, so rows written before a failure still reach their pages: the next pass would see nothing to refresh.
    refreshed = refreshAnswerPages(run);
    // A16 (owner rule 15 Nov 2026, ENTRY 129): the PMQs pages read speeches under the pmqs tag; refreshed when this run
    // (once a day) stored rows.
    if (!run.dry && run.answerChanges.length) refreshTables('parliament_written_questions'); // A16: lists of questions
    if (!run.dry && run.rows > 0) { revalidateTag('pmqs', 'max'); revalidateTag(TOPIC_READS_TAG, 'max'); refreshTables('hansard_debates', 'hansard_contributions'); } // and the topic pages' top askers
  }

  const partial = Object.values(results).some((r) => r === 'partial' || r === 'refused');
  const body = {
    ok: true, rows_written: run.rows, requests: run.requests, tabled_from_list: run.fromList, tabled_read_singly: run.readSingly, results, partial, dupes_dropped: run.dupes,
    debates: { with_items: run.extra.with_items, parents_filled: run.extra.parents_filled, text_changes: run.extra.changes.length },
    answers_changed: refreshed, ...(run.weekly ? { weekly: run.weekly } : {}),
    elapsed_ms: Date.now() - run.started, syncedAt: new Date().toISOString(),
    ...(run.dry ? { captured: run.captured, answer_changes: run.answerChanges } : {}),
  };
  console.log(`[sync-parliament-archive] ${body.elapsed_ms} ms, ${run.requests} requests, ${run.rows} rows, ${refreshed.rows} answers changed, ${refreshed.paths} pages refreshed, ${JSON.stringify(results)}`);
  return NextResponse.json(body);
}

export const GET = withHeartbeat(ROUTE, GET_impl);
