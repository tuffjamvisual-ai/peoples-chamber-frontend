'use client';

// "Show more" for long lists on phones and tablets (owner, 4 Nov 2026; up to 1,023px, T1-TABFOLD, 13 Nov 2026). The list
// opens with its first 3 items, each press shows 10 more, and once more than the first show, "Show fewer" goes back to
// them (owner approved 15 Nov 2026, COWORK-TO-T1 ENTRY 135 M3 and M7, 141 N6; 25 then 25 until then). The whole list stays
// in the page, so search engines and wider screens see all of it; a rule cuts the rest by position, so sorting or
// filtering the list cannot strand an item. The rule needs html.og-js (set by a script in the page head), so without
// JavaScript the whole list shows and there is nothing to press. The list itself carries data-own-more, so
// lib/phone-enhance.ts gives it no second button. The button's styles are in globals.css (.og-phone-more).
import { useState } from 'react';
import { LIST_FOLD } from '@/lib/breakpoints';

const FIRST = 3;
const STEP = 10;

type Props = {
  /** CSS selector for the element whose direct children are the items. */
  selector: string;
  total: number;
  /** Kept for callers; each press adds 10 (the owner's rule of 15 Nov 2026). */
  step?: number;
  /** While a filter is on, every match shows and there is no button. */
  off?: boolean;
  /** Items shown before the first press: at most 3 (a caller may ask for fewer, for long items). */
  first?: number;
};

export default function PhoneMore({ selector, total, off = false, first }: Props) {
  const start = Math.max(1, Math.min(first ?? FIRST, FIRST));
  const [shown, setShown] = useState(start);
  if (off || total <= start) return null;
  const css = `@media ${LIST_FOLD} { html.og-js ${selector} > :nth-child(n+${shown + 1}) { display: none !important; } }`;
  // The count beside the buttons (ENTRY 239 A4, MOB-LISTS, owner rule 17 Nov 2026): '3 of 241', what shows of the whole list.
  // Shown only where the buttons are (phones and tablets with JavaScript); its styles are with them in globals.css.
  const left = total - shown;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="og-more-count" aria-live="polite">{Math.min(shown, total).toLocaleString('en-GB')} of {total.toLocaleString('en-GB')}</p>
      {left > 0 && (
        <button type="button" className="og-phone-more" onClick={() => setShown(shown + STEP)}>
          {/* What a press shows (T1-GUARD, Cowork 13 Nov 2026: 'Show N more'). */}
          Show {Math.min(STEP, left).toLocaleString('en-GB')} more
        </button>
      )}
      {shown > start && (
        <button type="button" className="og-phone-more" onClick={() => setShown(start)}>
          Show fewer
        </button>
      )}
    </>
  );
}
