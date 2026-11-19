// The site's share image (owner, 19 Nov 2026, Cowork ENTRY 395, 400, 401): 1200 x 630, the folder's paper colour edge to
// edge (#d8b97c, the folder's own colour in app/components/opengov-shell.css), the red OPENGOVT.UK stamp centred and
// large, drawn as vector (lib/og/stamp.tsx), nothing else. Every page without an image of its own uses it, the hubs
// included; articles and other records have their own cards (lib/og-card.tsx). Static: drawn once at build time.

import { ImageResponse } from 'next/og';
import { Stamp, bebasFont } from './stamp';

export const BRAND_OG_SIZE = { width: 1200, height: 630 };
export const FOLDER = '#d8b97c';

export async function brandCard() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: FOLDER }}>
        <Stamp width={960} />
      </div>
    ),
    { ...BRAND_OG_SIZE, fonts: [await bebasFont()] },
  );
}
