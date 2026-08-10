import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Keeps mp_division_votes current from the LIVE Commons Votes API.
// The older sync-parlparse-votes job depends on the mySociety parlparse XML
// feed, which can lag or freeze (it stalled at mid-Jan 2026 while the House
// kept voting). This route pulls member-level Ayes/Noes straight from
// Parliament for recent divisions, deduped by (date, division number) so it
// never collides with parlparse-sourced rows. Rebellion flags are not computed
// here (left to recompute-activity-metrics / the parlparse path).

const API = 'https://commonsvotes-api.parliament.uk/data';
const LOOKBACK_DAYS = 45;

type ApiMember = { MemberId: number };
type ApiDivision = { DivisionId: number; Number: number; Date: string; Title: string };
type ApiDetail = ApiDivision & { Ayes: ApiMember[]; Noes: ApiMember[]; AyeTellers: ApiMember[]; NoTellers: ApiMember[] };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const to = new Date();
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const listRes = await fetch(`${API}/divisions.json/search?queryParameters.startDate=${iso(from)}&queryParameters.endDate=${iso(to)}&queryParameters.take=200`);
    if (!listRes.ok) return NextResponse.json({ ok: false, error: `list ${listRes.status}` }, { status: 502 });
    const list = (await listRes.json()) as ApiDivision[];

    // Existing (date#number) keys in range — skip whole divisions already held
    // (from either parlparse or a previous run of this route).
    const { data: have } = await supabase
      .from('mp_division_votes')
      .select('division_date_only, division_number')
      .gte('division_date_only', iso(from));
    const seen = new Set((have || []).map((r) => `${r.division_date_only}#${r.division_number}`));

    let divisionsAdded = 0, rowsInserted = 0;
    for (const d of list) {
      const dateOnly = (d.Date || '').slice(0, 10);
      if (seen.has(`${dateOnly}#${d.Number}`)) continue;
      const detRes = await fetch(`${API}/division/${d.DivisionId}.json`);
      if (!detRes.ok) continue;
      const det = (await detRes.json()) as ApiDetail;
      const ts = `${dateOnly} 00:00:00`;
      const rows: Record<string, unknown>[] = [];
      const add = (members: ApiMember[] | undefined, vote: string, teller: boolean) => {
        for (const m of members || []) {
          if (!m.MemberId) continue;
          rows.push({
            member_id: m.MemberId, division_id: det.DivisionId, vote_type: vote,
            division_date: ts, division_title: det.Title || null, division_number: det.Number,
            division_date_only: dateOnly, source: 'commonsvotes-api', is_teller: teller, is_rebellion: false,
          });
        }
      };
      add(det.Ayes, 'aye', false); add(det.AyeTellers, 'aye', true);
      add(det.Noes, 'no', false); add(det.NoTellers, 'no', true);
      if (!rows.length) continue;
      const { error } = await supabase.from('mp_division_votes').insert(rows);
      if (!error) { divisionsAdded++; rowsInserted += rows.length; }
    }
    return NextResponse.json({ ok: true, range: [iso(from), iso(to)], divisionsInRange: list.length, divisionsAdded, rowsInserted, syncedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-commons-votes-api', GET_impl);
