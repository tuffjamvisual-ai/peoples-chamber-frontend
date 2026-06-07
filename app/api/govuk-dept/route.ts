import { NextResponse } from 'next/server';
import { govukSlugs } from '@/lib/govuk-slugs';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

export type GovukDeptMinister = {
  name: string;
  photo: string;
  role: string;
  responsibilities: string;
  url: string;
  slug: string;
  is_secretary_of_state?: boolean;
  member_id?: number | null;
  resigned?: boolean;
};

export type GovukDeptBoardMember = {
  name: string;
  photo: string;
  role: string;
  url: string;
  slug: string;
  category?: string;
  member_id?: number | null;
  role_rank?: string | null;
  appointment_date?: string | null;     // ISO YYYY-MM-DD
  previous_role?: string | null;
  scs_band?: string | null;             // 'scs1' … 'scs4'
  pay_floor?: number | null;            // £
  pay_ceiling?: number | null;
};

export type GovukDeptData = {
  ministers: GovukDeptMinister[];
  boardMembers: GovukDeptBoardMember[];
  childOrgs: { name: string; url: string; acronym: string }[];
  socialMedia: { service: string; url: string; title: string }[];
  foiEmail: string;
  pressPhone: string;
};

const EMPTY: GovukDeptData = {
  ministers: [],
  boardMembers: [],
  childOrgs: [],
  socialMedia: [],
  foiEmail: '',
  pressPhone: '',
};

