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

export type GovukDeptData = {
  ministers: GovukDeptMinister[];
  boardMembers: { name: string; photo: string; role: string; url: string; slug: string; category?: string; member_id?: number | null }[];
  childOrgs: { name: string; url: string; acronym: string }[];
  featuredDocs: { title: string; url: string; summary: string; type: string; date: string }[];
  featuredLinks: { title: string; url: string }[];
  socialMedia: { service: string; url: string; title: string }[];
  foiEmail: string;
  pressPhone: string;
};

const EMPTY: GovukDeptData = {
  ministers: [],
  boardMembers: [],
  childOrgs: [],
  featuredDocs: [],
  featuredLinks: [],
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
type OfficialRow = { name: string | null; role: string; slug: string; category?: string; member_id?: number | null; photo_url?: string | null };
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

function extractGovukPublicBits(data: { details?: Record<string, unknown>; links?: Record<string, unknown> } | null) {
  if (!data) return { featuredDocs: [], featuredLinks: [], socialMedia: [], foiEmail: '', pressPhone: '' };
  const details = data.details as Record<string, unknown> | undefined;
  const links = data.links as Record<string, unknown> | undefined;
  const featuredDocs = ((details?.ordered_featured_documents as Array<{ title: string; href: string; summary?: string; document_type?: string; public_updated_at?: string }>) || []).map((d) => ({
    title: d.title,
    url: `https://www.gov.uk${d.href}`,
    summary: (d.summary || '').replace(/<[^>]+>/g, '').trim(),
    type: d.document_type || '',
    date: d.public_updated_at || '',
  }));
  const featuredLinks = ((details?.ordered_featured_links as Array<{ title: string; href: string }>) || []).map((l) => ({ title: l.title, url: l.href }));
  const socialMedia = ((details?.social_media_links as Array<{ service_type: string; href: string; title: string }>) || []).map((s) => ({ service: s.service_type, url: s.href, title: s.title }));
  const foiContacts = links?.ordered_foi_contacts as Array<{ details?: { email_addresses?: Array<{ email: string }> } }> | undefined;
  const foiEmail = foiContacts?.[0]?.details?.email_addresses?.[0]?.email || '';
  const orderedContacts = links?.ordered_contacts as Array<{ title?: string; details?: { phone_numbers?: Array<{ number: string }> } }> | undefined;
  const pressPhone = orderedContacts?.find((c) => c.title?.toLowerCase().includes('media'))?.details?.phone_numbers?.[0]?.number || '';
  return { featuredDocs, featuredLinks, socialMedia, foiEmail, pressPhone };
}

export async function getGovukDept(slug: string): Promise<GovukDeptData> {
  try {
    const [ministersRes, officialsRes, agenciesRes] = await Promise.all([
      supabase.from('dept_ministers').select('*').eq('dept_slug', slug).order('id'),
      supabase.from('dept_officials').select('*').eq('dept_slug', slug).order('id'),
      supabase.from('dept_agencies').select('*').eq('dept_slug', slug).order('name'),
    ]);

    if (ministersRes.data && ministersRes.data.length > 0) {
      const { data: mpRows } = await supabase
        .from('mps')
        .select('member_id, name, display_name, photo_url')
        .eq('current_member', true);
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
          photo: m.photo_url || mp?.photo_url || '',
          role: m.role,
          slug: m.slug,
          url: '',
          responsibilities: '',
          is_secretary_of_state: m.is_secretary_of_state,
          member_id: m.member_id ?? mp?.member_id ?? null,
          resigned: !!m.resigned,
        };
      });
      const boardMembers = ((officialsRes.data || []) as OfficialRow[]).map((m) => {
        const mp = resolveMp(m.name);
        return {
          name: m.name || '',
          photo: m.photo_url || mp?.photo_url || '',
          role: m.role,
          slug: m.slug,
          url: '',
          category: m.category,
          member_id: m.member_id ?? mp?.member_id ?? null,
        };
      });
      const childOrgs = ((agenciesRes.data || []) as AgencyRow[]).map((o) => ({
        name: o.name,
        url: o.url,
        acronym: o.acronym,
      }));

      const govukSlug = govukSlugs[slug];
      const govukJson = govukSlug ? await fetchGovukJson(govukSlug) : null;
      return { ministers, boardMembers, childOrgs, ...extractGovukPublicBits(govukJson) };
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
