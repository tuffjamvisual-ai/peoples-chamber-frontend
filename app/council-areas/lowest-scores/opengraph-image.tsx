// Share image for /council-areas/lowest-scores (Cowork ENTRY 415 HEADLINE): the page headline. Static, like the page.
import { ogCard } from '@/lib/og-card';

export const alt = 'The 10 Least Desirable Places to Live in England, on the Official Figures';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return ogCard({ title: 'The 10 Least Desirable Places to Live in England, on the Official Figures', line: 'Not a ranking of how well councils are run' });
}
