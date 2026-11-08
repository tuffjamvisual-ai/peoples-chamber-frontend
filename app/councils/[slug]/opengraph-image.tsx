// Share image for each council page (OG1, audit, 8 Nov 2026): "Council" and the council's name, with its type and
// country, on the site's share card (lib/og-card.tsx). No spending, ratings or other figures, which change. An unknown
// slug gets the plain "Councils" card. Drawn on first request and kept for a week, like the page.

import { ogCard } from '@/lib/og-card';
import { supabase } from '@/lib/supabase';

export const alt = 'Council from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 604800;
export function generateStaticParams() { return []; }

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data, error } = await supabase.from('councils').select('name, type_label, country').eq('slug', slug).maybeSingle();
  if (error) throw new Error(`/councils/[slug]/opengraph-image councils: ${error.message}`);
  if (!data) return ogCard({ kicker: 'Councils', title: 'Councils across the UK' });
  return ogCard({ kicker: 'Council', title: data.name, line: [data.type_label, data.country].filter(Boolean).join(', ') });
}
