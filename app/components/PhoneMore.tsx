'use client';

// "Show more" for long lists on phones (owner, 4 Nov 2026). Under 640px only the first 25 items of a list show, then 25
// more for each press. The whole list stays in the page, so search engines and readers from 640px up see all of it; a
// rule cuts the rest by position, so sorting or filtering the list cannot strand an item. The rule needs html.og-js (set
// by a script in the page head), so without JavaScript the whole list shows and there is nothing to press. The list itself
// carries data-own-more, so lib/phone-enhance.ts gives it no second button. The button's styles are in globals.css
// (.og-phone-more).
import { useState } from 'react';
import { LIST_FOLD } from '@/lib/breakpoints';

type Props = {
  /** CSS selector for the element whose direct children are the items. */
  selector: string;
  total: number;
  step?: number;
  /** While a filter is on, every match shows and there is no button. */
  off?: boolean;
  /** Items shown before the first press, when not `step` (MP2f-11, 10 Nov 2026: 5 on the lists that also carry NoJsPager's
   *  "Show all" for JavaScript off, so the page stays as short as it was). Each press then adds `step`. */
  first?: number;
};

export default function PhoneMore({ selector, total, step = 25, off = false, first }: Props) {
  const start = first ?? step;
  const [shown, setShown] = useState(start);
  if (off || total <= start) return null;
  // Phones and tablets, up to 1,023px (T1-TABFOLD, owner approved 13 Nov 2026).
  const css = `@media ${LIST_FOLD} { html.og-js ${selector} > :nth-child(n+${shown + 1}) { display: none !important; } }`;
  const left = total - shown;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {left > 0 && (
        <button type="button" className="og-phone-more" onClick={() => setShown(shown + step)}>
          {/* What a press shows (T1-GUARD, Cowork 13 Nov 2026: 'Show N more', as DataList). */}
          Show {Math.min(step, left).toLocaleString('en-GB')} more
        </button>
      )}
    </>
  );
}
