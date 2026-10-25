// Share image for each investigation (23 Oct 2026): the headline on the site's cream paper with its ink rules and red
// kicker, in Special Elite, the site's own font file (public/fonts/special-elite.ttf). 1200 x 630 PNG, built on first
// request and cached like the page. Next.js points og:image here; the page's metadata points twitter:image at it too.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { editorials } from '@/lib/editorials';

export const alt = 'Report headline from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400;

// Built at build time for every investigation (25 Oct 2026, report 43). Without this list the image route was dynamic
// and drew the image again on every request (p95 1.2 s).
export function generateStaticParams() {
  return Object.entries(editorials).filter(([, p]) => p.kind !== 'briefing').map(([slug]) => ({ slug }));
}

const INK = '#14100d';
const CREAM = '#f4e8d4';
const ACCENT = '#7a1612';

const specialElite = await readFile(join(process.cwd(), 'public/fonts/special-elite.ttf'));

// Headline size (23 Oct 2026, larger so it reads as a thumbnail): 72px up to 60 characters, then scaling down evenly
// to 48px at 130 characters (the longest headline), and no smaller beyond that.
const HEADLINE_BLOCK_HEIGHT = 315; // half the card
function headlineSize(text: string): number {
  const n = text.length;
  if (n <= 60) return 72;
  if (n >= 130) return 48;
  return Math.round(72 - ((n - 60) / 70) * 24);
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = editorials[slug];
  const headline = piece && piece.kind !== 'briefing' ? piece.headline : 'UK politics, in the open';
  const kicker = piece && piece.kind !== 'briefing' ? (piece.opinion ? 'Commentary' : 'Report') : 'Independent · Nonpartisan';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: CREAM,
          color: INK,
          fontFamily: 'Special Elite',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 3, background: INK }} />
          <div style={{ display: 'flex', marginTop: 28, fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: ACCENT }}>
            {kicker}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: HEADLINE_BLOCK_HEIGHT, fontSize: headlineSize(headline), lineHeight: 1.12 }}>
          {headline}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 34, letterSpacing: 2, marginBottom: 24 }}>opengovt.uk</div>
          <div style={{ display: 'flex', height: 3, background: INK }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Special Elite', data: specialElite, style: 'normal', weight: 400 }],
    },
  );
}
