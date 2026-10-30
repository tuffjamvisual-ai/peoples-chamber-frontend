// Weekly cron — pulls APPG data from mySociety/appg-membership and
// refreshes appgs + appg_officers + appg_funders.
//
// Same parsing logic as scripts/sync-appgs.js (kept in sync; the CLI
// script remains the canonical implementation for ad-hoc re-runs).
//
// Schedule: '47 14 * * 1' (Monday 14:47 UTC) — after the activity
// and standards committee crons. mySociety's repo updates as the
// Parliament Register updates so weekly is comfortable.

import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS, isPoliteStop } from '@/lib/sync-budget';
import { refreshMps, isDryRun, sameValue } from '@/lib/mp-refresh';
import { noteChanged } from '@/lib/refresh-count';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

const TREE_URL = 'https://api.github.com/repos/mysociety/appg-membership/git/trees/main?recursive=1';
const RAW_BASE = 'https://raw.githubusercontent.com/mysociety/appg-membership/main';

type AppgJson = {
  slug?: string;
  title?: string;
  purpose?: string | null;
  category?: string | null;
  parliament?: string | null;
  contact_details?: {
    secretariat?: string;
    registered_contact_name?: string;
    website?: { url?: string; status?: string };
  };
  registrable_benefits?: string | null;
  agm?: {
    date_of_most_recent_agm?: string;
    reporting_year?: string;
    next_reporting_deadline?: string;
  };
  source_url?: string;
  categories?: string[];
  officers?: Array<{
    role?: string;
    name?: string;
    party?: string;
    mnis_id?: string | null;
    removed?: boolean;
  }>;
  detailed_benefits?: Array<{
    Source?: string;
    Description?: string;
    'Value £s In bands of £1,500'?: string;
    Received?: string;
    Registered?: string;
    benefit_type?: string;
  }>;
};

