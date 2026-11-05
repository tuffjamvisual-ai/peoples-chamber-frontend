// "Show more" with no JavaScript (owner, 5 Nov 2026, the PMQs archive): the first items, then a native details holding the
// next ones and another details after them. Closed details are not laid out, so a page is short however long the list, in
// any browser, with or without JavaScript. Phone and desktop alike. lib/phone-enhance.ts leaves anything in a details alone,
// and data-own-more stops it adding a second button. Styles are in globals.css (.mc-more).
import type { ReactNode } from 'react';

// first: how many items show as the page opens, when fewer than a step, so a page of long items stays within the 10,000px limit.
type Props = { items: ReactNode[]; step?: number; first?: number; ordered?: boolean; className?: string };

export default function MoreChain({ items, step = 25, first, ordered = false, className }: Props) {
  const opening = Math.max(1, Math.min(first ?? step, step));
  const Tag = ordered ? 'ol' : 'ul';
  const list = (some: ReactNode[]) => <Tag className={className} data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0 }}>{some}</Tag>;
  if (items.length <= opening) return list(items);
  const rest = (from: number): ReactNode => {
    if (from >= items.length) return null;
    return (
      <details className="mc-more">
        <summary>Show more ({(items.length - from).toLocaleString('en-GB')} left)</summary>
        {list(items.slice(from, from + step))}
        {rest(from + step)}
      </details>
    );
  };
  return <>{list(items.slice(0, opening))}{rest(opening)}</>;
}
