import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { govukSlugs } from '@/lib/govuk-slugs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Picks up new Cabinet appointees / reshuffles and dropped ministers
// across all 24 departments. Unlike the original manual script (which
// did blind DELETE + INSERT and would wipe photo_url / member_id /
// salary_band / resigned / officials.photo_url), this preserves those
// backfilled columns by joining new gov.uk rows to existing ones by
// name and copying the preserved fields across.

type GovukRoleAppt = {
  details?: { current?: boolean; started_on?: string | null; ended_on?: string | null };
  links?: { role?: Array<{ title: string }>; organisations?: Array<{ title: string }> };
};
type GovukPerson = {
  title: string;
  base_path?: string;
  links?: { role_appointments?: GovukRoleAppt[] };
};
type GovukChildOrg = {
  title: string;
  web_url: string;
  details?: { acronym?: string; organisation_govuk_status?: { status?: string } };
};

type MinisterRow = {
  dept_slug: string;
  name: string;
  role: string;
  slug: string;
  is_secretary_of_state: boolean;
  photo_url: string | null;
  member_id: number | null;
  salary_band: string | null;
  resigned: boolean;
  updated_at: string;
};

type OfficialRow = {
  dept_slug: string;
  name: string;
  role: string;
  slug: string;
  category: string;
  role_rank: string;
  appointment_date: string | null;   // ISO YYYY-MM-DD, started_on for the current role
  previous_role: string | null;      // most recent non-current role title
  photo_url: string | null;
  updated_at: string;
};

// Classifies a role title into a coarse rank so the senior officials
// section can sort + group properly. Intentionally conservative — falls
// back to 'other' rather than guess wrong.
function classifyRoleRank(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('second permanent') || r.includes('2nd permanent')) return 'second_permanent_secretary';
  if (r.includes('permanent secretary') || r.includes('permanent under-secretary') || r.includes('permanent under secretary')) return 'permanent_secretary';
  if (r.includes('non-executive') || r.includes('board member') || r.includes('non executive')) return 'board';
  if (r.includes('director general') || r.includes('director-general')) return 'director_general';
  if (r.startsWith('chief ') || r.includes(' chief ')) return 'chief_officer';
  return 'other';
}

