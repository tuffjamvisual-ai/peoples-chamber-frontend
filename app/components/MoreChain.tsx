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
type Props = { items: ReactNode[]; step?: number; first?: number; ordered?: boolean; className?: string; style?: React.CSSProperties; phoneOnly?: boolean; mainAction?: boolean };

export default function MoreChain({ items, step = 25, first, ordered = false, className, style, phoneOnly = false, mainAction = false }: Props) {
  const opening = Math.max(1, Math.min(first ?? step, step));
  const Tag = ordered ? 'ol' : 'ul';
  const list = (some: ReactNode[], firstList = false, mark = false) => <Tag className={[className, firstList ? 'mc-first' : ''].filter(Boolean).join(' ') || undefined} data-own-more="" data-main-action={mark ? '' : undefined} style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>{some}</Tag>;
  if (items.length <= opening) {
    if (phoneOnly || items.length <= PHONE_FIRST) return list(items, false, mainAction);
    return <>{list(items, true, mainAction)}<details className="mc-more mc-phone"><summary>Show all {items.length.toLocaleString('en-GB')}</summary></details></>;
  }
  const label = (from: number) => (
    // One span: the summary is a flex box, and separate pieces would lose the space before "left".
    <summary>
      <span>
        Show more ({from === opening && !phoneOnly
          ? <><span className="mc-n-wide">{(items.length - from).toLocaleString('en-GB')}</span><span className="mc-n-phone">{(items.length - Math.min(PHONE_FIRST, from)).toLocaleString('en-GB')}</span></>
          : (items.length - from).toLocaleString('en-GB')} left)
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

// How many items fit as a page opens: their heights at 375px, up to the room the page leaves within the 10,000px limit.
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
