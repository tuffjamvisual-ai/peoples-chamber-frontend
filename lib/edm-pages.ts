// Reads for the early day motion pages (owner, backlog item 15b, 6 Nov 2026), this Parliament, from early_day_motions and
// early_day_motion_signatures (/api/sync-edms, daily). Titles and text are as tabled: see EXACT_COLUMNS in lib/no-em-dash.ts.
//
// Motion numbers start again each session, so 1,117 numbers are used twice: pages are addressed by Parliament's own motion id,
// which is also what edm.parliament.uk's addresses use, and show the number.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdminRead as db } from '@/lib/supabase-admin';
import { EDMS_TAG } from '@/lib/edm-tags';

export type EdmListRow = { id: number; uin: number | null; uin_with_suffix: string | null; title: string; date_tabled: string; signature_count: number; status: string; is_prayer: boolean | null };
export type EdmState = 'Open' | 'Closed' | 'Withdrawn';

// Parliament's data says only published or withdrawn. Motions lapse when a session ends, so open means tabled this session and
// not withdrawn, and closed means tabled in an earlier session. This session began with the newest motion numbered 1.
export const edmState = (m: Pick<EdmListRow, 'status' | 'date_tabled'>, sessionStart: string): EdmState =>
  m.status === 'withdrawn' ? 'Withdrawn' : m.date_tabled >= sessionStart ? 'Open' : 'Closed';

