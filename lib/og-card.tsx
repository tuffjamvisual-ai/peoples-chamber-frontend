// Every generated share card (owner, 19 Nov 2026, Cowork ENTRY 397, replacing the cream cards of OG1 and 23 Oct): the
// folder's paper colour edge to edge (as the default card, ENTRY 395, lib/og/brand-card.tsx), the red OPENGOVT stamp
// small at the top left, the headline in the site's typewriter face (Special Elite, public/fonts/special-elite.ttf) in
// near black, an optional short second line, no address, no folder shape. A long headline wraps to at most 4 lines and
// gets smaller to fit (fitTitle). Used by the article and briefing cards (app/editorials/[slug]), organisations, bills,
// councils and This week. 1200 x 630 PNG.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handled } from './settle';

export const OG_SIZE = { width: 1200, height: 630 };

const INK = '#14100d';
const FOLDER = '#d8b97c';
const PAD_X = 80;
const TEXT_WIDTH = OG_SIZE.width - PAD_X * 2;
// The OPENGOVT.UK stamp (public/og/stamp-uk.png, 1400 x 317; owner, ENTRY 400).
const STAMP_RATIO = 317 / 1400;
const STAMP_WIDTH = 340;

// Read once when the module loads and awaited per image, so handled at once (lib/settle.ts).
const specialElite = handled(readFile(join(process.cwd(), 'public/fonts/special-elite.ttf')));
const stamp = handled(readFile(join(process.cwd(), 'public/og/stamp-uk.png')));

// Special Elite's letters are about 0.6 of the font size wide (a typewriter face, near monospaced).
const CHAR_WIDTH = 0.6;
// The lines a text takes at a size, wrapping at spaces as the card does.
export function linesAt(text: string, size: number, width = TEXT_WIDTH): number {
  const perLine = Math.max(8, Math.floor(width / (size * CHAR_WIDTH)));
  let lines = 1, used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const len = word.length;
    if (used === 0) used = len;
    else if (used + 1 + len <= perLine) used += 1 + len;
    else { lines += 1; used = len; }
    if (len > perLine) lines += Math.floor(len / perLine); // a very long word runs on
  }
  return lines;
}
// The largest size (76px down to 40px) at which the headline takes at most 4 lines and fits the space left under the
// stamp; at 40px a headline still longer than 4 lines is cut at the last whole word that fits.
export function fitTitle(raw: string, room = 360): { text: string; size: number } {
  const text = raw.trim().replace(/\s+/g, ' ');
  for (let size = 76; size >= 40; size -= 2) {
    const n = linesAt(text, size);
    if (n <= 4 && n * size * 1.15 <= room) return { text, size };
  }
  const words = text.split(' ');
  while (words.length > 1 && linesAt(`${words.join(' ')}...`, 40) > 4) words.pop();
  return { text: `${words.join(' ').replace(/[\s,;:(]+$/, '')}...`, size: 40 };
}

export async function ogCard({ title, line }: { kicker?: string; title: string; line?: string | null }) {
  const [font, stampBuf] = await Promise.all([specialElite, stamp]);
  const room = line ? 300 : 360;
  const t = fitTitle(title, room);
  const l = line ? (line.length > 90 ? `${line.slice(0, 87).replace(/\s+\S*$/, '')}...` : line) : null;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: FOLDER, color: INK, fontFamily: 'Special Elite', padding: `56px ${PAD_X}px 56px ${PAD_X}px` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${stampBuf.toString('base64')}`} width={STAMP_WIDTH} height={Math.round(STAMP_WIDTH * STAMP_RATIO)} alt="" style={{ transform: 'rotate(-2.5deg)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
          <div style={{ display: 'flex', fontSize: t.size, lineHeight: 1.15, maxWidth: TEXT_WIDTH }}>{t.text}</div>
          {l ? <div style={{ display: 'flex', marginTop: 20, fontSize: 32, lineHeight: 1.3, maxWidth: TEXT_WIDTH }}>{l}</div> : null}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: 'Special Elite', data: font, style: 'normal', weight: 400 }] },
  );
}
