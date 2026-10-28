import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { RDC_CONTENT_API, KNOWN_TABLES } from '@/lib/road-condition-source';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Weekly check only (owner's decision, 28 Oct 2026). The year to March 2026 is the last year of DfT's red, amber and
// green road condition series: DfT moved to PAS 2161 in April 2026, with 5 condition categories that are not backward
// compatible, so council_road_condition is not updated. Each run reads the RDC page through the GOV.UK Content API and
// looks for PAS 2161 tables: an attachment that names PAS 2161 or its condition categories, or a table code not on the
// page on 28 Oct 2026. What it finds is kept in sync_cursor ("release:/api/sync-road-condition") and
// /api/monitor-freshness emails a line while it is there. Nothing is loaded automatically.
const ROUTE = '/api/sync-road-condition';
const UA = { 'User-Agent': 'OpenGovt/1.0 (+https://www.opengovt.uk)' };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const res = await fetch(RDC_CONTENT_API, { headers: UA, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return NextResponse.json({ error: `GOV.UK Content API HTTP ${res.status}` }, { status: 502 });
    const page = (await res.json()) as { public_updated_at?: string; details?: { attachments?: { title?: string; url?: string; filename?: string }[] } };
    const attachments = page.details?.attachments ?? [];
    const found: string[] = [];
    for (const a of attachments) {
      const label = `${a.title ?? ''} ${a.filename ?? a.url ?? ''}`;
      const codes = label.toUpperCase().match(/RDC\d{4}/g) ?? [];
      const newCode = codes.find((c) => !KNOWN_TABLES.includes(c));
      if (/PAS ?2161|five condition|5 condition|condition categor/i.test(label) || newCode) found.push(`${a.title ?? a.url}${newCode ? ` (${newCode})` : ''}`);
    }
    const key = `release:${ROUTE}`;
    const now = new Date().toISOString();
    const { error } = await supabase.from('sync_cursor').upsert({ route: key, cursor: { checkedAt: now, pageUpdated: page.public_updated_at ?? null, pas2161Tables: found }, updated_at: now }, { onConflict: 'route' });
    if (error) return NextResponse.json({ error: `sync_cursor: ${error.message}` }, { status: 500 });
    return NextResponse.json({ status: found.length ? 'new_tables' : 'no_new_tables', page_updated: page.public_updated_at ?? null, attachments: attachments.length, new_tables: found, rows: attachments.length });
  } catch (e) {
    return NextResponse.json({ error: 'check_failed', message: (e as Error).message }, { status: 502 });
  }
}

export const GET = withHeartbeat(ROUTE, GET_impl);