function parseUkDate(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const m2 = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m2) {
    let [, dd, mo, y] = m2;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

async function fetchJson(url: string) {
  const res = await politeFetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

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
  const TIME_BUDGET = 200_000;

  // 1. Fetch the file index
  const tree = await fetchJson(TREE_URL) as { tree?: Array<{ path: string }> };
  const files = (tree.tree || [])
    .filter((t) => t.path.startsWith('data/appgs/') && t.path.endsWith('.json'))
    .map((t) => t.path);

  // 2. Concurrent download
  const CONCURRENCY = 12;
  const queue = [...files];
  const appgs: Array<Record<string, unknown>> = [];
  const officers: Array<Record<string, unknown>> = [];
  const funders: Array<Record<string, unknown>> = [];

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() - startedAt > TIME_BUDGET) return;
      const path = queue.shift();
      if (!path) return;
      try {
        const d = await fetchJson(`${RAW_BASE}/${path}`) as AppgJson;
        const slug = d.slug || path.replace(/^data\/appgs\//, '').replace(/\.json$/, '');

        let secretariat: string | null = null, secretariatUrl: string | null = null;
        if (d.contact_details?.secretariat) {
          const sm = String(d.contact_details.secretariat);
          const urlM = sm.match(/(https?:\/\/[^\s]+)/);
          secretariatUrl = urlM ? urlM[1] : null;
          const beforeUrl = urlM ? sm.slice(0, urlM.index).trim() : sm;
          // Strip boilerplate suffix so the same lobby firm doesn't split.
          secretariat = beforeUrl
            .replace(/\s*acts\s+as\s+the\s+group['’]?s\s+secretariat\.?\s*$/i, '')
            .trim();
        }

        appgs.push({
          slug,
          title: d.title || slug,
          purpose: d.purpose ?? null,
          category: d.category ?? null,
          parliament: d.parliament ?? 'uk',
          secretariat,
          secretariat_url: secretariatUrl,
          registered_contact: d.contact_details?.registered_contact_name ?? null,
          registrable_benefits: d.registrable_benefits ?? null,
          agm_date: parseUkDate(d.agm?.date_of_most_recent_agm),
          reporting_year: d.agm?.reporting_year ?? null,
          next_reporting_deadline: parseUkDate(d.agm?.next_reporting_deadline),
          website_url: d.contact_details?.website?.url ?? null,
          website_status: d.contact_details?.website?.status ?? null,
          categories: Array.isArray(d.categories) ? d.categories : [],
          source_url: d.source_url ?? null,
          scraped_at: new Date().toISOString(),
        });

        for (const o of d.officers || []) {
          const mnis = o.mnis_id ? parseInt(o.mnis_id, 10) : null;
          officers.push({
            appg_slug: slug,
            member_id: Number.isFinite(mnis) ? mnis : null,
            name_at_time: o.name || '(unknown)',
            party: o.party ?? null,
            role: o.role || 'Officer',
            removed: !!o.removed,
          });
        }
        for (const b of d.detailed_benefits || []) {
          funders.push({
            appg_slug: slug,
            source: b.Source || '(unspecified)',
            description: b.Description ?? null,
            value_band: b['Value £s In bands of £1,500'] ?? null,
            received_date: parseUkDate(b.Received),
            registered_date: parseUkDate(b.Registered),
            benefit_type: b.benefit_type ?? d.registrable_benefits ?? null,
          });
        }
      } catch (e) {
        if (isPoliteStop(e)) throw e; // a 429 or the time budget: stop cleanly (lib/sync-budget.ts)
        console.error(`appgs sync: ${path}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 3. Write only what changed (owner, 30 Oct 2026, cache Stage 2a part 3; until then every APPG was upserted and every
  // officer and funder deleted and inserted again, even when the time budget had cut the download short). An APPG
  // whose row changed is upserted; one whose officers or funders changed has just its own officers or funders replaced.
  // APPGs gone from the source lose their officers and funders only when every file was read. The MPs who are
  // officers of a changed APPG (before or after) have their pages refreshed. ?dry=1 (local tests only) writes nothing.
  const dry = isDryRun(req);
  const readAllRows = async (table: string, cols: string) => {
    const out: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select(cols).order('id').range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (!data || data.length < 1000) return out;
    }
  };
  const APPG_COLS = Object.keys(appgs[0] ?? {}).filter((k) => k !== 'scraped_at');
  const OFF_COLS = ['member_id', 'name_at_time', 'party', 'role', 'removed'];
  const FUND_COLS = ['source', 'description', 'value_band', 'received_date', 'registered_date', 'benefit_type'];
  let storedAppgs: Record<string, unknown>[], storedOff: Record<string, unknown>[], storedFund: Record<string, unknown>[];
  try {
    [storedAppgs, storedOff, storedFund] = await Promise.all([
      (async () => { const out: Record<string, unknown>[] = []; for (let from = 0; ; from += 1000) { const { data, error } = await supabase.from('appgs').select(['slug', ...APPG_COLS].join(', ')).order('slug').range(from, from + 999); if (error) throw new Error(`appgs: ${error.message}`); out.push(...((data ?? []) as unknown as Record<string, unknown>[])); if (!data || data.length < 1000) return out; } })(),
      readAllRows('appg_officers', ['appg_slug', ...OFF_COLS].join(', ')),
      readAllRows('appg_funders', ['appg_slug', ...FUND_COLS].join(', ')),
    ]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, stage: 'read stored' }, { status: 500 });
  }
  const pickCols = (r: Record<string, unknown>, cols: string[]) => Object.fromEntries(cols.map((c) => [c, r[c] ?? null]));
  const group = (rows: Record<string, unknown>[], cols: string[]) => {
    const m = new Map<string, Record<string, unknown>[]>();
    for (const r of rows) { const k = r.appg_slug as string; if (!m.has(k)) m.set(k, []); m.get(k)!.push(pickCols(r, cols)); }
    return m;
  };
  // Order does not matter for officers and funders: compared as sorted lists.
  const sameSet = (a: Record<string, unknown>[] = [], b: Record<string, unknown>[] = []) =>
    a.length === b.length && sameValue(a.map((x) => JSON.stringify(x)).sort(), b.map((x) => JSON.stringify(x)).sort());
  const appgBy = new Map(storedAppgs.map((r) => [r.slug as string, r]));
  const offOld = group(storedOff, OFF_COLS), offNew = group(officers, OFF_COLS);
  const fundOld = group(storedFund, FUND_COLS), fundNew = group(funders, FUND_COLS);
  const changedAppgs = appgs.filter((a) => { const o = appgBy.get(a.slug as string); return !o || !sameValue(pickCols(o, APPG_COLS), pickCols(a, APPG_COLS)); });
  const fetched = new Set(appgs.map((a) => a.slug as string));
  const complete = appgs.length === files.length;
  const offChanged = [...fetched].filter((slug) => !sameSet(offOld.get(slug), offNew.get(slug)));
  const fundChanged = [...fetched].filter((slug) => !sameSet(fundOld.get(slug), fundNew.get(slug)));
  const goneSlugs = complete ? [...new Set([...offOld.keys(), ...fundOld.keys()])].filter((slug) => !fetched.has(slug)) : [];
  const touched = new Set([...changedAppgs.map((a) => a.slug as string), ...offChanged, ...fundChanged, ...goneSlugs]);
  const changedMps = new Set<number>();
  for (const slug of touched) for (const r of [...(offOld.get(slug) ?? []), ...(offNew.get(slug) ?? [])]) if (typeof r.member_id === 'number') changedMps.add(r.member_id);

  const upBATCH = 200;
  let appgsUp = 0;
  let offUp = 0;
  let fundUp = 0;
  if (!dry) {
    for (let i = 0; i < changedAppgs.length; i += upBATCH) {
      const slice = changedAppgs.slice(i, i + upBATCH);
      const { error } = await supabase.from('appgs').upsert(slice, { onConflict: 'slug' });
      if (error) return NextResponse.json({ error: error.message, stage: 'appgs', written: appgsUp }, { status: 500 });
      appgsUp += slice.length;
    }
    const replace = async (table: string, slugs: string[], rows: Record<string, unknown>[]) => {
      let n = 0;
      for (let i = 0; i < slugs.length; i += 100) {
        const part = slugs.slice(i, i + 100);
        const { error: dErr } = await supabase.from(table).delete().in('appg_slug', part);
        if (dErr) throw new Error(`${table} delete: ${dErr.message}`);
        const set = new Set(part);
        const add = rows.filter((r) => set.has(r.appg_slug as string));
        for (let j = 0; j < add.length; j += 500) {
          const { error } = await supabase.from(table).insert(add.slice(j, j + 500));
          if (error) throw new Error(`${table} insert: ${error.message}`);
          n += add.slice(j, j + 500).length;
        }
      }
      return n;
    };
    try {
      offUp = await replace('appg_officers', [...offChanged, ...goneSlugs], officers);
      fundUp = await replace('appg_funders', [...fundChanged, ...goneSlugs], funders);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message, stage: 'officers or funders' }, { status: 500 });
    }
  }
  noteChanged(dry ? 0 : changedMps.size);
  const mpRefresh = !dry && changedMps.size ? refreshMps(changedMps) : null;

  return NextResponse.json({
    ok: true,
    appgs: appgsUp,
    officers: offUp,
    funders: fundUp,
    files_seen: files.length,
    complete,
    appgs_changed: touched.size,
    mps_changed: changedMps.size,
    mp_refresh: mpRefresh,
    ...(dry ? { dry_run: true } : {}),
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}

export const GET = withHeartbeat('/api/sync-appgs', GET_impl);
