// Members' weekly digest (job 74, design in report 72 section 1). Run daily by /api/send-member-digests.
//
// - One email a week per member, combining everything they follow and the saved searches they asked alerts for, and
//   only when something changed. Members are spread across the week by member_alert_settings.send_day.
// - Hard cap of 60 digests a day (DAILY_CAP), counted from alert_log. Once reached, the rest are logged
//   'budget_reached' and go the next day. No member gets two digests within 6 days.
// - What counts as new, since the member last heard about that follow (or since they followed it):
//     MP     new Commons votes (mp_division_votes.created_at), new interests on the register
//            (mp_registered_interests.first_seen_date), new expenses claims (mp_expenses_detail.first_seen_at, from
//            migration 2026-10-27d). MPs' new roles are left out: the site keeps no role history for MPs.
//     bill   a new stage (compared with the stage last reported, kept in last_state) and new Commons and Lords votes.
//     donor  new donations published by the Electoral Commission (political_donations.published_date).
//     saved search (alert on)  up to 5 results not in the search's results last time.
//   Date-only sources (interests, donations) are read from the last day reported and the items already reported are
//   kept in last_state, so nothing is reported twice or missed at a day's edge.
// - A digest holds at most MAX_ITEMS items. Nothing is guessed: a follow whose source cannot be read is skipped for
//   that run (logged), and its state is not moved on, so it is reported next time.
// - Captured sends for tests: the sender is passed in (scripts/checks/member-digest-test.ts), so a test never emails.

import type { SupabaseClient } from '@supabase/supabase-js';
import { searchContent } from '@/lib/search-content';
import { followHref } from '@/lib/follow-targets';
import { unsubscribeToken, type FollowKind, type SavedSearchFilters } from '@/lib/member-data';
import { hashToken } from '@/lib/auth-tokens';
import type { SendResult } from '@/lib/email';

export const DAILY_CAP = 60;
export const MAX_ITEMS = 20;
export const MIN_DAYS_BETWEEN = 6;
export const SAVED_SEARCH_NEW_MAX = 5;
const SEEN_MAX = 200;
const LOG_KEEP_MONTHS = 12;
// Migration 2026-10-27d gave every existing expenses line this first_seen_at (committed 12:18:08 UTC); lines stamped
// then were already there, so only later ones can be new.
const EXPENSES_FIRST_SEEN_FROM = '2026-10-27T12:19:00Z';
const SITE = 'https://www.opengovt.uk';

export type DigestItem = { heading: string; href: string; lines: string[] };
export type FollowRow = { id: number; user_id: number; kind: FollowKind; target_key: string; target_label: string; last_state: Record<string, unknown> | null; last_notified_at: string | null; created_at: string };
export type SearchRow = { id: number; user_id: number; label: string; query: string; filters: SavedSearchFilters; seen_keys: string[]; last_run_at: string | null; created_at: string };
export type Candidate = { userId: number; email: string };
export type Change = { item: DigestItem; save: () => Promise<void> };
export type Sender = (msg: { to: string; subject: string; text: string; html: string; unsubscribeUrl: string }) => Promise<SendResult>;

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
const money = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const ukDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); // YYYY-MM-DD
const ukWeekday = (d: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short' }));
const sinceOf = (r: { last_notified_at?: string | null; last_run_at?: string | null; created_at: string }) => r.last_notified_at ?? r.last_run_at ?? r.created_at;
const keepLast = (xs: string[]) => xs.slice(-SEEN_MAX);
const tidy = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return (r.data ?? []) as T;
}

