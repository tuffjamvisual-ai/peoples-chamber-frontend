'use client';

// "Show more" for long lists on phones (owner, 4 Nov 2026). Under 640px only the first 25 items of a list show, then 25
// more for each press. The whole list stays in the page, so search engines and readers from 640px up see all of it; a
// rule cuts the rest by position, so sorting or filtering the list cannot strand an item. The rule needs html.og-js (set
// by a script in the page head), so without JavaScript the whole list shows and there is nothing to press. The list itself
// carries data-own-more, so lib/phone-enhance.ts gives it no second button. The button's styles are in globals.css
// (.og-phone-more).
import { useState } from 'react';

type Props = {
  /** CSS selector for the element whose direct children are the items. */
  selector: string;
  total: number;
  step?: number;
  /** While a filter is on, every match shows and there is no button. */
  off?: boolean;
};

export default function PhoneMore({ selector, total, step = 25, off = false }: Props) {
  const [shown, setShown] = useState(step);
  if (off || total <= step) return null;
  const css = `@media (max-width: 639.98px) { html.og-js ${selector} > :nth-child(n+${shown + 1}) { display: none !important; } }`;
  const left = total - shown;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {left > 0 && (
        <button type="button" className="og-phone-more" onClick={() => setShown(shown + step)}>
          Show more ({left.toLocaleString('en-GB')} left)
        </button>
      )}
    </>
  );
}
