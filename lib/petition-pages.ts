// Reads for the petition pages (owner, backlog item 15a, 6 Nov 2026): /petitions, /petitions/[id] and the MP page's section.
// Source: petition.parliament.uk, stored by /api/sync-petitions. Petitions are as written: see EXACT_COLUMNS in lib/no-em-dash.ts.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdminRead as db } from '@/lib/supabase-admin';
import { PETITIONS_TAG } from '@/lib/petition-tags';

export type PetitionListRow = {
  id: number; action: string; state: string; signature_count: number; opened_at: string | null; closed_at: string | null;
  government_response_at: string | null; government_response_on: string | null; debated_on: string | null; synced_at: string | null;
};
const LIST_COLUMNS = 'id, action, state, signature_count, opened_at, closed_at, government_response_at, government_response_on, debated_on, synced_at';

// Every petition, newest first (by the day it opened). The filters work on this list, so a search costs no database read.
export const allPetitions = unstable_cache(async (): Promise<PetitionListRow[]> => {
  const out: PetitionListRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('petitions').select(LIST_COLUMNS).order('opened_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).range(from, from + 999);
    if (error) throw new Error(`petitions list: ${error.message}`);
    out.push(...((data ?? []) as unknown as PetitionListRow[]));
    if (!data || data.length < 1000) return out;
  }
}, ['petitions-list'], { tags: [PETITIONS_TAG], revalidate: 86400 });

export type ConstituencyCounts = { name: string | null; counts: Record<number, number> };

// One constituency's signatures on each petition, for /petitions?constituency=<code>, from the MP page's link.
export const petitionsInConstituency = unstable_cache(async (gss: string): Promise<ConstituencyCounts> => {
  const { data, error } = await db.from('petition_constituency_signatures').select('petition_id, signature_count, constituency_name').eq('constituency_gss_code', gss).limit(5000);
  if (error) throw new Error(`petitions in ${gss}: ${error.message}`);
  const rows = (data ?? []) as { petition_id: number; signature_count: number; constituency_name: string }[];
  return { name: rows[0]?.constituency_name ?? null, counts: Object.fromEntries(rows.map((r) => [Number(r.petition_id), r.signature_count])) };
}, ['petitions-in-constituency'], { tags: [PETITIONS_TAG], revalidate: 86400 });

export type Petition = PetitionListRow & {
  background: string | null; additional_details: string | null; government_response_summary: string | null; government_response_details: string | null;
  scheduled_debate_date: string | null; debate_transcript_url: string | null; debate_overview: string | null; debate_outcome_at: string | null;
  checked_at: string | null; url: string; constituency_count: number | null;
};

export async function getPetition(id: number): Promise<Petition | null> {
  const { data, error } = await db.from('petitions')
    .select(`${LIST_COLUMNS}, background, additional_details, government_response_summary, government_response_details, scheduled_debate_date, debate_transcript_url, debate_overview, debate_outcome_at, checked_at, url, constituency_count`)
    .eq('id', id).maybeSingle();
  if (error) throw new Error(`petition ${id}: ${error.message}`);
  return data as unknown as Petition | null;
}

export type PetitionConstituency = { gss: string; name: string; count: number; memberId: number | null };

// Every constituency with a signature, most signed first, with its current MP's id.
export async function petitionConstituencies(id: number): Promise<PetitionConstituency[]> {
  const [{ data, error }, { data: mps, error: mpErr }] = await Promise.all([
    db.from('petition_constituency_signatures').select('constituency_gss_code, constituency_name, signature_count').eq('petition_id', id).order('signature_count', { ascending: false }).order('constituency_name').limit(1000),
    db.from('mps').select('member_id, constituency_gss_code').eq('current_member', true).not('constituency_gss_code', 'is', null).limit(1000),
  ]);
  if (error) throw new Error(`petition ${id} constituencies: ${error.message}`);
  if (mpErr) throw new Error(`petition ${id} MPs: ${mpErr.message}`);
  const member = new Map(((mps ?? []) as { member_id: number; constituency_gss_code: string }[]).map((m) => [m.constituency_gss_code, m.member_id]));
  return ((data ?? []) as { constituency_gss_code: string; constituency_name: string; signature_count: number }[]).map((r) => ({
    gss: r.constituency_gss_code, name: r.constituency_name, count: r.signature_count, memberId: member.get(r.constituency_gss_code) ?? null,
  }));
}

// The debate's id in a Hansard link, if we hold that debate and so have a page for it.
export async function ourDebateGuid(transcriptUrl: string | null): Promise<string | null> {
  const guid = transcriptUrl?.match(/debates\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1]?.toUpperCase();
  if (!guid) return null;
  const { data, error } = await db.from('hansard_debates').select('guid').eq('guid', guid).is('gone_at', null).maybeSingle();
  if (error) throw new Error(`hansard_debates ${guid}: ${error.message}`);
  return data ? guid : null;
}

export type MpPetitionsTop = { petitions: { id: number; title: string; here: number; total: number; state: string }[]; checkedOn: string | null };

// The MP page's "Petitions in this constituency": the five most signed. The page keeps for a week, so it says when the
// counts were checked; the Petitions tab and /petitions?constituency= stay current.
export async function topPetitionsInConstituency(gss: string): Promise<MpPetitionsTop> {
  const { data, error } = await db.from('petition_constituency_signatures')
    .select('petition_id, signature_count, petitions(action, signature_count, state, checked_at)')
    .eq('constituency_gss_code', gss).order('signature_count', { ascending: false }).limit(5);
  if (error) throw new Error(`top petitions ${gss}: ${error.message}`);
  type Row = { petition_id: number; signature_count: number; petitions: { action: string; signature_count: number; state: string; checked_at: string | null } | null };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.petitions);
  const dates = rows.map((r) => r.petitions!.checked_at).filter((d): d is string => !!d).sort();
  return {
    petitions: rows.map((r) => ({ id: Number(r.petition_id), title: r.petitions!.action, here: r.signature_count, total: r.petitions!.signature_count, state: r.petitions!.state })),
    checkedOn: dates[dates.length - 1] ?? null,
  };
}

// A revised response (owner, 6 Nov 2026): the official response date is later than when the first response was published.
// Checked against all 418 official pages with a response on 6 Nov 2026; see the report for that job.
export function isRevisedResponse(p: Pick<PetitionListRow, 'government_response_on' | 'government_response_at'>): boolean {
  if (!p.government_response_on || !p.government_response_at) return false;
  return p.government_response_on > new Date(p.government_response_at).toISOString().slice(0, 10);
}

const LONDON = 'Europe/London';
// A date only column, or a timestamp read in UK time ("closed 23:59 on 20 May" is stored as 22:59 UTC).
export function petitionDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = v.length === 10 ? new Date(`${v}T12:00:00Z`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: LONDON });
}
