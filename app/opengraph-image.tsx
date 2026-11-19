// The site's default share image (Cowork ENTRY 393, 19 Nov 2026): the red OPENGOVT stamp on the manila folder
// (lib/og/brand-card.tsx). Every page without an image of its own gets this one, for og:image and, through Next.js
// filling twitter:image from og:image, twitter:image too. Drawn once at build time; no database reads.
// public/og-image.png (the old plain text card) stays where it is for links already shared.

import { brandDefaultCard } from '@/lib/og/brand-card';

export const alt = 'opengovt: independent UK Parliament tracker and government transparency record';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return brandDefaultCard();
}
