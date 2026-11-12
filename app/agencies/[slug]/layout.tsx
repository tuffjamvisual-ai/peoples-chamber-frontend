import { wholeNameTitle } from '@/lib/seo-title';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { wholeSentences } from '@/lib/meta-description';

interface Props {
  params: Promise<{ slug: string }>;
}

// The page answers 404 for this address and shows the site's 'Page not found'; a layout cannot call notFound() for its
// metadata without losing the title, so it gives the not-found page's own title and robots (app/not-found.tsx).
const NOT_FOUND: Metadata = { title: 'Page not found', robots: { index: false, follow: false } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // dept_agencies stores the row used by /api/govuk-agency to populate
  // the agency profile. Look up by slug for the headline name + acronym.
  const { data: agency, error: agencyErr } = await supabase
    .from('dept_agencies')
    .select('name, acronym, dept_slug')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();
  if (agencyErr && agencyErr.code !== 'PGRST116') throw new Error(`/agencies/[slug] dept_agencies: ${agencyErr.message}`);
  // Description (owner, 7 Nov 2026, L4): the agency's own GOV.UK purpose (agency_cache.description, the first sentence on
  // its page) and its parent department as the page lists it, in whole sentences; without a purpose, as before.
  const { data: cached, error: cachedErr } = await supabase.from('agency_cache').select('name, acronym, description, parent_orgs').eq('slug', slug).maybeSingle();
  if (cachedErr && cachedErr.code !== 'PGRST116') throw new Error(`/agencies/[slug] agency_cache: ${cachedErr.message}`);
  // No agency_cache row means no agency page (the page's own rule): a real 404, noindex and 'Page not found' (T1-DONOR404).
  if (!cached) return NOT_FOUND;
  // An agency the page shows from agency_cache with no dept_agencies row (7 in all) takes its name and acronym from
  // agency_cache, the page's own source, instead of the site's default description (L6, 7 Nov 2026).
  const name = (agency?.name || (cached?.name as string | null) || '').trim();
  const acronym = agency?.name ? agency.acronym : (cached?.acronym as string | null);
  if (!name) return { title: 'Agency' };
  const title = acronym ? `${name} (${acronym})` : name;
  const purpose = (cached?.description as string | null)?.replace(/\s+/g, ' ').trim();
  const parents = ((cached?.parent_orgs as { name: string }[] | null) ?? []).map((o) => o.name).filter(Boolean);
  const description = purpose
    ? (() => {
      const said = purpose.match(/[^.!?]+[.!?]+(?=\s|$)/g)?.map((x) => x.trim()) ?? [purpose];
      // GOV.UK's purpose in the first person ("We are…", "We…", "Our…") would read as opengovt speaking (owner, 7 Nov 2026,
      // L5), so it is attributed with GOV.UK's words exact inside the quote marks: "We are X." becomes <name> says it is
      // "X.", any other first person sentence "In its own words: "…"". Later first person sentences are left out.
      const firstPerson = (x: string) => /^(We|Our|We're|We’re)\b/.test(x);
      const lead = /^We are /.test(said[0]) ? `${name} says it is "${said[0].slice('We are '.length)}"`
        : firstPerson(said[0]) ? `In its own words: "${said[0]}"` : said[0];
      // An attributed quote over 160 characters would be cut inside its quote marks, so the agency's profile sentence is used.
      if (lead.length > 160) return `${name}, UK government agency profile: ministers, board, parent department and recent activity.`;
      return wholeSentences([lead, parents.length ? `Parent department: ${parents.join(', ')}.` : null, ...said.slice(1).filter((x) => !firstPerson(x))]);
    })()
    : `${name}, UK government agency profile: ministers, board, parent department and recent activity.`;
  return {
    title: wholeNameTitle(title),
    description,
    alternates: { canonical: `/agencies/${slug}` },
  };
}

export default function AgencySlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