async function pages<T>(read: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await read(from, from + 999);
    if (error) throw new Error(`${what}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

export const allEdms = unstable_cache(async (): Promise<{ rows: EdmListRow[]; sessionStart: string }> => {
  const rows = await pages<EdmListRow>((f, t) => db.from('early_day_motions').select('id, uin, uin_with_suffix, title, date_tabled, signature_count, status, is_prayer').order('date_tabled', { ascending: false }).order('id', { ascending: false }).range(f, t), 'motions list');
  const firsts = rows.filter((r) => r.uin_with_suffix === '1').map((r) => r.date_tabled).sort();
  return { rows, sessionStart: firsts[firsts.length - 1] ?? '1970-01-01' };
}, ['edms-list'], { tags: [EDMS_TAG], revalidate: 86400 });

// The motions an MP tabled and signed, for /edms?member=<id>. Signed leaves out signatures they withdrew.
export const memberEdmIds = unstable_cache(async (memberId: number): Promise<{ tabled: number[]; signed: number[] }> => {
  const [tabled, signed] = await Promise.all([
    pages<{ id: number }>((f, t) => db.from('early_day_motions').select('id').eq('primary_sponsor_id', memberId).order('id').range(f, t), 'motions tabled'),
    pages<{ edm_id: number }>((f, t) => db.from('early_day_motion_signatures').select('edm_id').eq('member_id', memberId).eq('is_withdrawn', false).order('edm_id').range(f, t), 'motions signed'),
  ]);
  return { tabled: tabled.map((r) => r.id), signed: signed.map((r) => r.edm_id) };
}, ['edms-of-member'], { tags: [EDMS_TAG], revalidate: 86400 });

export type Edm = EdmListRow & { motion_text: string | null; primary_sponsor_id: number | null; amendment_to_motion_id: number | null; statutory_instrument_title: string | null };

export async function getEdm(id: number): Promise<Edm | null> {
  const { data, error } = await db.from('early_day_motions').select('id, uin, uin_with_suffix, title, date_tabled, signature_count, status, is_prayer, motion_text, primary_sponsor_id, amendment_to_motion_id, statutory_instrument_title').eq('id', id).maybeSingle();
  if (error) throw new Error(`motion ${id}: ${error.message}`);
  return data as unknown as Edm | null;
}

export type EdmSignature = { member_id: number; member_name: string; party: string | null; sponsoring_order: number | null; signed_at: string | null; is_withdrawn: boolean; withdrawn_at: string | null; has_page: boolean };
export type LinkedEdm = { id: number; uin_with_suffix: string | null; title: string };

export async function edmDetail(edm: Edm) {
  const [sigs, amendments, parent] = await Promise.all([
    db.from('early_day_motion_signatures').select('member_id, member_name, party, sponsoring_order, signed_at, is_withdrawn, withdrawn_at').eq('edm_id', edm.id).limit(2000),
    db.from('early_day_motions').select('id, uin_with_suffix, title').eq('amendment_to_motion_id', edm.id).order('id').limit(100),
    edm.amendment_to_motion_id ? db.from('early_day_motions').select('id, uin_with_suffix, title').eq('id', edm.amendment_to_motion_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const err = sigs.error ?? amendments.error ?? parent.error;
  if (err) throw new Error(`motion ${edm.id}: ${err.message}`);
  const rows = (sigs.data ?? []) as Omit<EdmSignature, 'has_page'>[];
  // Two signers have no MP page, so no link.
  const { data: pagesHeld, error: pageErr } = await db.from('mps').select('member_id').in('member_id', [...new Set(rows.map((r) => r.member_id))]);
  if (pageErr) throw new Error(`motion ${edm.id} MPs: ${pageErr.message}`);
  const held = new Set(((pagesHeld ?? []) as { member_id: number }[]).map((p) => p.member_id));
  // Sponsors first in Parliament's order, then by date, with withdrawn signatures last.
  const order = (s: { is_withdrawn: boolean; sponsoring_order: number | null }) => (s.is_withdrawn ? 1e9 : s.sponsoring_order ?? 1e8);
  return {
    signatures: rows.map((r) => ({ ...r, has_page: held.has(r.member_id) })).sort((a, b) => order(a) - order(b) || String(a.signed_at).localeCompare(String(b.signed_at))) as EdmSignature[],
    amendments: (amendments.data ?? []) as LinkedEdm[],
    parent: parent.data as LinkedEdm | null,
  };
}

// The sitemap: motions with 10 or more signatures, dated by their latest signature.
export const edmSitemapRows = unstable_cache(async (): Promise<{ id: number; last: string }[]> => {
  const { rows } = await allEdms();
  const big = new Set(rows.filter((r) => r.signature_count >= 10).map((r) => r.id));
  const latest = new Map<number, string>();
  const sigs = await pages<{ edm_id: number; signed_at: string | null }>((f, t) => db.from('early_day_motion_signatures').select('edm_id, signed_at').eq('is_withdrawn', false).order('edm_id').order('member_id').range(f, t), 'motion signatures');
  for (const s of sigs) if (s.signed_at && big.has(s.edm_id) && s.signed_at > (latest.get(s.edm_id) ?? '')) latest.set(s.edm_id, s.signed_at);
  return rows.filter((r) => big.has(r.id)).map((r) => ({ id: r.id, last: latest.get(r.id) ?? r.date_tabled }));
}, ['edms-sitemap'], { tags: [EDMS_TAG], revalidate: 86400 });

export type MpEdmsTop = { tabled: LinkedEdm[]; signed: LinkedEdm[] };

// The MP page's section: the latest 5 tabled and the latest 5 signed. /api/sync-edms refreshes the page when these change.
export async function latestEdmsForMp(memberId: number): Promise<MpEdmsTop> {
  const [tabled, signed] = await Promise.all([
    db.from('early_day_motions').select('id, uin_with_suffix, title').eq('primary_sponsor_id', memberId).order('date_tabled', { ascending: false }).order('id', { ascending: false }).limit(5),
    db.from('early_day_motion_signatures').select('edm_id, early_day_motions(uin_with_suffix, title, primary_sponsor_id)').eq('member_id', memberId).eq('is_withdrawn', false).order('signed_at', { ascending: false }).limit(15),
  ]);
  if (tabled.error) throw new Error(`motions tabled by ${memberId}: ${tabled.error.message}`);
  if (signed.error) throw new Error(`motions signed by ${memberId}: ${signed.error.message}`);
  type Row = { edm_id: number; early_day_motions: { uin_with_suffix: string | null; title: string; primary_sponsor_id: number | null } | null };
  return {
    tabled: (tabled.data ?? []) as LinkedEdm[],
    // Signed here means someone else's motion: an MP's own motion is under tabled.
    signed: ((signed.data ?? []) as unknown as Row[]).filter((r) => r.early_day_motions && r.early_day_motions.primary_sponsor_id !== memberId).slice(0, 5).map((r) => ({ id: r.edm_id, uin_with_suffix: r.early_day_motions!.uin_with_suffix, title: r.early_day_motions!.title })),
  };
}
