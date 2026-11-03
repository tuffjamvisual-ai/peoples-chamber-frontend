// Weekly cron — pulls Committee on Standards published reports from
// committees-api.parliament.uk and upserts into mp_conduct_findings.
//
// Same parsing logic as scripts/sync-standards-committee.js (kept in
// sync; the CLI tool is preserved for ad-hoc enrichment runs and
// development).
//
// Schedule: weekly on Monday (vercel.json) — after the activity-metrics cron. Light traffic: one API call, ~100 rows, plus
// one Members API search per name that matches no current MP (3 Nov 2026).
// 27 Oct 2026 (job 79): the call has a timeout cut to the run's budget (lib/sync-budget.ts), and a 429 stops the run
// cleanly (withHeartbeat records it as a partial run; the next run reads everything again). Its one failure in the
// 14 days to 26 Oct (19 Oct, HTTP 500) came from the database while other jobs were writing.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, politeFetch } from '@/lib/sync-budget';
import { refreshMps, isDryRun, sameValue } from '@/lib/mp-refresh';
import { noteChanged } from '@/lib/refresh-count';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const COMMITTEE_ID = 290;
const PAGE_SIZE = 300;
const PUB_URL = `https://committees-api.parliament.uk/api/Publications?committeeId=${COMMITTEE_ID}&take=${PAGE_SIZE}`;

// The character class must include both a regular hyphen and an en-dash
// so we match both 'Nth Report - Name' and 'Nth Report – Name' title
// variants that the Standards Committee uses interchangeably. The
// strip-dashes-production.js script replaced the en-dash with a hyphen
// in source the first time it ran; the next time it runs it'll do the
// same again. Adding this comment as the canary for future maintainers
// (and a reminder to skip this file in the script's allow-list if it
// re-runs).
const REPORT_RE = /^(\d+(?:st|nd|rd|th)?|First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth)\s+[Rr]eport\s*[-–]\s*(.+?)$/;
const GENERIC = /^(register of interests|the house of commons standards landscape|members'?\s*staff|influencing code|standards|code of conduct|all[- ]?party parliamentary groups|rules for|precautionary exclusion|risk[- ]based|recall of mps act|house of commons commission|complaints procedure|appeals process|review of|inquiry into|alternatives to|members'? conduct)/i;

const INTERIM_RE = /^Interim Report\s*:\s*(.+)$/i;

function extractMpName(description: string | null): string | null {
  if (!description) return null;
  const m = REPORT_RE.exec(description.trim());
  if (!m) return null;
  let cand = m[2].trim();
  // "3rd Report - Interim Report: Kevin Hollinrake" (publication 55293, Oct 2026): the name follows the colon.
  const interim = INTERIM_RE.exec(cand);
  if (interim) cand = interim[1].trim();
  if (GENERIC.test(cand)) return null;
  if (cand.includes(':')) return null;
  if (cand.length > 40) return null;
  return cand
    .replace(/^(Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr)\s+/, '')
    .replace(/\s+(MP|QC|KC|CBE|OBE|MBE)\s*$/, '')
    .trim();
}

type Pub = { id: number; description?: string | null; publicationStartDate?: string | null; additionalContentUrl?: string | null; type?: { name?: string } };

// The report's readable HTML page (publications.parliament.uk) when the API gives one, else the publication page.
function reportUrl(r: Pub): string {
  const html = (r.additionalContentUrl || '').trim();
  return /^https:\/\/publications\.parliament\.uk\//.test(html) ? html : `https://committees.parliament.uk/publications/${r.id}/`;
}

