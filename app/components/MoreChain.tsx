// "Show more" with no JavaScript (owner, 5 Nov 2026, the PMQs archive): the first items, then a native details holding the
// next ones and another details after them. Closed details are not laid out, so a page is short however long the list, in
// any browser, with or without JavaScript. lib/phone-enhance.ts leaves anything in a details alone, and data-own-more stops
// it adding a second button. Styles are in globals.css (.mc-more, .pc-d, .pc-b).
//
// phoneOnly: folds under 640px only. From 640px up the buttons are not there and every item shows, as one list would. The
// items sit beside the details rather than in it, because a closed details hides its contents at every width.
import type { ReactNode } from 'react';

// Phones (MP2f, 9 Nov 2026): the first PHONE_FIRST items of the opening list; the rest of it shows when the first
// "Show more" opens (globals.css .mc-first, a rule on the list, no JavaScript), and that control counts what is left from
// there. A list of more than PHONE_FIRST and no more than the opening gets a phone only "Show all <N>". Nothing changes
// from 640px up.
const PHONE_FIRST = 5;

// first: how many items show as the page opens, when fewer than a step, so a page of long items stays within the 10,000px limit.
// mainAction (UX3a): the first list carries data-main-action, the page's main action that the A6 check measures.
// phoneFirst (UX5, T1-6, 11 Nov 2026): how many of the opening list show on phones, in place of PHONE_FIRST, for items too
// long for five to fit the 2,500px phone length. Nothing changes from 640px up.
type Props = { items: ReactNode[]; step?: number; first?: number; ordered?: boolean; className?: string; style?: React.CSSProperties; phoneOnly?: boolean; mainAction?: boolean; phoneFirst?: number };

export default function MoreChain({ items, step = 25, first, ordered = false, className, style, phoneOnly = false, mainAction = false, phoneFirst = PHONE_FIRST }: Props) {
  const pf = Math.max(1, Math.min(phoneFirst, PHONE_FIRST));
  const opening = Math.max(1, Math.min(first ?? step, step));
  const Tag = ordered ? 'ol' : 'ul';
  const list = (some: ReactNode[], firstList = false, mark = false) => <Tag className={[className, firstList ? 'mc-first' : '', firstList && pf < PHONE_FIRST ? `mc-pf${pf}` : ''].filter(Boolean).join(' ') || undefined} data-own-more="" data-main-action={mark ? '' : undefined} style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>{some}</Tag>;
  if (items.length <= opening) {
    if (phoneOnly || items.length <= pf) return list(items, false, mainAction);
    return <>{list(items, true, mainAction)}<details className="mc-more mc-phone"><summary>Show {(items.length - pf).toLocaleString('en-GB')} more</summary></details></>;
  }
  // "Show N more" (T1-GUARD, Cowork 13 Nov 2026, as DataList): N is what the press shows, the next `step` items; on phones the
  // first press also shows the rest of the opening list (globals.css .mc-first).
  const next = (from: number) => Math.min(step, items.length - from);
  const label = (from: number) => (
    // One span: the summary is a flex box, and separate pieces would lose the spaces around the number.
    <summary>
      <span>
        Show {from === opening && !phoneOnly
          ? <><span className="mc-n-wide">{next(from).toLocaleString('en-GB')}</span><span className="mc-n-phone">{(next(from) + from - Math.min(pf, from)).toLocaleString('en-GB')}</span></>
          : next(from).toLocaleString('en-GB')} more
      </span>
    </summary>
  );
  const rest = (from: number): ReactNode => {
    if (from >= items.length) return null;
    if (phoneOnly) {
      return (
        <>
          <details className="pc-d">{label(from)}</details>
          <div className="pc-b">{list(items.slice(from, from + step))}{rest(from + step)}</div>
        </>
      );
    }
    return <details className="mc-more">{label(from)}{list(items.slice(from, from + step))}{rest(from + step)}</details>;
  };
  return <>{list(items.slice(0, opening), !phoneOnly, mainAction)}{rest(opening)}</>;
}

// How many items fit as a page opens: their heights at 375px, up to `room`. 6,800 is the opening at every width (the old
// 10,000px rule). For the 2,500px phone length (UX5, T1-6, 11 Nov 2026) pass PHONE_ROOM: about 1,300px of items, which
// leaves room for the rest of a PMQs session page (the estimates are within about 15 per cent of the measured heights).
export const PHONE_ROOM = 1300;
export function openingCount(heights: number[], room = 6800): number {
  let px = 0, n = 0;
  for (const h of heights) {
    px += h;
    if (px > room) break;
    n++;
  }
  return n;
}

// About how tall text is at 375px, at 16px with a line height of 1.7: about 40 characters to a 27px line.
export const textHeightAt375 = (text: string) => Math.ceil(text.length / 40) * 27;
