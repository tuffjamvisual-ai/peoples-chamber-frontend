// "Show more" with no JavaScript (owner, 5 Nov 2026, the PMQs archive): the first items, then a native details holding the
// next ones and another details after them. Closed details are not laid out, so a page is short however long the list, in
// any browser, with or without JavaScript. lib/phone-enhance.ts leaves anything in a details alone, and data-own-more stops
// it adding a second button. Styles are in globals.css (.mc-more, .pc-d, .pc-b).
//
// phoneOnly: folds under 640px only. From 640px up the buttons are not there and every item shows, as one list would. The
// items sit beside the details rather than in it, because a closed details hides its contents at every width.
import type { ReactNode } from 'react';

// first: how many items show as the page opens, when fewer than a step, so a page of long items stays within the 10,000px limit.
type Props = { items: ReactNode[]; step?: number; first?: number; ordered?: boolean; className?: string; style?: React.CSSProperties; phoneOnly?: boolean };

export default function MoreChain({ items, step = 25, first, ordered = false, className, style, phoneOnly = false }: Props) {
  const opening = Math.max(1, Math.min(first ?? step, step));
  const Tag = ordered ? 'ol' : 'ul';
  const list = (some: ReactNode[]) => <Tag className={className} data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>{some}</Tag>;
  if (items.length <= opening) return list(items);
  const label = (from: number) => <summary>Show more ({(items.length - from).toLocaleString('en-GB')} left)</summary>;
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
  return <>{list(items.slice(0, opening))}{rest(opening)}</>;
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
