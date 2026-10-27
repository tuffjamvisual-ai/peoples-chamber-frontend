// Saved searches for the signed in member (job 74 Part 5): up to 20, their alerts off by default. The member comes only
// from the session cookie; every read and write is on their own rows (lib/member-data.ts).
//   GET                                   the member's saved searches
//   POST {q, type, dept, from, to, sort, consent}   save the search; the first saved item needs consent: true
//   PATCH {id, alert}                     turn the weekly alert for one search on or off
//   DELETE {id}                           delete one
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';
import { addSavedSearch, listSavedSearches, removeSavedSearch, setSavedSearchAlert, type SavedSearchFilters } from '@/lib/member-data';
import { badRequest, readJson, resultResponse, unauthorised } from '@/lib/member-http';
import { VALID_SEARCH_TYPES } from '@/lib/search-content';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  return resultResponse(await listSavedSearches(supabaseAdmin, userId), (searches) => ({ searches }));
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const b = await readJson(request);
  const q = typeof b?.q === 'string' ? b.q.trim() : '';
  if (q.length < 2 || q.length > 200) return badRequest();
  // Only the filters /search itself reads, each checked, so a saved search always reruns as the same search.
  const filters: SavedSearchFilters = {};
  if (typeof b?.type === 'string' && b.type !== 'all' && (VALID_SEARCH_TYPES as readonly string[]).includes(b.type)) filters.type = b.type;
  if (typeof b?.dept === 'string' && /^[a-z0-9-]{1,80}$/.test(b.dept)) filters.dept = b.dept;
  if (typeof b?.from === 'string' && DATE.test(b.from)) filters.from = b.from;
  if (typeof b?.to === 'string' && DATE.test(b.to)) filters.to = b.to;
  if (b?.sort === 'newest') filters.sort = 'newest';
  return resultResponse(await addSavedSearch(supabaseAdmin, userId, q, filters, b?.consent === true), (id) => ({ id }));
}

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const b = await readJson(request);
  const id = Number(b?.id);
  if (!Number.isSafeInteger(id) || id <= 0 || typeof b?.alert !== 'boolean') return badRequest();
  return resultResponse(await setSavedSearchAlert(supabaseAdmin, userId, id, b.alert), () => ({ alert: b.alert }));
}

export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const b = await readJson(request);
  const id = Number(b?.id);
  if (!Number.isSafeInteger(id) || id <= 0) return badRequest();
  return resultResponse(await removeSavedSearch(supabaseAdmin, userId, id), () => ({ deleted: true }));
}
