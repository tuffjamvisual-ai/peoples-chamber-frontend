// Share image for /mps (Cowork ENTRY 393, 19 Nov 2026): the brand card (lib/og/brand-card.tsx) with the owner's title.
// Drawn once at build time; no database reads.

import { brandHubCard } from '@/lib/og/brand-card';

export const alt = 'Find your MP: votes, expenses, earnings, interests. opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return brandHubCard('Find your MP: votes, expenses, earnings, interests');
}
