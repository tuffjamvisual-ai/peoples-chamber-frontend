// Timed database reads for the pages that set fetchCache = 'default-cache' (owner, 30 Oct 2026): /, /departments/[slug],
// /councils/[slug] and /parties/[slug]/money.
//
// Why: under fetchCache = 'default-cache', Next keeps a fetch that has no revalidate of its own FOR EVER
// (INFINITE_CACHE in next/dist/server/lib/patch-fetch.js), untagged except for the page's own path, and the entry
// survives deploys. The hourly or 6 hourly rebuild of the page then reads the same old rows again: the front page's
// "Latest from Whitehall" list stayed on the morning's releases, and a council page kept an old byelection row. Only a
// revalidatePath of that page cleared them.
//
// How: each of those pages calls setPageReadTimer(<its revalidate>) at the top of the page (and of generateMetadata).
// During that render, pageDb() returns a client whose reads carry next.revalidate = that timer (and any tags given), so
// they stay in the data cache, which survives deploys, but never longer than the page's own period; a stale entry is
// read again before the page is stored. On every other page, and in route handlers, pageDb() is the plain client, so
// shared helpers behave there exactly as before. The timer lives in React's per request cache().
//
// Do not use pageDb() inside unstable_cache: an inner fetch with its own timer would be kept in the fetch cache too, and
// a tag refresh of the unstable_cache would then read that kept copy again.
import 'server-only';
import { cache } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { fetchWithoutEmDashes } from './no-em-dash';
import { tableTag } from './source-tags';

const clients = new Map<string, SupabaseClient>();

// A client whose every read is cached for `seconds`, under `tags` when given.
export function timedClient(seconds: number, tags: string[] = []): SupabaseClient {
  const key = `${seconds}|${tags.join(',')}`;
  let client = clients.get(key);
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
      global: {
        headers: { 'x-my-custom-header': 'peoples-chamber' },
        fetch: (input, init) => fetchWithoutEmDashes(input, { ...init, next: { revalidate: seconds, ...(tags.length ? { tags } : {}) } }),
      },
    });
    clients.set(key, client);
  }
  return client;
}

const pageTimer = cache((): { seconds: number } => ({ seconds: 0 }));

// Called by the four pages above with their own revalidate value.
export function setPageReadTimer(seconds: number) {
  pageTimer().seconds = seconds;
}

// The client for a read that may run on one of those pages: timed there, plain everywhere else. `tags`: refreshed by the
// sync that writes the data.
export function pageDb(tags: string[] = []): SupabaseClient {
  const { seconds } = pageTimer();
  return seconds > 0 ? timedClient(seconds, tags) : supabase;
}

// Tags refreshed by the syncs that write the data (option a: the sync knows exactly when it changed something).
export const GOVUK_DEPT_TAG = 'govuk-dept';                 // dept_ministers, dept_officials, dept_agencies: /api/sync-govuk-data
export const DONATIONS_TAG = 'political-donations';         // political_donations: the Electoral Commission sync and sweep

// A16 (owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129): a client whose reads stay in the shared data cache with no timer,
// each under its table's tag (lib/source-tags.ts tableTag) and any tags given, so a page using it is rebuilt only when a
// sync refreshes one of those tags (or on a deploy). In place of pageDb() on pages that follow the rule.
const foreverClients = new Map<string, SupabaseClient>();
function foreverClient(tags: string[]): SupabaseClient {
  const key = tags.join(',');
  let client = foreverClients.get(key);
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
      global: {
        headers: { 'x-my-custom-header': 'peoples-chamber' },
        fetch: (input, init) => fetchWithoutEmDashes(input, { ...init, next: { revalidate: false, tags } }),
      },
    });
    foreverClients.set(key, client);
  }
  return client;
}
export function tagDb(tags: string[] = []): { from: SupabaseClient['from']; rpc: SupabaseClient['rpc'] } {
  return {
    from: ((table: string) => foreverClient([...new Set([...tags, tableTag(table)])]).from(table)) as SupabaseClient['from'],
    rpc: ((fn: string, args?: Record<string, unknown>, opts?: Record<string, unknown>) => foreverClient([...new Set([...tags, tableTag(`rpc:${fn}`)])]).rpc(fn, args, opts as never)) as SupabaseClient['rpc'],
  };
}

// Every read on a council page carries this tag too: no council sync knows which council changed (each loads a national
// release), so a real new release refreshes them all (lib/council-refresh.ts, and the queued refresh after a script).
export const COUNCIL_DATA_TAG = 'council-data';
