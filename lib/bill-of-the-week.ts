import 'server-only';
import { supabase } from '@/lib/supabase';
import { tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { currentSessionBillIds } from '@/lib/bill-indexing';
import { billStatus } from '@/lib/bill-status';

// Bill of the week for the homepage's 'Have your say in Parliament' card (owner approved, Cowork ENTRY 550, 551, 553, 554).
//
// The rule in use now is ENTRY 550's (and ENTRY 551's fallback): of the bills still going through Parliament in the current
// session, the one with the soonest upcoming Commons second reading, report stage or third reading (the stages where MPs
// usually divide), government bills first, then any bill; ties by title. Sittings more than 60 days ahead are left out:
// Parliament's Bills API gives some private members' bills placeholder dates months ahead (/bills/4092: 12 Mar 2027).
// ENTRY 551's 'most read this week' waits for the owner (the page view source needs a Vercel access token, and bill pages
// had 17 views in the last 7 days: Claude outputs/audit/have-your-say/REPORT-readonly-551-553.md); so does ENTRY 553's
// 'skip bills without a checked plain English summary', as no bill has one yet.
// Kept in the shared data cache under the bill table's tags, so the bills sync's refresh recomputes it (about daily).

export type BillOfTheWeek = { id: number; title: string; house: string | null; stage: string | null; nextDate: string };

const VOTING_STAGES = new Set(['2nd reading', 'report stage', '3rd reading']);
const GOVERNMENT_TYPES = new Set([1, 3, 4, 10]);
const AHEAD_DAYS = 60;

type Sitting = { date?: string };
type Stage = { description?: string; house?: string; stageSittings?: Sitting[] };

async function read(today: string): Promise<BillOfTheWeek | null> {
  const ids = [...(await currentSessionBillIds())];
  if (!ids.length) return null;
  const last = new Date(`${today}T00:00:00Z`);
  last.setUTCDate(last.getUTCDate() + AHEAD_DAYS);
  const until = last.toISOString().slice(0, 10);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('bill')
      .select('id, title, current_stage, is_act, bill_withdrawn, is_defeated, hidden_reason, bill_type_id, stages')
      .in('id', ids.slice(i, i + 200));
    if (error) throw new Error(`billOfTheWeek: ${error.message}`);
    rows.push(...(data ?? []));
  }
  const picks: (BillOfTheWeek & { gov: boolean })[] = [];
  for (const b of rows) {
    if (b.hidden_reason) continue;
    if (billStatus(b as Parameters<typeof billStatus>[0]).kind !== 'in_progress') continue;
    const items = ((b.stages as { items?: Stage[] } | null)?.items ?? []);
    let next: string | null = null;
    for (const s of items) {
      if (s.house !== 'Commons' || !VOTING_STAGES.has((s.description ?? '').toLowerCase())) continue;
      for (const x of s.stageSittings ?? []) {
        const d = (x.date ?? '').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today && d <= until && (!next || d < next)) next = d;
      }
    }
    if (!next) continue;
    // The House and stage the bill is at now: the latest stage with a sitting on or before today.
    let house: string | null = null, stage: string | null = null, at = '';
    for (const s of items) {
      const d = (s.stageSittings?.[0]?.date ?? '').slice(0, 10);
      if (d && d <= today && d >= at) { at = d; house = s.house ?? null; stage = s.description ?? null; }
    }
    picks.push({ id: b.id as number, title: String(b.title ?? ''), house, stage: stage ?? (b.current_stage as string | null) ?? null, nextDate: next, gov: GOVERNMENT_TYPES.has(Number(b.bill_type_id)) });
  }
  picks.sort((a, b) => Number(b.gov) - Number(a.gov) || a.nextDate.localeCompare(b.nextDate) || a.title.localeCompare(b.title));
  const top = picks[0];
  return top ? { id: top.id, title: top.title, house: top.house, stage: top.stage, nextDate: top.nextDate } : null;
}

export function billOfTheWeek(today: string): Promise<BillOfTheWeek | null> {
  return tagged(['bill-of-the-week-v1', today], tableTags('bill'), () => read(today));
}
