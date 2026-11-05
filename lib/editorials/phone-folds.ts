// The 10,000px rule for reports on phones (owner, 5 Nov 2026): every report and briefing opens at 10,000px or less at 375px,
// with JavaScript on and off. So a long report is planned here on the server, from an estimate of its height, and folded
// with native details under 640px (globals.css .rf-d, .rf-b). From 640px up those are not there and it reads as before.
// A report with level 2 headings folds under them, the first open; one with no headings, like most reports, shows its
// opening and then "Continue reading". Nothing is removed.
import type { Block } from './types';

// About how tall a block is at 375px: at 16px and a line height of 1.75, about 36 characters to a 28px line.
function heightOf(b: Block): number {
  switch (b.type) {
    case 'paragraph': return Math.ceil(b.text.replace(/\]\([^)]*\)/g, ']').length / 36) * 28 + 20;
    case 'heading': return b.level === 2 ? 110 : b.photo ? 300 : 80;
    case 'bioLine': return Math.ceil(b.text.length / 34) * 23 + 20;
    default: return 160;
  }
}
const heightOfAll = (bs: Block[]) => bs.reduce((px, b) => px + heightOf(b), 0);

// Text that fits in about this many pixels leaves room within the limit for the rest of the page.
const ROOM = 6000;

export type Chain = { blocks: Block[]; next: Chain | null };
export type Section = { heading: Block; chain: Chain; open: boolean };
export type PhonePlan = { lead: Chain; sections: Section[] };

// Blocks into runs of about `room` pixels, then ROOM each.
function chain(blocks: Block[], room: number): Chain {
  const taken: Block[] = [];
  let px = 0, i = 0;
  for (; i < blocks.length; i++) {
    px += heightOf(blocks[i]);
    if (px > room && taken.length) break;
    taken.push(blocks[i]);
  }
  return { blocks: taken, next: i < blocks.length ? chain(blocks.slice(i), ROOM) : null };
}

// Null where the report is short enough to read straight through.
export function phonePlan(body: Block[]): PhonePlan | null {
  if (heightOfAll(body) <= ROOM) return null;
  const firstHeading = body.findIndex((b) => b.type === 'heading' && b.level === 2);
  if (firstHeading < 0) return { lead: chain(body, ROOM), sections: [] };
  const lead = body.slice(0, firstHeading);
  const parts: { heading: Block; blocks: Block[] }[] = [];
  for (const b of body.slice(firstHeading)) {
    if (b.type === 'heading' && b.level === 2) parts.push({ heading: b, blocks: [] });
    else parts[parts.length - 1].blocks.push(b);
  }
  // The closed sections' lines take room on the page too.
  const room = Math.max(1500, ROOM - heightOfAll(lead) - parts.length * 50);
  return {
    lead: { blocks: lead, next: null },
    sections: parts.map((p, i) => ({ heading: p.heading, chain: chain(p.blocks, i === 0 ? room : ROOM), open: i === 0 })),
  };
}
