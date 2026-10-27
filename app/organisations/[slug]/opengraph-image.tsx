// Share image for each organisation page (report 71): the organisation's name and what the page holds, on the site's
// cream paper in Special Elite, like the investigation cards (app/editorials/[slug]/opengraph-image.tsx). 1200 x 630
// PNG, drawn on first request and cached for a day like the page.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getOrganisation, orgSummaryLine } from '@/lib/organisations';

export const alt = 'Organisation records from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const CREAM = '#f4e8d4';
const ACCENT = '#7a1612';

const specialElite = await readFile(join(process.cwd(), 'public/fonts/special-elite.ttf'));

function nameSize(text: string): number {
  const n = text.length;
  if (n <= 40) return 72;
  if (n >= 110) return 44;
  return Math.round(72 - ((n - 40) / 70) * 28);
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganisation(slug);
  const name = org ? org.name : 'Organisations';
  const line = org ? orgSummaryLine(org).replace(`${org.name}: `, '') : 'Donations, contracts, grants and lobbying';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: CREAM, color: INK, fontFamily: 'Special Elite', padding: '72px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 3, background: INK }} />
          <div style={{ display: 'flex', marginTop: 28, fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: ACCENT }}>Organisation</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 315 }}>
          <div style={{ display: 'flex', fontSize: nameSize(name), lineHeight: 1.12 }}>{name.length > 120 ? `${name.slice(0, 117)}...` : name}</div>
          <div style={{ display: 'flex', marginTop: 20, fontSize: 30, lineHeight: 1.3 }}>{line.length > 140 ? `${line.slice(0, 137)}...` : line}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 34, letterSpacing: 2, marginBottom: 24 }}>opengovt.uk</div>
          <div style={{ display: 'flex', height: 3, background: INK }} />
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Special Elite', data: specialElite, style: 'normal', weight: 400 }] },
  );
}
