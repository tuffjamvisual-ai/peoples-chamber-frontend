import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEPT_SLUGS, findPublications, fetchAttachments, meetingsCsvs, parseMeetingsCsv, type Fetched, type MeetingRow } from '@/lib/ministers-meetings-source';

import { withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly sync of ministers' meetings from GOV.UK transparency returns into ministers_meetings. The reading rules
// (departments, text encoding, dates, source of each row) are in lib/ministers-meetings-source.ts, shared with the
// full reload (scripts/reload-ministers-meetings.ts). Owner's approval, 20 Oct 2026 (lobbying phase 1).
//
// Slug correctness (verified against gov.uk/api/organisations): DWP is 'department-for-work-pensions' (no 'and');
// MHCLG is 'ministry-of-housing-communities-local-government' (no 'and'); the Scotland and Wales Offices are
// 'scotland-office' and 'wales-office' (their 'office-of-the-secretary-of-state-for-...' slugs closed in July 2024).
//
// Safety: nothing is deleted until every publication has been read, and the table is not replaced when the new rows
// are fewer than 80% of those saved (a GOV.UK search that returned too little).

const DELAY_MS = 250;
const UA = 'opengovt.uk-ministers-meetings/1.0 (https://opengovt.uk; weekly sync)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function govFetch(url: string): Promise<Fetched> {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(DELAY_MS);
  return { ok: r.ok, status: r.status, bytes: new Uint8Array(await r.arrayBuffer()) };
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }
  const supabase = createClient(url, key);
  const today = new Date().toISOString().slice(0, 10);

  try {
    const allRows: (MeetingRow & { govuk_org_slug: string })[] = [];
    const perDept: Record<string, number> = {};
    const seenCsv = new Set<string>();
    for (const dept of DEPT_SLUGS) {
      const { kept } = await findPublications(govFetch, dept);
      let deptCount = 0;
      for (const pub of kept) {
        let atts;
        try { atts = await fetchAttachments(govFetch, pub.link); } catch { continue; }
        for (const att of meetingsCsvs(atts)) {
          if (seenCsv.has(att.url)) continue; // a publication listed under two organisations
          seenCsv.add(att.url);
          const res = await govFetch(att.url);
          if (!res.ok) continue;
          const { rows } = parseMeetingsCsv(res.bytes, att, pub, today);
          for (const r of rows) allRows.push({ ...r, govuk_org_slug: dept });
          deptCount += rows.length;
        }
      }
      perDept[dept] = deptCount;
    }

    if (allRows.length === 0) {
      return NextResponse.json({ ok: true, parsed: 0, inserted: 0, note: 'no rows collected, table untouched', perDept });
    }
    const { count: saved } = await supabase.from('ministers_meetings').select('id', { count: 'exact', head: true });
    if (saved && allRows.length < saved * 0.8) {
      return NextResponse.json({ ok: false, parsed: allRows.length, saved, note: 'fewer than 80% of the saved rows; table untouched', perDept }, { status: 500 });
    }

    // Re-runs replace the table: there's no natural unique key on a published meeting.
    await supabase.from('ministers_meetings').delete().not('minister_name', 'is', null);
    let inserted = 0;
    for (let i = 0; i < allRows.length; i += 100) {
      const batch = allRows.slice(i, i + 100);
      const { error } = await supabase.from('ministers_meetings').insert(batch);
      if (error) break;
      inserted += batch.length;
      await sleep(DELAY_MS);
    }

    return NextResponse.json({ ok: true, parsed: allRows.length, inserted, perDept, syncedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-ministers-meetings', GET_impl);
