// The share cards' stamp drawn as vector (owner, 19 Nov 2026, Cowork ENTRY 401: "draw the stamp as vector ... not a scaled
// bitmap"): the site header's stamp style (app/components/OpenGovShell.tsx brandStyle: Bebas Neue, #7a1612, border
// 0.07em, padding 0.14em 0.32em 0.06em, letter spacing 0.1em, line height 1, upper case) with the text OPENGOVT.UK
// (ENTRY 400; the header itself says OPENGOVT), set square, box and text level (owner: 'square it up', ENTRY 401/402;
// the header's stamp keeps its own turn). The image renderer turns the letters into outlines
// from the font file and the border into a rectangle, and anti-aliases them at the card's own size, so nothing is
// scaled up. Font: public/fonts/bebas-neue.ttf, the Latin Bebas Neue file the site itself serves through next/font
// (Google Fonts; SIL Open Font Licence), saved as TTF because the renderer does not read WOFF2.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handled } from '../settle';

export const STAMP_RED = '#7a1612';
export const STAMP_TEXT = 'opengovt.uk';
// The stamp's width as a multiple of its font size (Bebas Neue, 11 letters at 0.1em spacing, padding and border),
// measured from a browser rendering of the header style (5.93 em) less the trailing letter space (0.1 em): 5.83 em.
export const STAMP_EM_WIDTH = 5.83;

export const bebasNeue = handled(readFile(join(process.cwd(), 'public/fonts/bebas-neue.ttf')));
export const bebasFont = async () => ({ name: 'Bebas Neue', data: await bebasNeue, style: 'normal' as const, weight: 400 as const });

/** The stamp at a given width in pixels (its height follows from the font). */
export function Stamp({ width }: { width: number }) {
  const fontSize = width / STAMP_EM_WIDTH;
  return (
    <div
      style={{
        display: 'flex',
        border: `${fontSize * 0.07}px solid ${STAMP_RED}`,
        // The right padding less the letter spacing the last letter carries, so the word sits centred in the box.
        padding: `${fontSize * 0.14}px ${fontSize * 0.22}px ${fontSize * 0.06}px ${fontSize * 0.32}px`,
        fontFamily: 'Bebas Neue',
        fontSize,
        letterSpacing: fontSize * 0.1,
        lineHeight: 1,
        color: STAMP_RED,
        textTransform: 'uppercase',
      }}
    >
      {STAMP_TEXT}
    </div>
  );
}
