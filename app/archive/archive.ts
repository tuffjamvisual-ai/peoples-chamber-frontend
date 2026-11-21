// The archive (Cowork ENTRY 480 PART A, owner approved 21 Nov 2026 22:44; plan audit/archive-480/SSD-ONLY-PLAN.md). Owner
// standing rule 18:12: anything archive is SSD only, so nothing here reads Supabase: search and records come from the Mac
// (scripts/archive/archive-server.mjs, the SSD's SQLite full text index, read only) through the ngrok tunnel, called from
// this server only, per request, never cached, 5 s at most. The reader never sees the tunnel address or the keys.
// When the Mac or the tunnel does not answer, the pages say 'Archive search is offline. Please try again later.'
// Off (404) unless ARCHIVE_ENABLED is '1'; signed in readers only; noindex; not linked or in the sitemap.
//
// Settings (Vercel environment variables, set by the owner; never in git, never printed):
//   ARCHIVE_ENABLED      '1' to switch the pages on
//   NGROK_DOMAIN         the tunnel's free development domain, for example name.ngrok-free.dev (host only)
//   ARCHIVE_KEY          the archive server's key (~/opengovt-archive/secret/key on the Mac)
//   ARCHIVE_TUNNEL_AUTH  'opengovt-vercel:<password>' for ngrok's basic auth (~/opengovt-archive/secret/ngrok-pass)
import 'server-only';
import { connection } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { clientIp } from '@/lib/email-limits';
import datasetsFile from '../../scripts/archive/datasets.json';

// connection(): decided per request, never at build time, so these pages are never saved or cached.
export async function archiveEnabled() {
  await connection();
  return process.env.ARCHIVE_ENABLED === '1';
}

export const ID_RE = /^\d{1,9}$/;
export const OFFLINE = 'Archive search is offline. Please try again later.';
export const PAGE_SIZE = 20;
export const MAX_PAGE = 24;

export type ArchiveHit = { id: number; dataset: string; title: string; date: string; url: string; snippet: string };
export type ArchiveRecord = { id: number; dataset: string; title: string; date: string; url: string; text: string; cut?: boolean };
export type Dataset = { name: string; records: number };
type Answer<T> = { ok: true; data: T } | { ok: false; reason: 'offline' | 'no words' | 'not found' };

// One call to the Mac: GET only, the key and the tunnel's basic auth in headers, no cache, no redirects, 5 s at most.
// Never throws. 400 'no words' and 404 are passed on; anything else (not configured, timeout, 401, 429, 5xx) is offline.
async function callMac<T>(pathAndQuery: string): Promise<Answer<T>> {
  const domain = process.env.NGROK_DOMAIN;
  const key = process.env.ARCHIVE_KEY;
  // Local tests only (T2: test locally, not through the tunnel): in development, ARCHIVE_LOCAL_PORT points at the server
  // on this Mac. Ignored in production builds.
  const local = process.env.NODE_ENV === 'development' && /^\d{4,5}$/.test(process.env.ARCHIVE_LOCAL_PORT || '') ? `http://127.0.0.1:${process.env.ARCHIVE_LOCAL_PORT}` : null;
  if (!key || (!local && (!domain || !/^[a-z0-9-]+\.ngrok-free\.(app|dev)$/.test(domain)))) return { ok: false, reason: 'offline' };
  const h: Record<string, string> = { 'x-archive-key': key, 'ngrok-skip-browser-warning': '1', accept: 'application/json' };
  const basic = process.env.ARCHIVE_TUNNEL_AUTH;
  if (basic) h.authorization = `Basic ${btoa(basic)}`;
  try {
    const res = await fetch(`${local ?? `https://${domain}`}${pathAndQuery}`, { headers: h, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return { ok: false, reason: 'not found' };
    if (res.status === 400) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: b.error === 'no words' ? 'no words' : 'not found' };
    }
    if (!res.ok) return { ok: false, reason: 'offline' };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

export async function archiveSearch(q: string, dataset: string, page: number) {
  const p = new URLSearchParams({ q, page: String(page) });
  if (dataset) p.set('dataset', dataset);
  const a = await callMac<{ hits: ArchiveHit[]; more: boolean; page: number }>(`/search?${p}`);
  if (a.ok && !Array.isArray(a.data.hits)) return { ok: false as const, reason: 'offline' as const };
  return a;
}

export async function archiveRecord(id: string) {
  const a = await callMac<ArchiveRecord>(`/r/${id}`);
  if (a.ok && (String(a.data.id) !== id || typeof a.data.text !== 'string')) return { ok: false as const, reason: 'offline' as const };
  return a;
}

// The dataset names for the filter: the same file the Mac server reads (scripts/archive/datasets.json), bundled here, so a
// search page costs one tunnel request, not two.
export const DATASETS: Dataset[] = datasetsFile.datasets;

// The licence line for a record's dataset: Parliament's own material under the Open Parliament Licence, the rest under the
// Open Government Licence (each dataset's terms are in the archive's catalogue on the SSD).
export const OPL = { label: 'Open Parliament Licence v3.0', href: 'https://www.parliament.uk/site-information/copyright-parliament/open-parliament-licence/', note: 'Contains Parliamentary information licensed under the Open Parliament Licence v3.0.' };
export const OGL = { label: 'Open Government Licence v3.0', href: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', note: 'Contains public sector information licensed under the Open Government Licence v3.0.' };
export const licenceFor = (dataset: string) => (/Hansard|TheyWorkForYou|Written|Petitions|Parliament/.test(dataset) ? OPL : OGL);

export const longDate = (iso: string) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// Behind sign up (Cowork ENTRY 480 ADDENDUM): the site's own signed session cookie, checked here on the server for every
// archive search and record, before any call to the Mac. null: signed out.
export async function archiveUserId(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

// Rate limits, per signed in user and per visitor (address, hashed, never stored or logged), in this server instance's
// memory: a sliding minute and a sliding day. Vercel runs several instances, so the real ceiling is a few times these; the
// Mac server's own limit (5 a second, 600 a minute in all) and ngrok's free plan (20,000 requests a month) hold whatever
// happens. Over a limit: no call to the Mac, a message instead.
const LIMITS = { search: { minute: 30, day: 500 }, record: { minute: 20, day: 300 } } as const;
const seen = new Map<string, number[]>();
function over(key: string, perMinute: number, perDay: number, now: number) {
  const list = (seen.get(key) ?? []).filter((t) => t > now - 86_400_000);
  const lastMinute = list.filter((t) => t > now - 60_000).length;
  if (lastMinute >= perMinute || list.length >= perDay) { seen.set(key, list); return true; }
  list.push(now);
  seen.set(key, list);
  if (seen.size > 20_000) for (const k of [...seen.keys()].slice(0, 5_000)) seen.delete(k);
  return false;
}
export async function archiveLimited(kind: 'search' | 'record', userId: number): Promise<boolean> {
  const now = Date.now();
  const ip = clientIp(await headers());
  const visitor = createHash('sha256').update(`archive:${ip}`).digest('base64url').slice(0, 16);
  const l = LIMITS[kind];
  const u = over(`${kind}:u:${userId}`, l.minute, l.day, now);
  const v = over(`${kind}:v:${visitor}`, l.minute, l.day, now);
  return u || v;
}
