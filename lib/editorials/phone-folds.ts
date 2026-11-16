// Reports and briefings on phones and tablets (owner, 5 Nov 2026; 15 Nov 2026, COWORK-TO-T1 ENTRY 135 H2 and 141 N3,
// which replace the 6,000px plan used until then): the opening, up to the third paragraph (fewer when the first ones are
// long), then the rest
// behind one "Continue reading" fold (native details: globals.css .rf-d, .rf-b, up to 1,023px wide and on a phone held
// sideways). From 1,024px up the fold is not there and the report reads straight through. Nothing is removed, and it
// works with JavaScript off.
import type { Block } from './types';

export type Chain = { blocks: Block[]; next: Chain | null };
export type Section = { heading: Block; chain: Chain; open: boolean };
export type PhonePlan = { lead: Chain; sections: Section[] };

// The opening also stops before a paragraph that would take it past this many characters (the first always shows), so a report whose first paragraphs are
// long still opens within the phone limit at 320px (reports are set in a monospace face, about 24 characters to a line
// there; ENTRY 141 N3, the owner's limits).
const OPENING_CHARS = 900;
const chars = (b: Block) => (b.type === 'paragraph' ? b.text.replace(/\]\([^)]*\)/g, ']').length : 0);

/** Null where nothing follows the opening. `paragraphs`: 3, or 2 when the standfirst shows above the text (it is the
 *  article's first paragraph, as the summary is on a news release). */
export function phonePlan(body: Block[], paragraphs = 3): PhonePlan | null {
  const want = paragraphs;
  let seen = 0, length = 0, i = 0;
  for (; i < body.length; i++) {
    if (body[i].type !== 'paragraph') continue;
    // A paragraph that would take the opening past the cap starts the fold instead (the first one always shows).
    if (seen > 0 && length + chars(body[i]) > OPENING_CHARS) break;
    seen++;
    length += chars(body[i]);
    if (seen === want) { i++; break; }
  }
  if (i >= body.length) return null;
  return { lead: { blocks: body.slice(0, i), next: { blocks: body.slice(i), next: null } }, sections: [] };
}
