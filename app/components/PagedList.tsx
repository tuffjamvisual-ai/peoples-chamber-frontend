import type { ReactNode } from 'react';
import NoJsPager from './NoJsPager';
import ScreenMore from './ScreenMore';

// A list inside a fold, 25 at a time on phones unless told otherwise (owner, 6 Nov 2026): Show more with JavaScript on, Next and Previous links with it off, every row from 640px up.
// Give each row className={njpItem(id)}. The phone script leaves a list in a fold alone, so this does the shortening itself.
export default function PagedList({ id, count, size = 25, className, style, children }: { id: string; count: number; size?: number; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  const sizes = Array.from({ length: Math.ceil(count / size) }, () => size);
  return (
    <>
      <NoJsPager id={id} count={count} rows="> li" size={size}>
        <ul className={className} data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>{children}</ul>
      </NoJsPager>
      <ScreenMore id={id} sizes={sizes} />
    </>
  );
}
