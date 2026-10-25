// Onward links for the party pages (owner's approval, 21 Oct 2026). The PartySidebar already links each party's
// manifesto, verdict, money, whip and MP pages; these add what it does not: the topic hub for each policy theme, the
// party's MPs with second jobs, and a "Read next" block at the end of the verdict page.
import { supabase } from '@/lib/supabase';
import { partyToSlug } from '@/app/second-jobs/_lib/data';
import type { ReadNextLink } from '@/lib/read-next';

// party_policies.theme -> lib/topics.ts slug
export const THEME_TOPIC: Record<string, { slug: string; title: string }> = {
  'Climate & Energy': { slug: 'climate-and-energy', title: 'Climate and Energy' },
  'Constitution & Devolution': { slug: 'constitutional-reform', title: 'Constitutional Reform' },
  'Economy & Tax': { slug: 'economy-and-tax', title: 'Economy and Tax' },
  'Housing': { slug: 'housing', title: 'Housing' },
  'NHS & Health': { slug: 'nhs-and-health', title: 'the NHS and Health' },
  'Welfare & Work': { slug: 'welfare-and-benefits', title: 'Welfare and Benefits' },
  'Defence & Foreign Policy': { slug: 'defence', title: 'Defence' },
  'Crime & Justice': { slug: 'justice-and-policing', title: 'Justice and Policing' },
  'Europe': { slug: 'foreign-affairs', title: 'Foreign Affairs' },
  'Immigration & Asylum': { slug: 'immigration', title: 'Immigration' },
  'Education': { slug: 'education', title: 'Education' },
};

// The party's MPs with paid outside roles, as /second-jobs counts them (second_jobs_summary, migration 2026-10-21a);
// slug is the /second-jobs/[slug] page, which exists only when the count is above 0.
export async function partySecondJobs(mpPartyString: string | null): Promise<{ slug: string; count: number } | null> {
  if (!mpPartyString) return null;
  const slug = partyToSlug(mpPartyString);
  const { data, error } = await supabase.rpc('second_jobs_summary');
  if (error) throw new Error(`second_jobs_summary: ${error.message}`);
  const mps = ((data as { mps?: { party: string | null }[] } | null)?.mps) || [];
  const count = mps.filter((m) => partyToSlug(m.party) === slug).length;
  return count > 0 ? { slug, count } : null;
}

export function partyBioNextLinks(party: { slug: string; name: string }, secondJobs: { slug: string; count: number } | null): ReadNextLink[] {
  const links: ReadNextLink[] = [
    { href: `/parties/${party.slug}`, label: `${party.name}: manifesto vs record`, note: 'What it promised in 2024 and what it has done since, on 11 themes' },
    { href: `/parties/${party.slug}/money`, label: `${party.name}: money`, note: 'Every declared donation, by year, donor and sector' },
    { href: `/parties/${party.slug}/whip`, label: `${party.name}: the whip`, note: 'How often its MPs have voted against the party line' },
  ];
  if (secondJobs) links.push({ href: `/second-jobs/${secondJobs.slug}`, label: `${party.name} MPs with second jobs`, note: `${secondJobs.count} MP${secondJobs.count === 1 ? ' has' : 's have'} paid roles outside Parliament` });
  links.push({ href: '/parties/manifestos', label: 'Compare all the parties' });
  return links.slice(0, 5);
}