// The change for one follow, or null when nothing is new. Throws when a source cannot be read.
export async function followChange(db: SupabaseClient, f: FollowRow, now: Date): Promise<Change | null> {
  const since = sinceOf(f);
  const sinceDay = since.slice(0, 10);
  const state = f.last_state ?? {};
  const lines: string[] = [];
  const next: Record<string, unknown> = { ...state };
  const href = SITE + followHref(f.kind, f.target_key);

  if (f.kind === 'mp') {
    const id = Number(f.target_key);
    const votes = must(await db.from('mp_division_votes').select('division_id, division_title, vote_type').eq('member_id', id).gt('created_at', since).order('created_at', { ascending: false }).limit(200), 'votes') as { division_id: number | null; division_title: string | null; vote_type: string | null }[];
    if (votes.length) {
      const how = (t: string | null) => (t === 'aye' || t === 'AyeVote' ? 'Aye' : t === 'no' || t === 'NoVote' ? 'No' : t === 'both' ? 'Voted both ways' : 'Voted');
      const shown = votes.slice(0, 3).map((v) => `${how(v.vote_type)}: ${tidy(v.division_title) || 'a Commons division'}`);
      lines.push(`Voted in ${plural(votes.length, 'Commons division')}${votes.length >= 200 ? ' or more' : ''}.`, ...shown);
    }
    const seenInterests = new Set((state.interests as string[] | undefined) ?? []);
    const interests = (must(await db.from('mp_registered_interests').select('interest_id, category_name, interest_text').eq('member_id', id).gte('first_seen_date', sinceDay).order('first_seen_date', { ascending: false }).limit(50), 'interests') as { interest_id: number; category_name: string | null; interest_text: string | null }[])
      .filter((r) => !seenInterests.has(String(r.interest_id)));
    if (interests.length) {
      lines.push(`${plural(interests.length, 'new entry', 'new entries')} on the Register of Members' Financial Interests.`);
      for (const r of interests.slice(0, 3)) lines.push(`${r.category_name ?? 'Interest'}: ${(r.interest_text ?? '').replace(/\s+/g, ' ').slice(0, 140)}`);
      next.interests = keepLast([...seenInterests, ...interests.map((r) => String(r.interest_id))]);
    }
    const claims = must(await db.from('mp_expenses_detail').select('claim_number, amount_claimed').eq('member_id', id).gt('first_seen_at', since > EXPENSES_FIRST_SEEN_FROM ? since : EXPENSES_FIRST_SEEN_FROM).limit(1000), 'expenses') as { claim_number: string | null; amount_claimed: number | string | null }[];
    if (claims.length) {
      const n = new Set(claims.map((c) => c.claim_number)).size;
      const total = claims.reduce((s, c) => s + (Number(c.amount_claimed) || 0), 0);
      lines.push(`${plural(n, 'new expenses claim')} published by IPSA, ${money(total)} claimed.`);
    }
  } else if (f.kind === 'bill') {
    const id = Number(f.target_key);
    const bill = must(await db.from('bill').select('current_stage, stage_date').eq('id', id).maybeSingle(), 'bill') as { current_stage: string | null; stage_date: string | null } | null;
    if (bill && bill.current_stage && bill.current_stage !== state.stage) {
      const on = bill.stage_date && !Number.isNaN(Date.parse(bill.stage_date)) ? ` (${fmtDay(bill.stage_date)})` : '';
      lines.push(`New stage: ${bill.current_stage}${on}.`);
      next.stage = bill.current_stage;
      next.stageDate = bill.stage_date;
    }
    const commons = must(await db.from('mp_division_votes').select('division_id, division_title').eq('bill_id', id).gt('created_at', since).order('created_at', { ascending: false }).limit(2000), 'bill votes') as { division_id: number | null; division_title: string | null }[];
    const divisions = new Map<string, string>();
    for (const v of commons) divisions.set(String(v.division_id ?? v.division_title), tidy(v.division_title) || 'a Commons division');
    if (divisions.size) lines.push(`${plural(divisions.size, 'new Commons vote')}: ${[...divisions.values()].slice(0, 3).join('; ')}.`);
    const lords = must(await db.from('lords_divisions').select('division_id, title').eq('bill_id', id).gt('created_at', since).limit(50), 'lords votes') as { division_id: number; title: string | null }[];
    if (lords.length) lines.push(`${plural(lords.length, 'new Lords vote')}: ${lords.slice(0, 3).map((d) => tidy(d.title) || 'a Lords division').join('; ')}.`);
  } else {
    const names = ((state.names as string[] | undefined) ?? []).slice(0, 300);
    const seen = new Set((state.refs as string[] | undefined) ?? []);
    const rows: { ec_ref: string | null; amount: number | string | null; recipient_name: string | null; published_date: string | null }[] = [];
    for (let i = 0; i < names.length; i += 100) {
      rows.push(...must(await db.from('political_donations').select('ec_ref, amount, recipient_name, published_date').in('donor_name', names.slice(i, i + 100)).gte('published_date', sinceDay).limit(200), 'donations') as typeof rows);
    }
    const fresh = rows.filter((r) => r.ec_ref && !seen.has(r.ec_ref));
    if (fresh.length) {
      const total = fresh.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      lines.push(`${plural(fresh.length, 'new donation')} published by the Electoral Commission, ${money(total)} in all.`);
      for (const r of fresh.slice(0, 3)) lines.push(`${money(Number(r.amount) || 0)} to ${tidy(r.recipient_name) || 'a recipient'}${r.published_date ? `, published ${fmtDay(r.published_date)}` : ''}.`);
      next.refs = keepLast([...seen, ...fresh.map((r) => r.ec_ref as string)]);
    }
  }

  if (!lines.length) return null;
  return {
    item: { heading: f.target_label, href, lines },
    save: async () => {
      const { error } = await db.from('member_follows').update({ last_state: next, last_notified_at: now.toISOString() }).eq('id', f.id).eq('user_id', f.user_id);
      if (error) throw new Error(`member_follows update: ${error.message}`);
    },
  };
}