const normalize = (s: string | null | undefined): string => {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/^(the rt hon|rt hon|sir|dame|dr|mr|mrs|ms|miss|lord|baroness|baron)\s+/i, '')
    .replace(/\s+(mp|mbe|obe|kbe|dbe|cbe|kcb|gcb|dso|mc|qc|kc|bt)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

type MinisterRow = { name: string | null; role: string; slug: string; photo_url?: string | null; is_secretary_of_state?: boolean; member_id?: number | null; resigned?: boolean | null };
type OfficialRow = {
  name: string | null;
  role: string;
  slug: string;
  category?: string;
  member_id?: number | null;
  photo_url?: string | null;
  role_rank?: string | null;
  appointment_date?: string | null;
  previous_role?: string | null;
};
type PersonCachePay = { slug: string; scs_band?: string | null; actual_pay_floor?: number | null; actual_pay_ceiling?: number | null };
type AgencyRow = { name: string; url: string; acronym: string };

async function fetchGovukJson(govukSlug: string) {
  try {
    const res = await fetch(
      `https://www.gov.uk/api/content/government/organisations/${govukSlug}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Path-B-only contact extractor (used when no ministers data exists in
// Supabase). Path A reads contacts from the department_contacts table
// instead, so this path's gov.uk dependency only matters for the rare
// no-data case. featuredDocs/featuredLinks dropped — never rendered on
// /departments/[slug]. /agencies has its own route.
function extractGovukPublicBits(data: { details?: Record<string, unknown>; links?: Record<string, unknown> } | null) {
  if (!data) return { socialMedia: [], foiEmail: '', pressPhone: '' };
  const details = data.details as Record<string, unknown> | undefined;
  const links = data.links as Record<string, unknown> | undefined;
  const socialMedia = ((details?.social_media_links as Array<{ service_type: string; href: string; title: string }>) || []).map((s) => ({ service: s.service_type, url: s.href, title: s.title }));
  const foiContacts = links?.ordered_foi_contacts as Array<{ details?: { email_addresses?: Array<{ email: string }> } }> | undefined;
  const foiEmail = foiContacts?.[0]?.details?.email_addresses?.[0]?.email || '';
  const orderedContacts = links?.ordered_contacts as Array<{ title?: string; details?: { phone_numbers?: Array<{ number: string }> } }> | undefined;
  const pressPhone = orderedContacts?.find((c) => c.title?.toLowerCase().includes('media'))?.details?.phone_numbers?.[0]?.number || '';
  return { socialMedia, foiEmail, pressPhone };
}

export async function getGovukDept(slug: string): Promise<GovukDeptData> {
  try {
    // All four queries fire in one round-trip. department_contacts
    // (social/foi/press) is now cached in Supabase, refreshed by
    // /api/sync-department-contacts, so the gov.uk fetch is no longer
    // on the hot path.
    const [ministersRes, officialsRes, agenciesRes, contactsRes, mpRowsRes] = await Promise.all([
      supabase.from('dept_ministers').select('*').eq('dept_slug', slug).order('id'),
      supabase
        .from('dept_officials')
        .select('name, role, slug, category, member_id, photo_url, role_rank, appointment_date, previous_role')
        .eq('dept_slug', slug)
        .order('id'),
      supabase.from('dept_agencies').select('*').eq('dept_slug', slug).order('name'),
      supabase
        .from('department_contacts')
        .select('social_media_links, foi_email, press_phone')
        .eq('dept_slug', slug)
        .maybeSingle(),
      supabase
        .from('mps')
        .select('member_id, name, display_name, photo_url')
        .eq('current_member', true),
    ]);

    // Pull pay band data for every official slug in one extra query
    // (avoids N+1 inside the boardMembers map). Sparse — only ~9
    // records site-wide today but the join lights up correctly when
    // the organogram sync repopulates.
    const officialSlugs = (officialsRes.data || [])
      .map((o: OfficialRow) => o.slug)
      .filter((s): s is string => !!s);
    const payRes = officialSlugs.length
      ? await supabase
          .from('person_cache')
          .select('slug, scs_band, actual_pay_floor, actual_pay_ceiling')
          .in('slug', officialSlugs)
      : { data: [] as PersonCachePay[] };
    const payBySlug = new Map<string, PersonCachePay>();
    ((payRes.data || []) as PersonCachePay[]).forEach((p) => payBySlug.set(p.slug, p));

    if (ministersRes.data && ministersRes.data.length > 0) {
      const mpRows = mpRowsRes.data;
      const mpByName = new Map<string, { member_id: number; photo_url: string | null }>();
      (mpRows || []).forEach((mp) => {
        [normalize(mp.display_name), normalize(mp.name)].forEach((k) => {
          if (k && !mpByName.has(k)) mpByName.set(k, { member_id: mp.member_id, photo_url: mp.photo_url });
        });
      });
      const resolveMp = (rawName: string | null | undefined) => mpByName.get(normalize(rawName));

      const ministers: GovukDeptMinister[] = (ministersRes.data as MinisterRow[]).map((m) => {
        const mp = resolveMp(m.name);
        return {
          name: m.name || '',
          photo: mp?.photo_url || m.photo_url || '',
          role: m.role,
          slug: m.slug,
          url: '',
          responsibilities: '',
          is_secretary_of_state: m.is_secretary_of_state,
          member_id: m.member_id ?? mp?.member_id ?? null,
          resigned: !!m.resigned,
        };
      });
      const boardMembers: GovukDeptBoardMember[] = ((officialsRes.data || []) as OfficialRow[]).map((m) => {
        const mp = resolveMp(m.name);
        const pay = m.slug ? payBySlug.get(m.slug) : undefined;
        return {
          name: m.name || '',
          photo: mp?.photo_url || m.photo_url || '',
          role: m.role,
          slug: m.slug,
          url: '',
          category: m.category,
          member_id: m.member_id ?? mp?.member_id ?? null,
          role_rank: m.role_rank ?? null,
          appointment_date: m.appointment_date ?? null,
          previous_role: m.previous_role ?? null,
          scs_band: pay?.scs_band ?? null,
          pay_floor: pay?.actual_pay_floor ?? null,
          pay_ceiling: pay?.actual_pay_ceiling ?? null,
        };
      });
      const childOrgs = ((agenciesRes.data || []) as AgencyRow[]).map((o) => ({
        name: o.name,
        url: o.url,
        acronym: o.acronym,
      }));

      const contacts = contactsRes.data || { social_media_links: [], foi_email: '', press_phone: '' };
      return {
        ministers,
        boardMembers,
        childOrgs,
        socialMedia: (contacts.social_media_links as { service: string; url: string; title: string }[]) || [],
        foiEmail: contacts.foi_email || '',
        pressPhone: contacts.press_phone || '',
      };
    }

    // Fallback to live gov.uk only
    const govukSlug = govukSlugs[slug];
    if (!govukSlug) return EMPTY;
    const data = await fetchGovukJson(govukSlug);
    if (!data) return EMPTY;
    const links = data.links as Record<string, unknown> | undefined;
    const ministers: GovukDeptMinister[] = ((links?.ordered_ministers as Array<{ title: string; base_path?: string; web_url: string; links?: { role_appointments?: Array<{ details?: { current?: boolean }; links?: { role?: Array<{ title: string }> } }> } }>) || []).map((m, i) => {
      const currentRole = m.links?.role_appointments?.find((r) => r.details?.current);
      return {
        name: m.title,
        photo: '',
        role: currentRole?.links?.role?.[0]?.title || '',
        slug: m.base_path?.replace('/government/people/', '') || '',
        url: m.web_url,
        responsibilities: '',
        is_secretary_of_state: i === 0,
      };
    }).filter((m) => m.role);
    const boardMembers = ((links?.ordered_board_members as Array<{ title: string; base_path?: string; web_url: string; links?: { role_appointments?: Array<{ details?: { current?: boolean }; links?: { role?: Array<{ title: string }> } }> } }>) || []).map((m) => {
      const currentRole = m.links?.role_appointments?.find((r) => r.details?.current);
      return {
        name: m.title,
        photo: '',
        role: currentRole?.links?.role?.[0]?.title || '',
        slug: m.base_path?.replace('/government/people/', '') || '',
        url: m.web_url,
      };
    }).filter((m) => m.role);
    const childOrgs = ((links?.ordered_child_organisations as Array<{ title: string; web_url: string; details?: { acronym?: string; organisation_govuk_status?: { status?: string } } }>) || [])
      .filter((o) => o.details?.organisation_govuk_status?.status === 'live')
      .map((o) => ({ name: o.title, url: o.web_url, acronym: o.details?.acronym || '' }));
    return { ministers, boardMembers, childOrgs, ...extractGovukPublicBits(data) };
  } catch {
    return EMPTY;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  return NextResponse.json(await getGovukDept(slug));
}
