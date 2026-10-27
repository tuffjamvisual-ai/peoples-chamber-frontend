// Members' follows, saved searches and digest settings (job 74, from report 72; migration 2026-10-27d).
//
// The site has its own session cookie, not Supabase Auth, so the database cannot tell which member is asking: the
// member tables have row level security on and no rights for anon or authenticated, and only these server functions
// (with the service role) read or write them. Every function takes the signed in member's id, which the routes get
// from getSessionUserId() and never from the request body, and every query on a member table filters by it. A
// member can therefore only ever see and change their own rows (tested in scripts/checks/member-data-isolation.ts).
//
// Consent: what a member follows can show their political views (special category data), so nothing is stored
// until they tick the consent box at their first follow or saved search. The tick is recorded in
// member_alert_settings.consented_at; "Delete everything" on the preferences page removes the consent with the rows.

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hashToken } from '@/lib/auth-tokens';

export const FOLLOW_KINDS = ['mp', 'bill', 'donor'] as const; // organisations later (owner's decision 4)
export type FollowKind = (typeof FOLLOW_KINDS)[number];
export const isFollowKind = (k: unknown): k is FollowKind => typeof k === 'string' && (FOLLOW_KINDS as readonly string[]).includes(k);

export const MAX_FOLLOWS = 100;
export const MAX_SAVED_SEARCHES = 20;

export type AlertSettings = { frequency: 'weekly' | 'off'; send_day: number; consented_at: string; updated_at: string };
export type Follow = { id: number; kind: FollowKind; target_key: string; target_label: string; created_at: string };
export type SavedSearch = { id: number; label: string; query: string; filters: SavedSearchFilters; alert: boolean; created_at: string; last_run_at: string | null };
export type SavedSearchFilters = { type?: string; dept?: string; from?: string; to?: string; sort?: 'relevance' | 'newest' };

export type Result<T> = { ok: true; value: T } | { ok: false; reason: 'needs_consent' | 'limit' | 'not_found' | 'error'; message?: string };

// The day of the week a member's digest goes (0 Sunday to 6 Saturday), from a stable hash of their id, so the
// members are spread across the week.
export function sendDayFor(userId: number): number {
  return crypto.createHash('sha256').update(`digest-day:${userId}`).digest().readUInt32BE(0) % 7;
}

// The one click unsubscribe token in every digest. Built from the member id with SESSION_SECRET, so it can be put in
// each email without being stored; the database keeps only its SHA-256 hash (unsubscribe_token_hash) and the
// unsubscribe route looks the member up by that hash. Null when SESSION_SECRET is missing (no digest is then sent).
export function unsubscribeToken(userId: number): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  return crypto.createHmac('sha256', secret).update(`alerts-unsubscribe:${userId}`).digest('base64url');
}

export async function getSettings(db: SupabaseClient, userId: number): Promise<Result<AlertSettings | null>> {
  const { data, error } = await db.from('member_alert_settings').select('frequency, send_day, consented_at, updated_at').eq('user_id', userId).maybeSingle();
  if (error) return { ok: false, reason: 'error', message: error.message };
  return { ok: true, value: (data as AlertSettings | null) ?? null };
}

// The consent record: created when the member ticks the box (consent true); without it nothing may be stored.
async function ensureConsent(db: SupabaseClient, userId: number, consent: boolean): Promise<Result<true>> {
  const s = await getSettings(db, userId);
  if (!s.ok) return s;
  if (s.value) return { ok: true, value: true };
  if (!consent) return { ok: false, reason: 'needs_consent' };
  const token = unsubscribeToken(userId);
  if (!token) return { ok: false, reason: 'error', message: 'SESSION_SECRET is not configured' };
  const { error } = await db.from('member_alert_settings').insert({
    user_id: userId, frequency: 'weekly', send_day: sendDayFor(userId), unsubscribe_token_hash: hashToken(token), consented_at: new Date().toISOString(),
  });
  // A second tab that consented at the same moment: the row exists, which is what was wanted.
  if (error && error.code !== '23505') return { ok: false, reason: 'error', message: error.message };
  return { ok: true, value: true };
}

