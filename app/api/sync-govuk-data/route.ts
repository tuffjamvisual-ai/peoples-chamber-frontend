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
  details?: { current?: boolean };
  links?: { role?: Array<{ title: string }> };
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
  photo_url: string | null;
  updated_at: string;
};

type AgencyRow = {
  dept_slug: string;
  name: string;
  url: string;
  acronym: string;
  updated_at: string;
};

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

  const ministers: MinisterRow[] = ((data.links?.ordered_ministers as GovukPerson[]) || []).map((m, i) => {
    const role = m.links?.role_appointments?.find((r) => r.details?.current)?.links?.role?.[0]?.title || '';
    const preserved = minByName.get(m.title);
    return {
      dept_slug: deptSlug,
      name: m.title,
      role,
      slug: m.base_path?.replace('/government/people/', '') || '',
      is_secretary_of_state: i === 0,
      photo_url: preserved?.photo_url ?? null,
      member_id: preserved?.member_id ?? null,
      salary_band: preserved?.salary_band ?? null,
      resigned: preserved?.resigned ?? false,
      updated_at: now,
    };
  }).filter((m) => m.role);

  const officials: OfficialRow[] = ((data.links?.ordered_board_members as GovukPerson[]) || []).map((m) => {
    const role = m.links?.role_appointments?.find((r) => r.details?.current)?.links?.role?.[0]?.title || '';
    const roleLower = role.toLowerCase();
    let category = 'other';
    if (roleLower.includes('permanent') || roleLower.includes('director general') || roleLower.includes('chief')) category = 'senior';
    if (roleLower.includes('non-executive') || roleLower.includes('board member')) category = 'board';
    const preserved = offByName.get(m.title);
    return {
      dept_slug: deptSlug,
      name: m.title,
      role,
      slug: m.base_path?.replace('/government/people/', '') || '',
      category,
      photo_url: preserved?.photo_url ?? null,
      updated_at: now,
    };
  }).filter((m) => m.role);

  const agencies: AgencyRow[] = ((data.links?.ordered_child_organisations as GovukChildOrg[]) || [])
    .filter((o) => o.details?.organisation_govuk_status?.status === 'live')
    .map((o) => ({
      dept_slug: deptSlug,
      name: o.title,
      url: o.web_url,
      acronym: o.details?.acronym || '',
      updated_at: now,
    }));

  await supabase.from('dept_ministers').delete().eq('dept_slug', deptSlug);
  if (ministers.length) await supabase.from('dept_ministers').insert(ministers);
  await supabase.from('dept_officials').delete().eq('dept_slug', deptSlug);
  if (officials.length) await supabase.from('dept_officials').insert(officials);
  await supabase.from('dept_agencies').delete().eq('dept_slug', deptSlug);
  if (agencies.length) await supabase.from('dept_agencies').insert(agencies);

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

  const results: Array<{ deptSlug: string; status: 'ok' | 'fail'; detail: string }> = [];
  for (const [deptSlug, govukSlug] of Object.entries(govukSlugs)) {
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
    syncedAt: new Date().toISOString(),
    results,
  });
}
