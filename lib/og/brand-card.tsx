// Brand share cards (Cowork ENTRY 393, owner, 19 Nov 2026): the red OPENGOVT stamp on the manila folder, as in the site
// header (app/components/OpenGovShell.tsx: the newb folder with the brandStyle stamp), 1200 x 630 PNG.
//   brandDefaultCard(): the site's default share image (app/opengraph-image.tsx), every page without one of its own.
//   brandHubCard(title): a hub page's own image (app/mps/opengraph-image.tsx and the other hubs), the page title large.
// Static: no database reads, no request data, so each is drawn once at build time.
// Assets, all from the repo (no downloads):
//   public/og/folder.jpg  the header folder (public/newb.webp), its top 1086 x 570 scaled to 1200 x 630 on the desk
//                         colour of the site backdrop (#140d07);
//   public/og/stamp.png   the header wordmark stamp (public/brand-logo.png, itself rendered from the header's
//                         brandStyle in Bebas Neue), cream made transparent, ink #7a1612;
//   public/fonts/special-elite.ttf  the site's body font, as on the other share cards (lib/og-card.tsx).

import type { ReactElement } from 'react';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handled } from '../settle';

export const BRAND_OG_SIZE = { width: 1200, height: 630 };

const INK = '#14100d';
const STAMP_RED = '#7a1612';
// The stamp file's own proportions (1084 x 312).
const STAMP_RATIO = 312 / 1084;

const file = (p: string) => handled(readFile(join(process.cwd(), p)));
const specialElite = file('public/fonts/special-elite.ttf');
const folder = file('public/og/folder.jpg');
const stamp = file('public/og/stamp.png');

const dataUrl = (buf: Buffer, type: string) => `data:${type};base64,${buf.toString('base64')}`;

// The title's size: 76px up to 40 characters, then down evenly to 54px at 90 characters, and no smaller.
function titleSize(n: number): number {
  if (n <= 40) return 76;
  if (n >= 90) return 54;
  return Math.round(76 - ((n - 40) / 50) * 22);
}

async function render(body: (stampSrc: string) => ReactElement) {
  const [font, folderBuf, stampBuf] = await Promise.all([specialElite, folder, stamp]);
  const stampSrc = dataUrl(stampBuf, 'image/png');
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Special Elite', color: INK }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl(folderBuf, 'image/jpeg')} width={1200} height={630} alt="" style={{ position: 'absolute', left: 0, top: 0 }} />
        {/* The folder's tab (top right): the address, as a label. */}
        <div style={{ position: 'absolute', left: 716, top: 30, width: 416, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, letterSpacing: 2 }}>
          opengovt.uk
        </div>
        {body(stampSrc)}
      </div>
    ),
    { ...BRAND_OG_SIZE, fonts: [{ name: 'Special Elite', data: font, style: 'normal', weight: 400 }] },
  );
}

const Stamp = ({ src, width }: { src: string; width: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} width={width} height={Math.round(width * STAMP_RATIO)} alt="" style={{ transform: 'rotate(-2.5deg)' }} />
);

export function brandDefaultCard() {
  return render((src) => (
    <div style={{ position: 'absolute', left: 50, top: 150, width: 1115, height: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
      <Stamp src={src} width={820} />
      <div style={{ display: 'flex', marginTop: 54, fontSize: 36, textAlign: 'center', maxWidth: 940, lineHeight: 1.3 }}>
        Independent UK Parliament tracker and government transparency record
      </div>
    </div>
  ));
}

export function brandHubCard(title: string) {
  const t = title.trim();
  return render((src) => (
    <div style={{ position: 'absolute', left: 50, top: 0, width: 1115, height: 630, display: 'flex', flexDirection: 'column', padding: '58px 70px 0 70px' }}>
      <Stamp src={src} width={420} />
      <div style={{ display: 'flex', height: 3, width: 960, background: STAMP_RED, marginTop: 56, opacity: 0.85 }} />
      <div style={{ display: 'flex', alignItems: 'center', height: 330, fontSize: titleSize(t.length), lineHeight: 1.14, maxWidth: 960 }}>
        {t}
      </div>
    </div>
  ));
}
