// The site's share image (owner, 19 Nov 2026, Cowork ENTRY 395, replacing ENTRY 393's folder and title cards: "just the
// red stamp on the folder background colour"): 1200 x 630, the folder's paper colour edge to edge (#d8b97c, the folder's
// own colour in app/components/opengov-shell.css), the red OPENGOVT stamp centred and large, nothing else (no title, no
// address). Every page without an image of its own uses it, the hubs included; articles keep their headline cards.
// Static: no database reads, no request data, so it is drawn once at build time.
// Asset: public/og/stamp-uk.png, the header's stamp style (Bebas Neue, #7a1612, its border and padding, letter spacing
// 0.1em) with the text OPENGOVT.UK (owner, Cowork ENTRY 400), drawn in a browser from the live header's own style and
// font on 19 Nov 2026, transparent; turned -2.5 degrees as in the header.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handled } from '../settle';

export const BRAND_OG_SIZE = { width: 1200, height: 630 };

const FOLDER = '#d8b97c';
// The stamp file's own proportions (1400 x 317). It reads OPENGOVT.UK on the share cards (owner, ENTRY 400); the site
// header's stamp stays OPENGOVT.
const STAMP_RATIO = 317 / 1400;
const STAMP_WIDTH = 960;

const stamp = handled(readFile(join(process.cwd(), 'public/og/stamp-uk.png')));

export async function brandCard() {
  const buf = await stamp;
  const src = `data:image/png;base64,${buf.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: FOLDER }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={STAMP_WIDTH} height={Math.round(STAMP_WIDTH * STAMP_RATIO)} alt="" style={{ transform: 'rotate(-2.5deg)' }} />
      </div>
    ),
    BRAND_OG_SIZE,
  );
}
