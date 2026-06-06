// Weekly cron — pulls APPG data from mySociety/appg-membership and
// refreshes appgs + appg_officers + appg_funders.
//
// Same parsing logic as scripts/sync-appgs.js (kept in sync; the CLI
// script remains the canonical implementation for ad-hoc re-runs).
//
// Schedule: '30 14 * * 1' (Monday 14:30 UTC) — after the activity
// and standards committee crons. mySociety's repo updates as the
// Parliament Register updates so weekly is comfortable.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
          secretariat = urlM ? sm.slice(0, urlM.index).trim() : sm;
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
        console.error(`appgs sync: ${path}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 3. Write — upsert appgs, replace officers + funders wholesale
  const upBATCH = 200;
  let appgsUp = 0;
  for (let i = 0; i < appgs.length; i += upBATCH) {
    const slice = appgs.slice(i, i + upBATCH);
    const { error } = await supabase.from('appgs').upsert(slice, { onConflict: 'slug' });
    if (error) return NextResponse.json({ error: error.message, stage: 'appgs', written: appgsUp }, { status: 500 });
    appgsUp += slice.length;
  }
  const { error: dErr1 } = await supabase.from('appg_officers').delete().neq('id', -1);
  if (dErr1) return NextResponse.json({ error: dErr1.message, stage: 'officers-delete' }, { status: 500 });
  const { error: dErr2 } = await supabase.from('appg_funders').delete().neq('id', -1);
  if (dErr2) return NextResponse.json({ error: dErr2.message, stage: 'funders-delete' }, { status: 500 });
  const offBATCH = 500;
  let offUp = 0;
  for (let i = 0; i < officers.length; i += offBATCH) {
    const slice = officers.slice(i, i + offBATCH);
    const { error } = await supabase.from('appg_officers').insert(slice);
    if (error) return NextResponse.json({ error: error.message, stage: 'officers', written: offUp }, { status: 500 });
    offUp += slice.length;
  }
  let fundUp = 0;
  for (let i = 0; i < funders.length; i += offBATCH) {
    const slice = funders.slice(i, i + offBATCH);
    const { error } = await supabase.from('appg_funders').insert(slice);
    if (error) return NextResponse.json({ error: error.message, stage: 'funders', written: fundUp }, { status: 500 });
    fundUp += slice.length;
  }

  return NextResponse.json({
    ok: true,
    appgs: appgsUp,
    officers: offUp,
    funders: fundUp,
    files_seen: files.length,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}