export async function savedSearchChange(db: SupabaseClient, s: SearchRow, now: Date): Promise<Change | null> {
  const f = s.filters ?? {};
  const results = await searchContent(s.query, f.type ?? 'all', f.dept ?? null, f.from ?? null, f.to ?? null, 'newest');
  const seen = new Set(s.seen_keys ?? []);
  const fresh = results.filter((r) => !seen.has(r.url));
  const save = async () => {
    const { error } = await db.from('saved_searches').update({ seen_keys: keepLast([...seen, ...results.map((r) => r.url)].filter((v, i, a) => a.indexOf(v) === i)), last_run_at: now.toISOString() }).eq('id', s.id).eq('user_id', s.user_id);
    if (error) throw new Error(`saved_searches update: ${error.message}`);
  };
  // The first run of a new saved search only records what is there: everything would otherwise be "new".
  if (!s.last_run_at && !s.seen_keys?.length) { await save(); return null; }
  if (!fresh.length) return null;
  const params = new URLSearchParams({ q: s.query });
  for (const [k, v] of Object.entries(f)) if (v) params.set(k, String(v));
  return {
    item: { heading: `Saved search: ${s.label}`, href: `${SITE}/search?${params}`, lines: fresh.slice(0, SAVED_SEARCH_NEW_MAX).map((r) => `${r.title} ${SITE}${r.url}`) },
    save,
  };
}

export function renderDigest(items: DigestItem[], unsubscribeUrl: string): { subject: string; text: string; html: string } {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const prefs = `${SITE}/preferences`;
  const subject = `Open Govt: ${plural(items.length, 'update')} on what you follow`;
  const text =
    `What changed this week on the pages you follow on Open Govt.\n\n` +
    items.map((i) => `${i.heading}\n${i.lines.map((l) => `  ${l}`).join('\n')}\n  ${i.href}`).join('\n\n') +
    `\n\nUnfollow anything or change these emails: ${prefs}\n` +
    `Stop these emails: ${unsubscribeUrl}\n\n` +
    `You get this because you followed these pages on opengovt.uk. One email a week at most, only when something changed.\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#14100d;max-width:600px">
    <p style="margin:0 0 18px">What changed this week on the pages you follow on Open Govt.</p>
    ${items.map((i) => `<div style="border-top:1px solid #d8d2c4;padding:12px 0">
      <p style="margin:0 0 6px;font-weight:bold"><a href="${esc(i.href)}" style="color:#7a1612">${esc(i.heading)}</a></p>
      ${i.lines.map((l) => `<p style="margin:0 0 4px;font-size:15px">${esc(l)}</p>`).join('')}
      <p style="margin:6px 0 0;font-size:15px"><a href="${prefs}" style="color:#555">Unfollow</a></p>
    </div>`).join('')}
    <p style="margin:18px 0 6px;font-size:15px;color:#333"><a href="${prefs}" style="color:#7a1612">Change these emails or what you follow</a></p>
    <p style="margin:0 0 6px;font-size:15px;color:#333"><a href="${esc(unsubscribeUrl)}" style="color:#7a1612">Stop these emails</a></p>
    <p style="margin:12px 0 0;font-size:15px;color:#555">You get this because you followed these pages on opengovt.uk. One email a week at most, only when something changed.</p>
  </div>`;
  return { subject, text, html };
}