// Pulls a person's role_appointments and returns (current role's
// started_on, most-recent prior role title). Cheap-fails to nulls so
// one slow / 404'd person doesn't break the sync.
async function fetchPersonRoleHistory(slug: string): Promise<{ startedOn: string | null; previousRole: string | null }> {
  if (!slug) return { startedOn: null, previousRole: null };
  try {
    const res = await fetch(`https://www.gov.uk/api/content/government/people/${slug}`, {
      headers: { 'User-Agent': 'PeoplesChamber/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { startedOn: null, previousRole: null };
    const data = await res.json();
    const appts = (data?.links?.role_appointments || []) as GovukRoleAppt[];
    const current = appts.find((a) => a.details?.current);
    const startedOn = current?.details?.started_on?.slice(0, 10) || null;
    // Sort non-current appointments by ended_on desc, take the most recent
    const prior = appts
      .filter((a) => !a.details?.current && a.details?.ended_on)
      .sort((a, b) => (b.details!.ended_on! || '').localeCompare(a.details!.ended_on! || ''));
    const previousRole = prior[0]?.links?.role?.[0]?.title || null;
    return { startedOn, previousRole };
  } catch {
    return { startedOn: null, previousRole: null };
  }
}

type AgencyRow = {
  dept_slug: string;
  name: string;
  url: string;
  acronym: string;
  updated_at: string;
};

// Loose name match for the self-healing lock: strip honorifics/suffixes and
// punctuation so "The Rt Hon John Healey MP" (GOV.UK) equals "Rt Hon John Healey MP"
// (hand-set). Used only to decide whether GOV.UK has caught up to a manual lead.
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(the|rt|hon|sir|dame|lord|baroness|mp|obe|kc|qc|cbe|mbe|dbe|dl|frs)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchOrg(govukSlug: string) {
  const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${govukSlug}`);
  if (!res.ok) throw new Error(`gov.uk ${res.status}`);
  return res.json();
}

async function syncDept(supabase: SupabaseClient, deptSlug: string, govukSlug: string) {
  const data = await fetchOrg(govukSlug);
  const now = new Date().toISOString();

  // Pull existing rows so we can preserve photo_url / member_id /
  // salary_band / resigned across the delete+insert.
  const [{ data: existingMins }, { data: existingOffs }] = await Promise.all([
    supabase
      .from('dept_ministers')
      .select('name, photo_url, member_id, salary_band, resigned')
      .eq('dept_slug', deptSlug),
    supabase.from('dept_officials').select('name, photo_url').eq('dept_slug', deptSlug),
  ]);
  const minByName = new Map<string, { photo_url: string | null; member_id: number | null; salary_band: string | null; resigned: boolean }>();
  (existingMins || []).forEach((r) => minByName.set(r.name, {
    photo_url: r.photo_url ?? null,
    member_id: r.member_id ?? null,
    salary_band: r.salary_band ?? null,
    resigned: !!r.resigned,
  }));
  const offByName = new Map<string, { photo_url: string | null }>();
  (existingOffs || []).forEach((r) => offByName.set(r.name, { photo_url: r.photo_url ?? null }));

  // The Prime Minister appears in some departments' ordered_ministers (e.g. the
  // Cabinet Office lists them as "Minister for the Union"). They are not a
  // departmental minister, so exclude PM-only roles or they get crowned as a
  // junior minister on that department's page.
  const PM_ROLE = /prime minister|first lord of the treasury|minister for the union|minister for the civil service/i;
  const rawMinisters = ((data.links?.ordered_ministers as GovukPerson[]) || []).map((m) => ({
    name: m.title,
    role: m.links?.role_appointments?.find((r) => r.details?.current)?.links?.role?.[0]?.title || '',
    slug: m.base_path?.replace('/government/people/', '') || '',
  })).filter((m) => m.role && !PM_ROLE.test(m.role));

  // Pick the department head by ROLE TITLE, not by list position. GOV.UK's
  // ordered_ministers[0] is not reliably the Secretary of State, especially
  // mid-reshuffle when the new SoS may not be published yet and a junior
  // minister sits first. Crowning that junior minister as department head was
  // showing e.g. "Minister of State (Investment)" as the Business Secretary.
  // If NO head-level role is present (SoS genuinely not yet published), leave
  // the head slot empty rather than mislabel a junior minister.
  // Head-level roles only. The negative lookbehind on "secretary of state" is
  // essential: without it, "Parliamentary Under-Secretary of State" (a junior
  // role) falsely matches and gets crowned as department head.
  const HEAD_ROLE = /((?<!under[- ])secretary of state|chancellor of the exchequer|prime minister|first lord of the treasury|attorney general|advocate general|leader of the house|chief secretary to the treasury|minister for the cabinet office|paymaster general|lord privy seal)/i;
  // Territorial Secretaries of State (NI/Scotland/Wales) only head their own
  // office. GOV.UK mid-reshuffle sometimes misfiles e.g. the NI Secretary into
  // business-trade/ukef; without this guard the picker would crown that
  // wrong-department minister as head.
  const territorialMismatch = (role: string) =>
    (/secretary of state for northern ireland/i.test(role) && deptSlug !== 'northern-ireland-office') ||
    (/secretary of state for scotland/i.test(role) && deptSlug !== 'scotland-office') ||
    (/secretary of state for wales/i.test(role) && deptSlug !== 'wales-office');
  const isHead = (role: string) =>
    HEAD_ROLE.test(role)
    && !/(under-secretary|under secretary|parliamentary secretary)/i.test(role)
    && !territorialMismatch(role);
  const leadIdx = rawMinisters.findIndex((m) => isHead(m.role));

  const ministers: MinisterRow[] = rawMinisters.map((m, i) => {
    const preserved = minByName.get(m.name);
    return {
      dept_slug: deptSlug,
      name: m.name,
      role: m.role,
      slug: m.slug,
      is_secretary_of_state: i === leadIdx,
      photo_url: preserved?.photo_url ?? null,
      member_id: preserved?.member_id ?? null,
      salary_band: preserved?.salary_band ?? null,
      resigned: preserved?.resigned ?? false,
      updated_at: now,
    };
  });

  // Officials are enriched per-person: appointment_date (started_on)
  // and previous_role come from the per-person Content API. Run those
  // fetches in parallel-batches of 4 to keep the wall time inside the
  // sync's 300s budget even for departments with 10+ officials.
  const rawOfficials = (data.links?.ordered_board_members as GovukPerson[]) || [];
  const officials: OfficialRow[] = [];
  const BATCH = 4;
  for (let i = 0; i < rawOfficials.length; i += BATCH) {
    const batch = rawOfficials.slice(i, i + BATCH);
    const enriched = await Promise.all(batch.map(async (m) => {
      const role = m.links?.role_appointments?.find((r) => r.details?.current)?.links?.role?.[0]?.title || '';
      if (!role) return null;
      const roleLower = role.toLowerCase();
      // Keep the existing coarse 'senior' / 'board' / 'other' category
      // (DepartmentClient reads from it) and add a finer role_rank.
      let category = 'other';
      if (roleLower.includes('permanent') || roleLower.includes('director general') || roleLower.includes('chief')) category = 'senior';
      if (roleLower.includes('non-executive') || roleLower.includes('board member')) category = 'board';
      const slug = m.base_path?.replace('/government/people/', '') || '';
      const { startedOn, previousRole } = await fetchPersonRoleHistory(slug);
      const preserved = offByName.get(m.title);
      return {
        dept_slug: deptSlug,
        name: m.title,
        role,
        slug,
        category,
        role_rank: classifyRoleRank(role),
        appointment_date: startedOn,
        previous_role: previousRole,
        photo_url: preserved?.photo_url ?? null,
        updated_at: now,
      } as OfficialRow;
    }));
    enriched.forEach((o) => { if (o) officials.push(o); });
  }

  const agencies: AgencyRow[] = ((data.links?.ordered_child_organisations as GovukChildOrg[]) || [])
    .filter((o) => o.details?.organisation_govuk_status?.status === 'live')
    .map((o) => ({
      dept_slug: deptSlug,
      name: o.title,
      url: o.web_url,
      acronym: o.details?.acronym || '',
      updated_at: now,
    }));

  // Replace-in-place per category, but ONLY when gov.uk returned rows for it.
  // A department never legitimately has zero ministers / officials / agencies,
  // so an empty result means the wrong org slug — e.g. during a department
  // rename gov.uk splits ministers onto the new slug and the civil-service
  // board onto the old one. Deleting on empty would wipe the existing rows;
  // skipping preserves them until gov.uk finishes migrating.
  if (ministers.length) {
    await supabase.from('dept_ministers').delete().eq('dept_slug', deptSlug);
    await supabase.from('dept_ministers').insert(ministers);
  }
  if (officials.length) {
    await supabase.from('dept_officials').delete().eq('dept_slug', deptSlug);
    await supabase.from('dept_officials').insert(officials);
  }
  if (agencies.length) {
    await supabase.from('dept_agencies').delete().eq('dept_slug', deptSlug);
    await supabase.from('dept_agencies').insert(agencies);
  }

  return {
    ministers: ministers.length,
    officials: officials.length,
    agencies: agencies.length,
    preserved_min: ministers.filter((m) => minByName.has(m.name)).length,
    preserved_off: officials.filter((o) => offByName.has(o.name)).length,
  };
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
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  // Manual override lock: departments listed in dept_sync_exclude are skipped
  // entirely, so a hand-set line-up (e.g. a fresh reshuffle appointment GOV.UK
  // hasn't published yet) is never overwritten by this rebuild. Remove the row
  // once GOV.UK catches up to resume automatic reconciliation.
  const excluded = new Set<string>();
  {
    const { data: ex } = await supabase.from('dept_sync_exclude').select('dept_slug');
    for (const r of (ex || []) as { dept_slug: string }[]) excluded.add(r.dept_slug);
  }

  // Self-healing locks: for each locked dept, clear the lock once GOV.UK has
  // caught up to our hand-set state. "Caught up" means GOV.UK's published lead
  // matches our lead AND every non-resigned minister we hold appears in GOV.UK's
  // published list. The second condition matters for junior-minister pins (e.g.
  // a fresh appointee GOV.UK hasn't listed yet): without it the head-only check
  // would clear the lock while our added minister is still missing upstream, and
  // the next rebuild would wipe them. Resigned rows are expected to be absent
  // from GOV.UK, so they are ignored. If we can't verify, the lock stays.
  const autoCleared: string[] = [];
  for (const deptSlug of Array.from(excluded)) {
    const govukSlug = govukSlugs[deptSlug];
    if (!govukSlug) continue;
    try {
      const data = await fetchOrg(govukSlug);
      const govNames = new Set(
        ((data.links?.ordered_ministers as GovukPerson[]) || []).map((m) => normalizeName(m.title)),
      );
      const govLead = ((data.links?.ordered_ministers as GovukPerson[]) || [])[0]?.title || '';
      const { data: rows } = await supabase
        .from('dept_ministers')
        .select('name, is_secretary_of_state, resigned')
        .eq('dept_slug', deptSlug);
      const stored = (rows || []) as { name: string; is_secretary_of_state: boolean; resigned: boolean }[];
      const manualLead = stored.find((r) => r.is_secretary_of_state)?.name || '';
      const headMatches = !!govLead && !!manualLead && normalizeName(govLead) === normalizeName(manualLead);
      const allActivePublished = stored
        .filter((r) => !r.resigned)
        .every((r) => govNames.has(normalizeName(r.name)));
      if (headMatches && allActivePublished) {
        await supabase.from('dept_sync_exclude').delete().eq('dept_slug', deptSlug);
        excluded.delete(deptSlug);
        autoCleared.push(deptSlug);
      }
    } catch {
      /* keep the lock if we can't verify */
    }
  }

  const results: Array<{ deptSlug: string; status: 'ok' | 'fail' | 'skipped'; detail: string }> = [];
  for (const [deptSlug, govukSlug] of Object.entries(govukSlugs)) {
    if (excluded.has(deptSlug)) {
      results.push({ deptSlug, status: 'skipped', detail: 'dept_sync_exclude (manual override active)' });
      continue;
    }
    try {
      const r = await syncDept(supabase, deptSlug, govukSlug);
      results.push({
        deptSlug,
        status: 'ok',
        detail: `mins=${r.ministers} (preserved ${r.preserved_min}), offs=${r.officials} (preserved ${r.preserved_off}), agencies=${r.agencies}`,
      });
    } catch (err) {
      results.push({ deptSlug, status: 'fail', detail: (err as Error).message });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    ok: results.filter((r) => r.status === 'ok').length,
    fail: results.filter((r) => r.status === 'fail').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    autoCleared,
    syncedAt: new Date().toISOString(),
    results,
  });
}
