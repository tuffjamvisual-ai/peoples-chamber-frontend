import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Backfills the bill.commons_ayes / commons_noes / commons_division_id /
// commons_division_title / commons_vote_date columns by searching the
// Commons Votes API for the bill's Third Reading division. Without
// this, /bills/[id] shows "MPs' vote: not yet divided" even for Acts
// that clearly passed (Tobacco and Vapes, etc.).
//
// Targets: every bill whose commons_ayes is null/0 — same idempotent
// pattern as sync-bill-stages. Run weekly; backfill catches any new
// acts since the last sync.

const RUN_CAP = 600; // bills per invocation
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Division = {
  DivisionId: number;
  Date: string;
  Title: string;
  AyeCount: number;
  NoCount: number;
};

// Strip "Act 2026" / "(Amendment) Act 2026" trailers to derive the
// title under which the bill was divided ("Tobacco and Vapes Bill").
function billNameFromActTitle(title: string): string {
  return title
    .replace(/\s+Act\s+\d{4}\s*$/i, ' Bill')
    .replace(/\s+Act\s*$/i, ' Bill')
    .trim();
}

async function searchDivisions(searchTerm: string): Promise<Division[]> {
  const url = `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=${encodeURIComponent(searchTerm)}&queryParameters.take=25`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Commons Votes API ${res.status}`);
  return (await res.json()) as Division[];
}

// Pick the most canonical division for the bill. Preference order:
//   1. "<billName>: Third Reading"
//   2. "<billName> Third Reading" (some titles drop the colon)
//   3. any "Third Reading" mention
//   4. "Second Reading" as fallback
//   5. the most recent matching division otherwise
function pickDivision(billName: string, divisions: Division[]): Division | null {
  const bn = billName.toLowerCase();
  const matches = divisions.filter((d) => d.Title.toLowerCase().includes(bn.replace(/\s+bill$/, '')));
  if (matches.length === 0) return null;
  const isThird = (d: Division) => /third reading/i.test(d.Title);
  const isSecond = (d: Division) => /second reading/i.test(d.Title);
  const thirds = matches.filter(isThird);
  if (thirds.length > 0) return thirds.sort((a, b) => b.Date.localeCompare(a.Date))[0];
  const seconds = matches.filter(isSecond);
  if (seconds.length > 0) return seconds.sort((a, b) => b.Date.localeCompare(a.Date))[0];
  return matches.sort((a, b) => b.Date.localeCompare(a.Date))[0];
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'env missing' }, { status: 500 });
  }
  const supabase = createClient(url, key);

  const { data: rows, error: selErr } = await supabase
    .from('bill')
    .select('id, parliament_id, title')
    .or('commons_ayes.is.null,commons_ayes.eq.0')
    .not('parliament_id', 'is', null)
    .order('id', { ascending: false })
    .limit(RUN_CAP);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const targets = rows || [];
  let updated = 0;
  let noMatch = 0;
  let fail = 0;
  const failures: Array<{ id: number; detail: string }> = [];

  for (const bill of targets) {
    try {
      const billName = billNameFromActTitle(bill.title || '');
      if (!billName) continue;
      const divisions = await searchDivisions(billName);
      const chosen = pickDivision(billName, divisions);
      if (!chosen) {
        noMatch++;
        continue;
      }
      const { error } = await supabase
        .from('bill')
        .update({
          commons_ayes: chosen.AyeCount,
          commons_noes: chosen.NoCount,
          commons_division_id: chosen.DivisionId,
          commons_division_title: chosen.Title,
          commons_vote_date: chosen.Date,
        })
        .eq('id', bill.id);
      if (error) throw error;
      updated++;
    } catch (err) {
      fail++;
      if (failures.length < 20) failures.push({ id: bill.id, detail: (err as Error).message });
    }
    await sleep(120);
  }

  return NextResponse.json({
    targeted: targets.length,
    updated,
    noMatch,
    fail,
    failures,
    note: targets.length === RUN_CAP ? `Hit per-run cap of ${RUN_CAP}. Re-run.` : 'complete',
    syncedAt: new Date().toISOString(),
  });
}