export type RunSummary = {
  date: string; weekday: number; candidates: number; sent: number; nothingNew: number; budgetReached: number; failed: number;
  sentTodayBefore: number; skippedRecent: number; readErrors: number; stoppedByBudget: boolean; captured?: number;
};

export type DigestDeps = {
  db: SupabaseClient;
  send: Sender;
  now?: Date;
  shouldStop?: () => boolean;      // the run's time budget
  cap?: number;
  onlyUsers?: number[];            // tests: limit the run to these members
};

// The day's run. Every member table write is scoped by the member's id.
export async function runDigests(deps: DigestDeps): Promise<RunSummary> {
  const { db, send } = deps;
  const now = deps.now ?? new Date();
  const cap = deps.cap ?? DAILY_CAP;
  const date = ukDate(now);
  const weekday = ukWeekday(now);
  const summary: RunSummary = { date, weekday, candidates: 0, sent: 0, nothingNew: 0, budgetReached: 0, failed: 0, sentTodayBefore: 0, skippedRecent: 0, readErrors: 0, stoppedByBudget: false };

  // Today's sends so far (a second run on the same day continues the count).
  const sentToday = await db.from('alert_log').select('id', { count: 'exact', head: true }).eq('digest_date', date).eq('status', 'sent');
  if (sentToday.error) throw new Error(`alert_log count: ${sentToday.error.message}`);
  let sent = summary.sentTodayBefore = sentToday.count ?? 0;

  // Who is due: today's send day, plus anyone held back by the cap in the last week.
  const weekAgo = ukDate(new Date(now.getTime() - 7 * 86400_000));
  const [due, held, today, recent] = await Promise.all([
    db.from('member_alert_settings').select('user_id').eq('frequency', 'weekly').eq('send_day', weekday).limit(10000),
    db.from('alert_log').select('user_id, digest_date').eq('status', 'budget_reached').gte('digest_date', weekAgo).lt('digest_date', date).limit(10000),
    db.from('alert_log').select('user_id, status').eq('digest_date', date).limit(10000),
    db.from('alert_log').select('user_id, digest_date').eq('status', 'sent').gte('digest_date', ukDate(new Date(now.getTime() - MIN_DAYS_BETWEEN * 86400_000))).limit(10000),
  ]);
  for (const [r, what] of [[due, 'settings'], [held, 'held'], [today, 'today'], [recent, 'recent']] as const) if (r.error) throw new Error(`${what}: ${r.error.message}`);
  const doneToday = new Map((today.data ?? []).map((r) => [Number(r.user_id), String(r.status)]));
  const sentRecently = new Set((recent.data ?? []).map((r) => Number(r.user_id)));
  // A member held back before who has had a digest since is no longer owed one.
  const ids = new Set<number>((due.data ?? []).map((r) => Number(r.user_id)));
  for (const r of held.data ?? []) ids.add(Number(r.user_id));
  let userIds = [...ids].filter((id) => !(doneToday.has(id) && doneToday.get(id) !== 'budget_reached'));
  if (deps.onlyUsers) userIds = userIds.filter((id) => deps.onlyUsers!.includes(id));
  // Members still on weekly (a held back member may have turned the digest off since), with a confirmed address.
  const candidates: Candidate[] = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const chunk = userIds.slice(i, i + 200);
    const [s, u] = await Promise.all([
      db.from('member_alert_settings').select('user_id').in('user_id', chunk).eq('frequency', 'weekly'),
      db.from('users').select('id, email, email_verified').in('id', chunk),
    ]);
    if (s.error) throw new Error(`settings: ${s.error.message}`);
    if (u.error) throw new Error(`users: ${u.error.message}`);
    const weekly = new Set((s.data ?? []).map((r) => Number(r.user_id)));
    for (const r of u.data ?? []) if (weekly.has(Number(r.id)) && r.email_verified === true && r.email) candidates.push({ userId: Number(r.id), email: String(r.email) });
  }
  candidates.sort((a, b) => a.userId - b.userId);
  summary.candidates = candidates.length;

  const log = async (userId: number, status: 'sent' | 'nothing_new' | 'budget_reached' | 'failed', items: number, extra: { resend_id?: string; error?: string } = {}) => {
    const { error } = await db.from('alert_log').upsert({ user_id: userId, digest_date: date, status, items, resend_id: extra.resend_id ?? null, error: extra.error?.slice(0, 500) ?? null }, { onConflict: 'user_id,digest_date' });
    if (error) throw new Error(`alert_log write: ${error.message}`);
  };

  for (const c of candidates) {
    if (deps.shouldStop?.()) { summary.stoppedByBudget = true; break; }
    if (sentRecently.has(c.userId)) { summary.skippedRecent++; continue; }
    if (sent >= cap) { await log(c.userId, 'budget_reached', 0); summary.budgetReached++; continue; }

    const [fr, sr] = await Promise.all([
      db.from('member_follows').select('id, user_id, kind, target_key, target_label, last_state, last_notified_at, created_at').eq('user_id', c.userId).limit(100),
      db.from('saved_searches').select('id, user_id, label, query, filters, seen_keys, last_run_at, created_at').eq('user_id', c.userId).eq('alert', true).limit(20),
    ]);
    if (fr.error || sr.error) { console.error('[digest] read:', fr.error?.message ?? sr.error?.message); summary.readErrors++; continue; }
    const changes: Change[] = [];
    for (const f of (fr.data ?? []) as FollowRow[]) {
      try { const ch = await followChange(db, f, now); if (ch) changes.push(ch); } catch (e) { console.error(`[digest] follow ${f.id}:`, (e as Error).message); summary.readErrors++; }
    }
    for (const s of (sr.data ?? []) as SearchRow[]) {
      try { const ch = await savedSearchChange(db, s, now); if (ch) changes.push(ch); } catch (e) { console.error(`[digest] saved search ${s.id}:`, (e as Error).message); summary.readErrors++; }
    }
    if (!changes.length) { await log(c.userId, 'nothing_new', 0); summary.nothingNew++; continue; }

    const token = unsubscribeToken(c.userId);
    if (!token) throw new Error('SESSION_SECRET is not configured: no unsubscribe link, so no digest is sent');
    // Keep the stored hash in step with the token in the link (it changes only if SESSION_SECRET changes).
    await db.from('member_alert_settings').update({ unsubscribe_token_hash: hashToken(token) }).eq('user_id', c.userId).neq('unsubscribe_token_hash', hashToken(token));
    const shown = changes.slice(0, MAX_ITEMS);
    const unsubscribeUrl = `${SITE}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
    const msg = renderDigest(shown.map((ch) => ch.item), unsubscribeUrl);
    const r = await send({ to: c.email, ...msg, unsubscribeUrl });
    if (!r.sent) { await log(c.userId, 'failed', shown.length, { error: r.reason }); summary.failed++; continue; }
    sent++;
    summary.sent++;
    await log(c.userId, 'sent', shown.length, { resend_id: r.id });
    // Only what was in the email moves on; anything over MAX_ITEMS is reported next week.
    for (const ch of shown) {
      try { await ch.save(); } catch (e) { console.error('[digest] state:', (e as Error).message); }
    }
  }

  // Send records are kept 12 months.
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - LOG_KEEP_MONTHS);
  const { error: delErr } = await db.from('alert_log').delete().lt('digest_date', ukDate(cutoff));
  if (delErr) console.error('[digest] alert_log clean up:', delErr.message);
  return summary;
}