// Former MPs (owner's brief, 3 Nov 2026): a name that matches no current MP is looked up in the Members API (Commons,
// current and former members). The id is used only when exactly one Commons member has that name and their Commons
// service began on or before the report date; otherwise member_id stays null and the name is logged.
const MEMBERS_SEARCH = 'https://members-api.parliament.uk/api/Members/Search';
const MEMBERS_TAKE = 20;
const HONORIFIC = /^(?:(?:Rt Hon|The Rt Hon|Sir|Dame|Dr|Ms|Mrs|Miss|Mr|Lord|Baroness)\s+)+/i;
const POSTNOMINAL = /(?:\s+(?:MP|QC|KC|CBE|OBE|MBE|PC))+\s*$/i;
const plainName = (n: string) => n.replace(HONORIFIC, '').replace(POSTNOMINAL, '').replace(/\s+/g, ' ').trim().toLowerCase();
type SearchItem = { value?: { id?: number; nameDisplayAs?: string; latestHouseMembership?: { house?: number; membershipStartDate?: string | null } | null } };
type HistoryItem = { value?: { houseMembershipHistory?: { house?: number; membershipStartDate?: string | null }[] | null } };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const startedAt = Date.now();

  // 1. Fetch publications
  const res = await politeFetch(PUB_URL, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } }, { budget: new SyncBudget(maxDuration, { started: startedAt }) });
  if (!res.ok) return NextResponse.json({ error: `committees-api HTTP ${res.status}` }, { status: 502 });
  const json = await res.json() as { items?: Pub[] };
  const reports = (json.items ?? []).filter((it) => it.type?.name === 'Report');

  type Finding = { publication_id: number; mp_name: string; date: string | null; description: string; url: string };
  const findings: Finding[] = [];
  for (const r of reports) {
    const description = r.description || '';
    const mpName = extractMpName(description);
    if (!mpName) continue;
    findings.push({
      publication_id: r.id,
      mp_name: mpName,
      date: (r.publicationStartDate || '').slice(0, 10) || null,
      description,
      url: reportUrl(r),
    });
  }

  // 2. Resolve member_id by name match against current MPs (one query), then the Members API for anyone else.
  const { data: mps, error: mpErr } = await supabase
    .from('mps')
    .select('member_id, name, display_name, current_member');
  if (mpErr) return NextResponse.json({ error: mpErr.message }, { status: 500 });
  type MpRow = { member_id: number; name: string | null; display_name: string | null; current_member: boolean | null };
  const candidates: MpRow[] = ((mps ?? []) as MpRow[]).filter((m) => m.current_member === true);

  function resolveCurrent(name: string): number | null {
    const lower = name.toLowerCase();
    let exact = candidates.find((m) => (m.display_name?.toLowerCase() === lower) || (m.name?.toLowerCase() === lower));
    if (exact) return exact.member_id;
    const fuzzy = candidates.filter((m) =>
      (m.display_name?.toLowerCase().includes(lower)) ||
      (m.name?.toLowerCase().includes(lower)),
    );
    if (fuzzy.length === 1) return fuzzy[0].member_id;
    return null;
  }

  const budget = new SyncBudget(maxDuration, { started: startedAt });
  const getJson = async <T,>(u: string): Promise<T | null> => {
    const r = await politeFetch(u, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } }, { budget });
    return r.ok ? ((await r.json()) as T) : null;
  };
  // One search per distinct name; the answer is the id or the reason it was left null.
  const formerCache = new Map<string, { id: number | null; why?: string }>();
  async function resolveFormer(name: string, reportDate: string | null): Promise<{ id: number | null; why?: string }> {
    const key = `${name}|${reportDate}`;
    const hit = formerCache.get(key);
    if (hit) return hit;
    let out: { id: number | null; why?: string };
    const found = await getJson<{ totalResults?: number; items?: SearchItem[] }>(`${MEMBERS_SEARCH}?Name=${encodeURIComponent(name)}&House=1&take=${MEMBERS_TAKE}`);
    if (!found) out = { id: null, why: 'Members API search failed' };
    else if ((found.totalResults ?? 0) > MEMBERS_TAKE) out = { id: null, why: `${found.totalResults} search results` };
    else {
      const same = (found.items ?? []).filter((i) => i.value?.id && plainName(i.value.nameDisplayAs || '') === plainName(name));
      if (same.length !== 1) out = { id: null, why: same.length ? `${same.length} Commons members share the name` : 'no Commons member with this name' };
      else {
        const v = same[0].value!;
        let starts: string[] = [];
        if (v.latestHouseMembership?.house === 1 && v.latestHouseMembership.membershipStartDate) starts = [v.latestHouseMembership.membershipStartDate];
        else {
          const h = await getJson<HistoryItem>(`https://members-api.parliament.uk/api/Members/${v.id}/History`);
          starts = (h?.value?.houseMembershipHistory ?? []).filter((m) => m.house === 1 && m.membershipStartDate).map((m) => m.membershipStartDate!);
        }
        const before = starts.some((d) => !reportDate || d.slice(0, 10) <= reportDate);
        out = before ? { id: v.id! } : { id: null, why: starts.length ? 'Commons service began after the report' : 'no Commons service found' };
      }
    }
    formerCache.set(key, out);
    return out;
  }

  let resolved = 0;
  const unresolved: { case_ref: string; name: string; why: string }[] = [];
  const rows = [];
  for (const f of findings) {
    let member_id = resolveCurrent(f.mp_name);
    if (!member_id) {
      const former = await resolveFormer(f.mp_name, f.date);
      member_id = former.id;
      if (!member_id) {
        unresolved.push({ case_ref: `pcs-cmt-${f.publication_id}`, name: f.mp_name, why: former.why || 'unmatched' });
        console.warn(`[sync-standards-committee] member_id left null for ${f.mp_name} (pcs-cmt-${f.publication_id}): ${former.why}`);
      }
    }
    if (member_id) resolved++;
    rows.push({
      member_id,
      mp_name_at_time: f.mp_name,
      case_ref: `pcs-cmt-${f.publication_id}`,
      closed_date: f.date,
      source: 'standards_committee',
      summary: f.description,
      url: f.url,
      source_published: f.date,
      scraped_at: new Date().toISOString(),
    });
  }

  // 3. Only new or changed findings are written (owner, 30 Oct 2026, cache Stage 2a part 3), and the MPs they name
  // (before and after) have their pages refreshed. ?dry=1 (local tests only) compares but writes nothing.
  const dry = isDryRun(req);
  const COLS = ['member_id', 'mp_name_at_time', 'closed_date', 'source', 'summary', 'url', 'source_published'] as const;
  const { data: stored, error: stErr } = rows.length
    ? await supabase.from('mp_conduct_findings').select(`case_ref, ${COLS.join(', ')}`).in('case_ref', rows.map((r) => r.case_ref))
    : { data: [], error: null };
  if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });
  const storedBy = new Map(((stored ?? []) as unknown as Record<string, unknown>[]).map((r) => [r.case_ref as string, r]));
  const pick = (r: Record<string, unknown>) => Object.fromEntries(COLS.map((c) => [c, typeof r[c] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r[c] as string) && c !== 'summary' && c !== 'url' ? (r[c] as string).slice(0, 10) : r[c] ?? null]));
  const changed = rows.filter((r) => { const o = storedBy.get(r.case_ref); return !o || !sameValue(pick(o), pick(r)); });
  const changedMps = new Set<number>();
  for (const r of changed) for (const m of [r.member_id, storedBy.get(r.case_ref)?.member_id]) if (typeof m === 'number') changedMps.add(m);
  if (changed.length && !dry) {
    const { error: upErr } = await supabase
      .from('mp_conduct_findings')
      .upsert(changed, { onConflict: 'case_ref' });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  noteChanged(dry ? 0 : changedMps.size);
  const mpRefresh = !dry && changedMps.size ? refreshMps(changedMps) : null;

  return NextResponse.json({
    ok: true,
    reports_seen: reports.length,
    findings_extracted: findings.length,
    member_resolved: resolved,
    upserted: dry ? 0 : changed.length,
    unchanged: rows.length - changed.length,
    mps_changed: changedMps.size,
    mp_refresh: mpRefresh,
    member_unresolved: unresolved,
    ...(dry ? {
      dry_run: true,
      would_add: changed.filter((r) => !storedBy.has(r.case_ref)).map((r) => ({ case_ref: r.case_ref, name: r.mp_name_at_time, member_id: r.member_id, url: r.url })),
      would_fill_member_id: changed.filter((r) => storedBy.has(r.case_ref) && r.member_id != null && storedBy.get(r.case_ref)!.member_id == null).map((r) => ({ case_ref: r.case_ref, name: r.mp_name_at_time, member_id: r.member_id })),
      would_change_member_id: changed.filter((r) => { const o = storedBy.get(r.case_ref); return o && o.member_id != null && o.member_id !== r.member_id; }).map((r) => ({ case_ref: r.case_ref, name: r.mp_name_at_time, from: storedBy.get(r.case_ref)!.member_id, to: r.member_id })),
      would_change_url: changed.filter((r) => { const o = storedBy.get(r.case_ref); return o && o.url !== r.url; }).length,
    } : {}),
    partial: false,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}

export const GET = withHeartbeat('/api/sync-standards-committee', GET_impl);
