// Page specific share images (OG1, audit, 8 Nov 2026), drawn the same way as the investigation and organisation cards
// (app/editorials/[slug]/opengraph-image.tsx, app/organisations/[slug]/opengraph-image.tsx): the site's cream paper with
// ink rules, the page type as the red kicker, the title, an optional second line, and opengovt.uk, in Special Elite from
// the site's own font file. 1200 x 630 PNG. The site's default image (public/og-image.png, app/layout.tsx) stays for
// every page without one of its own.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handled } from './settle';

export const OG_SIZE = { width: 1200, height: 630 };

const INK = '#14100d';
const CREAM = '#f4e8d4';
const ACCENT = '#7a1612';

// Read once when the module loads and awaited per image, so handled at once (lib/settle.ts): a missing font still fails
// the image where it is awaited, but can no longer end the whole server process before any image is asked for.
const specialElite = handled(readFile(join(process.cwd(), 'public/fonts/special-elite.ttf')));

// The title's size: 72px up to 60 characters, then down evenly to 46px at 140 characters, and no smaller; longer
// titles are cut at 160 characters (the longest bill title is about 150).
function titleSize(n: number): number {
  if (n <= 60) return 72;
  if (n >= 140) return 46;
  return Math.round(72 - ((n - 60) / 80) * 26);
}
// Cut at the last whole word that fits, so no word is broken.
const cut = (s: string, max: number) => {
  if (s.length <= max) return s;
  const head = s.slice(0, max - 3);
  const space = head.lastIndexOf(' ');
  return `${(space > max / 2 ? head.slice(0, space) : head).replace(/[\s,;:(]+$/, '')}...`;
};

export async function ogCard({ kicker, title, line }: { kicker: string; title: string; line?: string | null }) {
  const t = cut(title.trim(), 160);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: CREAM, color: INK, fontFamily: 'Special Elite', padding: '72px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 3, background: INK }} />
          <div style={{ display: 'flex', marginTop: 28, fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: ACCENT }}>{kicker}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 315 }}>
          <div style={{ display: 'flex', fontSize: titleSize(t.length), lineHeight: 1.12 }}>{t}</div>
          {line ? <div style={{ display: 'flex', marginTop: 20, fontSize: 34, lineHeight: 1.3 }}>{cut(line, 120)}</div> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 34, letterSpacing: 2, marginBottom: 24 }}>opengovt.uk</div>
          <div style={{ display: 'flex', height: 3, background: INK }} />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: 'Special Elite', data: await specialElite, style: 'normal', weight: 400 }] },
  );
}
