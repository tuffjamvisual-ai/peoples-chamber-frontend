// Shared logic for Early Day Motions (Oral Questions and Motions API,
// oralquestionsandmotions-api.parliament.uk, no API key). Used by both the
// daily sync route (app/api/sync-edms/route.ts) and the one-off backfill
// (scripts/import-edms.ts, run with `npx tsx`). No path-alias imports, so
// the script can import it under tsx.

import type { SupabaseClient } from '@supabase/supabase-js';

export const EDM_API = 'https://oralquestionsandmotions-api.parliament.uk';
// Start of the current Parliament (general election 4 July 2024).
export const EDM_PARLIAMENT_START = '2024-07-04';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchEdmJson(url: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${url}`) as Error & { noRetry?: boolean };
        err.noRetry = true;
        throw err;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if ((e as { noRetry?: boolean }).noRetry) break;
      await sleep(1000 * attempt * attempt); // 1s, 4s, 9s
    }
  }
  throw lastErr;
}

export type EdmListEntry = { id: number; sponsorsCount: number | null };

// Every EDM tabled on or after startDate, with the list endpoint's
// SponsorsCount (used only for change detection). Paged 100 at a time
// (take=100 live-verified) until PagingInfo.Total is reached.
export async function listEdms(startDate: string, delayMs = 250): Promise<EdmListEntry[]> {
  const out = new Map<number, EdmListEntry>();
  const take = 100;
  let total = Infinity;
  for (let skip = 0; skip < total && skip < 100_000; skip += take) {
    const json = await fetchEdmJson(
      `${EDM_API}/EarlyDayMotions/list?parameters.tabledStartDate=${startDate}&parameters.orderBy=DateTabledAsc&parameters.skip=${skip}&parameters.take=${take}`,
    );
    const items: any[] = Array.isArray(json?.Response) ? json.Response : [];
    if (typeof json?.PagingInfo?.Total === 'number') total = json.PagingInfo.Total;
    for (const it of items) {
      if (typeof it?.Id === 'number') {
        out.set(it.Id, { id: it.Id, sponsorsCount: typeof it.SponsorsCount === 'number' ? it.SponsorsCount : null });
      }
    }
    if (items.length === 0) break;
    await sleep(delayMs);
  }
  if (Number.isFinite(total) && out.size < total) {
    throw new Error(`EDM list returned ${out.size} of ${total} motions`);
  }
  return [...out.values()];
}

function statusText(v: unknown): 'published' | 'withdrawn' {
  if (v === 1 || (typeof v === 'string' && v.toLowerCase() === 'withdrawn')) return 'withdrawn';
  return 'published';
}

function dateOnly(v: unknown): string | null {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;
}

export type EdmSignatureRow = {
  edm_id: number;
  member_id: number;
  member_name: string;
  party: string | null;
  sponsoring_order: number | null;
  signed_at: string | null;
  is_withdrawn: boolean;
  withdrawn_at: string | null;
};

export function buildEdmRows(
  json: any,
  sourceSponsorsCount: number | null,
): { edm: Record<string, unknown>; signatures: EdmSignatureRow[] } {
  const r = json?.Response;
  if (typeof r?.Id !== 'number' || typeof r?.Title !== 'string') throw new Error('Unexpected EDM JSON shape');
  const tabled = dateOnly(r.DateTabled);
  if (!tabled) throw new Error(`EDM ${r.Id} has no DateTabled`);

  // One row per member. If a member appears twice (e.g. withdrew then
  // signed again), keep the live signature over the withdrawn one.
  const byMember = new Map<number, EdmSignatureRow>();
  for (const s of Array.isArray(r.Sponsors) ? r.Sponsors : []) {
    if (typeof s?.MemberId !== 'number') continue;
    const row: EdmSignatureRow = {
      edm_id: r.Id,
      member_id: s.MemberId,
      member_name: (typeof s.Member?.Name === 'string' && s.Member.Name) || `Member ${s.MemberId}`,
      party: (typeof s.Member?.Party === 'string' && s.Member.Party) || null,
      sponsoring_order: typeof s.SponsoringOrder === 'number' ? s.SponsoringOrder : null,
      signed_at: typeof s.CreatedWhen === 'string' ? s.CreatedWhen : null,
      is_withdrawn: s.IsWithdrawn === true,
      withdrawn_at: typeof s.WithdrawnDate === 'string' ? s.WithdrawnDate : null,
    };
    const existing = byMember.get(s.MemberId);
    if (!existing || (existing.is_withdrawn && !row.is_withdrawn)) byMember.set(s.MemberId, row);
  }
  const signatures = [...byMember.values()];
  const now = new Date().toISOString();

  const edm = {
    id: r.Id,
    uin: typeof r.UIN === 'number' ? r.UIN : null,
    uin_with_suffix: typeof r.UINWithAmendmentSuffix === 'string' ? r.UINWithAmendmentSuffix : null,
    title: r.Title,
    motion_text: typeof r.MotionText === 'string' ? r.MotionText : null,
    date_tabled: tabled,
    status: statusText(r.Status),
    status_date: typeof r.StatusDate === 'string' ? r.StatusDate : null,
    primary_sponsor_id: typeof r.MemberId === 'number' ? r.MemberId : (typeof r.PrimarySponsor?.MnisId === 'number' ? r.PrimarySponsor.MnisId : null),
    amendment_to_motion_id: typeof r.AmendmentToMotionId === 'number' ? r.AmendmentToMotionId : null,
    is_prayer: r.PrayingAgainstNegativeStatutoryInstrumentId != null,
    statutory_instrument_title: typeof r.StatutoryInstrumentTitle === 'string' ? r.StatutoryInstrumentTitle : null,
    signature_count: signatures.filter((s) => !s.is_withdrawn).length,
    source_sponsors_count: sourceSponsorsCount,
    synced_at: now,
    updated_at: now,
  };
  return { edm, signatures };
}

export async function writeEdm(
  db: SupabaseClient,
  { edm, signatures }: { edm: Record<string, unknown>; signatures: EdmSignatureRow[] },
): Promise<void> {
  const id = edm.id as number;
  const { error: eErr } = await db.from('early_day_motions').upsert(edm, { onConflict: 'id' });
  if (eErr) throw new Error(`early_day_motions upsert ${id}: ${eErr.message}`);

  for (let i = 0; i < signatures.length; i += 500) {
    const { error } = await db
      .from('early_day_motion_signatures')
      .upsert(signatures.slice(i, i + 500), { onConflict: 'edm_id,member_id' });
    if (error) throw new Error(`early_day_motion_signatures upsert ${id}: ${error.message}`);
  }

  // Remove signature rows no longer in the source. Member ids are
  // integers, so the in-list is safe. A motion with no signatures at all
  // clears every row for it.
  const del = db.from('early_day_motion_signatures').delete().eq('edm_id', id);
  const { error: dErr } = signatures.length > 0
    ? await del.not('member_id', 'in', `(${signatures.map((s) => s.member_id).join(',')})`)
    : await del;
  if (dErr) throw new Error(`stale signature delete ${id}: ${dErr.message}`);
}