export async function listFollows(db: SupabaseClient, userId: number): Promise<Result<Follow[]>> {
  const { data, error } = await db.from('member_follows').select('id, kind, target_key, target_label, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(MAX_FOLLOWS);
  if (error) return { ok: false, reason: 'error', message: error.message };
  return { ok: true, value: (data ?? []) as Follow[] };
}

export async function isFollowing(db: SupabaseClient, userId: number, kind: FollowKind, key: string): Promise<Result<{ following: boolean; consented: boolean }>> {
  const [f, s] = await Promise.all([
    db.from('member_follows').select('id').eq('user_id', userId).eq('kind', kind).eq('target_key', key).maybeSingle(),
    getSettings(db, userId),
  ]);
  if (f.error) return { ok: false, reason: 'error', message: f.error.message };
  if (!s.ok) return s;
  return { ok: true, value: { following: !!f.data, consented: !!s.value } };
}

export async function addFollow(
  db: SupabaseClient, userId: number, kind: FollowKind, key: string, label: string, state: Record<string, unknown>, consent: boolean,
): Promise<Result<true>> {
  const c = await ensureConsent(db, userId, consent);
  if (!c.ok) return c;
  const { count, error: countErr } = await db.from('member_follows').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (countErr) return { ok: false, reason: 'error', message: countErr.message };
  if ((count ?? 0) >= MAX_FOLLOWS) return { ok: false, reason: 'limit' };
  const { error } = await db.from('member_follows').insert({ user_id: userId, kind, target_key: key, target_label: label.slice(0, 300), last_state: state });
  if (error && error.code !== '23505') return { ok: false, reason: 'error', message: error.message }; // 23505: already followed
  return { ok: true, value: true };
}

export async function removeFollow(db: SupabaseClient, userId: number, kind: FollowKind, key: string): Promise<Result<true>> {
  const { error } = await db.from('member_follows').delete().eq('user_id', userId).eq('kind', kind).eq('target_key', key);
  if (error) return { ok: false, reason: 'error', message: error.message };
  return { ok: true, value: true };
}

export async function setFrequency(db: SupabaseClient, userId: number, frequency: 'weekly' | 'off'): Promise<Result<true>> {
  const { data, error } = await db.from('member_alert_settings').update({ frequency, updated_at: new Date().toISOString() }).eq('user_id', userId).select('user_id');
  if (error) return { ok: false, reason: 'error', message: error.message };
  if (!data?.length) return { ok: false, reason: 'not_found' };
  return { ok: true, value: true };
}

// "Delete everything I follow": the follows, the saved searches and the consent record. The member's send record
// (alert_log) stays, without anything followed in it, for the daily sending limit; it is kept 12 months.
export async function deleteAllFollowData(db: SupabaseClient, userId: number): Promise<Result<true>> {
  for (const table of ['member_follows', 'saved_searches', 'member_alert_settings']) {
    const { error } = await db.from(table).delete().eq('user_id', userId);
    if (error) return { ok: false, reason: 'error', message: `${table}: ${error.message}` };
  }
  return { ok: true, value: true };
}

export async function listSavedSearches(db: SupabaseClient, userId: number): Promise<Result<SavedSearch[]>> {
  const { data, error } = await db.from('saved_searches').select('id, label, query, filters, alert, created_at, last_run_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(MAX_SAVED_SEARCHES);
  if (error) return { ok: false, reason: 'error', message: error.message };
  return { ok: true, value: (data ?? []) as SavedSearch[] };
}

export async function addSavedSearch(db: SupabaseClient, userId: number, query: string, filters: SavedSearchFilters, consent: boolean): Promise<Result<number>> {
  const c = await ensureConsent(db, userId, consent);
  if (!c.ok) return c;
  const { count, error: countErr } = await db.from('saved_searches').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (countErr) return { ok: false, reason: 'error', message: countErr.message };
  if ((count ?? 0) >= MAX_SAVED_SEARCHES) return { ok: false, reason: 'limit' };
  const { data, error } = await db.from('saved_searches').insert({ user_id: userId, label: query.slice(0, 120), query, filters, alert: false }).select('id').single();
  if (error) return { ok: false, reason: 'error', message: error.message };
  return { ok: true, value: Number(data.id) };
}

export async function removeSavedSearch(db: SupabaseClient, userId: number, id: number): Promise<Result<true>> {
  const { error } = await db.from('saved_searches').delete().eq('user_id', userId).eq('id', id);
  if (error) return { ok: false, reason: 'error', message: error.message };
  return { ok: true, value: true };
}

export async function setSavedSearchAlert(db: SupabaseClient, userId: number, id: number, alert: boolean): Promise<Result<true>> {
  const { data, error } = await db.from('saved_searches').update({ alert }).eq('user_id', userId).eq('id', id).select('id');
  if (error) return { ok: false, reason: 'error', message: error.message };
  if (!data?.length) return { ok: false, reason: 'not_found' };
  return { ok: true, value: true };
}

// The member's own digest settings by unsubscribe token (one click, no sign in): turns the digest off.
export async function unsubscribeByToken(db: SupabaseClient, token: string): Promise<'unsubscribed' | 'invalid' | 'error'> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return 'invalid';
  const { data, error } = await db.from('member_alert_settings').update({ frequency: 'off', updated_at: new Date().toISOString() }).eq('unsubscribe_token_hash', hashToken(token)).select('user_id');
  if (error) return 'error';
  return data?.length ? 'unsubscribed' : 'invalid';
}
