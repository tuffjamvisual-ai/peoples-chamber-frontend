// The site's share image (owner, Cowork ENTRY 395, 19 Nov 2026): the red OPENGOVT stamp centred on the folder colour
// (lib/og/brand-card.tsx). Every page without an image of its own gets this one, for og:image and, through Next.js
// filling twitter:image from og:image, twitter:image too. Drawn once at build time; no database reads.
// public/og-image.png (the old plain text card) stays where it is for links already shared.

import { brandCard } from '@/lib/og/brand-card';

export const alt = 'opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return brandCard();
}
