'use client';

// The 10 lowest scores on phones (owner, Cowork ENTRY 472 (4), 21 Nov 2026): the first 5 rows, then 'Show 5 more', in the
// style of the site's other Show more buttons (.og-phone-more and its count, globals.css), and 'Show fewer' once all
// show. Phones only (the site's PHONE width); tablets and desktop show all 10 as before. All 10 rows stay in the page;
// a rule hides rows 6 to 10 by position, and it needs html.og-js, so without JavaScript all 10 show and there is
// nothing to press (as everywhere on the site).
import { useState } from 'react';
import { PHONE } from '@/lib/breakpoints';

const FIRST = 5;
const STEP = 5;

export default function LsMore({ total }: { total: number }) {
  const [shown, setShown] = useState(FIRST);
  if (total <= FIRST) return null;
  const css = `.ls-more-ctl { display: none !important; }
@media ${PHONE} {
  html.og-js .ls-ten tbody > tr:nth-child(n+${shown + 1}) { display: none !important; }
  html.og-js .ls-more-ctl { display: block !important; }
}`;
  const left = total - shown;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="og-more-count ls-more-ctl" aria-live="polite">{Math.min(shown, total)} of {total}</p>
      {left > 0 ? (
        <button type="button" className="og-phone-more ls-more-ctl" onClick={() => setShown(shown + STEP)}>
          Show {Math.min(STEP, left)} more
        </button>
      ) : (
        <button type="button" className="og-phone-more ls-more-ctl" onClick={() => setShown(FIRST)}>
          Show fewer
        </button>
      )}
    </>
  );
}
