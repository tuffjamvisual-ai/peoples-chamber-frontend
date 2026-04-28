import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // dept_agencies stores the row used by /api/govuk-agency to populate
  // the agency profile. Look up by slug for the headline name + acronym.
  const { data: agency } = await supabase
    .from('dept_agencies')
    .select('name, acronym, dept_slug')
    .eq('slug', slug)
    .maybeSingle();
  if (!agency || !agency.name) return { title: 'Agency' };
  const title = agency.acronym ? `${agency.name} (${agency.acronym})` : agency.name;
  return {
    title,
    description: `${agency.name} — UK government agency profile: ministers, board, parent department and recent activity.`,
    alternates: { canonical: `/agencies/${slug}` },
  };
}

export default function AgencySlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
