// The MP page's read of the delivery record (lib/delivery-record.ts; owner, 8 Nov 2026, DR1).
import fs from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validate, type DeliveryRecord } from '@/lib/delivery-record';
import { ministerialPeriods, countInPeriods, coverageLabel, STATEMENTS_FROM, ANSWERS_FROM, type Post } from '@/lib/written-statements';

// The page's read (owner, 8 Nov 2026, DR1): the record only when bio_visible is true, on its own, so the rest of the page
// never depends on it. Before migration 2026-11-08b, or on any read error, it returns null and the page shows nothing.
// A record that fails validate() is left out and logged.
//
// DELIVERY_PREVIEW_FILE (a local test only; never set it in Vercel or .env.local): the path of a delivery fixture
// (scripts/background/fixtures/delivery-4820.json shape), read in place of the database for that one member, so the page
// can be drawn locally without touching the live database. See deliveryPreview().
export type DeliveryFixture = { member_id: number; checked: string; political_bio: string; bio_sources: Array<{ title: string; url: string; supports?: string }>; delivery_record: DeliveryRecord };

// The fixture for this member when DELIVERY_PREVIEW_FILE is set and names it; otherwise null (always null in production).
export function deliveryPreview(memberId: number): DeliveryFixture | null {
  const file = process.env.DELIVERY_PREVIEW_FILE;
  if (!file) return null;
  try {
    const f = JSON.parse(fs.readFileSync(file, 'utf8')) as DeliveryFixture;
    return f.member_id === memberId ? f : null;
  } catch (e) {
    console.error(`DELIVERY_PREVIEW_FILE: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export async function getDeliveryRecord(supabase: SupabaseClient, memberId: number): Promise<DeliveryRecord | null> {
  const preview = deliveryPreview(memberId);
  if (preview) return checked(memberId, preview.delivery_record);
  const { data, error } = await supabase.from('mp_biography').select('delivery_record').eq('member_id', memberId).eq('bio_visible', true).maybeSingle();
  if (error) {
    // Before migration 2026-11-08b the column is not there: nothing to show, and nothing to log.
    if (!/delivery_record/.test(error.message)) console.error(`/mps/${memberId} delivery record: ${error.message}`);
    return null;
  }
  return checked(memberId, (data as { delivery_record?: unknown } | null)?.delivery_record ?? null);
}

function checked(memberId: number, record: unknown): DeliveryRecord | null {
  if (record === null || record === undefined) return null;
  const problems = validate(record);
  if (problems.length) { console.error(`/mps/${memberId} delivery_record: ${problems.slice(0, 3).join('; ')}`); return null; }
  return record as DeliveryRecord;
}

// With DELIVERY_PREVIEW_FILE naming this member, the biography read is given the fixture's text, sources, checked date and
// bio_visible true, as the generated migration would store them; without it the read is returned unchanged.
export function withDeliveryPreview<T extends { data: Record<string, unknown> | null; error: unknown }>(res: T, memberId: number): T {
  const f = deliveryPreview(memberId);
  if (!f || !res.data) return res;
  return { ...res, data: { ...res.data, political_bio: f.political_bio, bio_sources: f.bio_sources, bio_last_reviewed: f.checked, bio_visible: true } };
}

// Written ministerial statements for the panel (owner, 8 Nov 2026, WS1): the MP's statements in
// parliament_written_statements (migration 2026-11-08c) made inside their ministerial posts (government_posts, which the
// page already reads). null when the table holds none for the MP, or before the migration, or on any read error.
// "since" names the period covered when a post started before the data does; posts before it are not counted.
export async function ministerStatements(supabase: SupabaseClient, memberId: number, posts: Post[] | null | undefined, today: string): Promise<{ count: number | null; since: string | null }> {
  const periods = ministerialPeriods(posts, today);
  const { data, error } = await supabase.from('parliament_written_statements').select('date_made').eq('member_id', memberId).limit(5000);
  if (error) {
    if (!/parliament_written_statements/.test(error.message)) console.error(`/mps/${memberId} written statements: ${error.message}`);
    return { count: null, since: null };
  }
  const days = ((data ?? []) as Array<{ date_made: string }>).map((r) => r.date_made);
  if (!days.length) return { count: null, since: null };
  return { count: countInPeriods(days, periods), since: coverageLabel(periods, STATEMENTS_FROM) };
}

// The written answers figure's period: our archive holds questions tabled from 4 July 2024 (lib/written-statements.ts).
export function ministerAnswersSince(posts: Post[] | null | undefined, today: string): string | null {
  return coverageLabel(ministerialPeriods(posts, today), ANSWERS_FROM);
}
