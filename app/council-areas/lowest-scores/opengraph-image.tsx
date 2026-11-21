// Share image for /council-areas/lowest-scores: the page headline (Cowork ENTRY 493 item 1, built from the data). Static, like the page.
import { ogCard } from '@/lib/og-card';
import { HEADLINE } from './data';

export const alt = HEADLINE;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return ogCard({ title: HEADLINE, line: 'Not a ranking of how well councils are run' });
}
