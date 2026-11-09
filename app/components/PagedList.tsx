import type { ReactNode } from 'react';
import NoJsPager from './NoJsPager';

// A list inside a fold (owner, 6 Nov 2026): on phones the first rows and "Show all" (NoJsPager, MP2f), every row from 640px up.
// Give each row className={njpItem(id)}. The phone script leaves a list in a fold alone, so this does the shortening itself.
export default function PagedList({ id, count, size = 25, className, style, children }: { id: string; count: number; size?: number; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  return (
    <>
      <NoJsPager id={id} count={count} rows="> li" size={size}>
        <ul className={className} data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>{children}</ul>
      </NoJsPager>
    </>
  );
}
