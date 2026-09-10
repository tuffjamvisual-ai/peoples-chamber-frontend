import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { COMMITTEE_IDS } from '@/lib/committees';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const COMMITTEES_API = 'https://committees-api.parliament.uk/api/Committees';
const UA = 'PeoplesChamber-CommitteeMetaSync/1.0';
const CALL_DELAY_MS = 200;

// COMMITTEE_IDS imported from lib/committees.ts — shared with the profile
// page (generateStaticParams) and app/sitemap.ts. Edit there, not here.

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let upserted = 0;
  const errors: { id: number; message: string }[] = [];

  for (let i = 0; i < COMMITTEE_IDS.length; i++) {
    const cid = COMMITTEE_IDS[i];
    if (i > 0) await sleep(CALL_DELAY_MS);

    let d: Record<string, unknown>;
    try {
      const res = await fetch(`${COMMITTEES_API}/${cid}`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      if (!res.ok) {
        errors.push({ id: cid, message: `API ${res.status}` });
        continue;
      }
      d = (await res.json()) as Record<string, unknown>;
    } catch (e) {
      errors.push({ id: cid, message: (e as Error).message });
      continue;
    }

    const cat = d.category as { name?: string } | null;
    const ctypes = (d.committeeTypes as { id?: number; name?: string }[] | null) ?? [];
    const startRaw = d.startDate as string | null;
    const endRaw = d.endDate as string | null;

    const row = {
      id: cid,
      name: (d.name as string) ?? '',
      category: cat?.name ?? '',
      committee_type_id: ctypes[0]?.id ?? null,
      committee_type: ctypes[0]?.name ?? null,
      purpose: (d.purpose as string | null) ?? null,
      start_date: startRaw ? startRaw.slice(0, 10) : null,
      end_date: endRaw ? endRaw.slice(0, 10) : null,
      synced_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('committees')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      errors.push({ id: cid, message: error.message });
    } else {
      upserted++;
    }
  }

  return NextResponse.json(
    {
      ok: errors.length === 0,
      total: COMMITTEE_IDS.length,
      upserted,
      syncedAt: new Date().toISOString(),
      ...(errors.length ? { errors } : {}),
    },
    { status: errors.length ? 500 : 200 },
  );
}

export const GET = withHeartbeat('/api/sync-committees', GET_impl);
