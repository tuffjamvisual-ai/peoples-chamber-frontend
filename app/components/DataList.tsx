import { cloneElement, type ReactElement } from 'react';
import { phoneUpTo } from '@/lib/breakpoints';

// DataList (T1-GUARD, owner approved 13 Nov 2026): the shared list for data that grows. New data lists use it; existing
// lists move onto it when their page is changed.
//
//   Phones and tablets (under 1,024px): the list is paged, 20 rows a page, at stable addresses (?page=2). Each page shows its
//   first 3 rows, then a "Show N more" button (a native <details>, 44px, works without JavaScript) for the rest of that
//   page, and Previous and Next links under it. Nothing is cut: every row is on one of the pages.
//   Desktop (1,024px and up): the whole list, as before (owner decision 13 Nov 2026: desktop is not paginated here).
//
// The server draws every row (it cannot tell a phone from a desktop); rows outside the page are hidden on phones and
// tablets by a rule. The page whose list this is reads ?page= (so it renders on each visit) and must read its data through
// a cached read (owner decision 13 Nov 2026: one hour), e.g. timedClient(3600) from lib/page-reads.ts.
//
//   id        unique on the page: letters, numbers and hyphens
//   count     the number of rows in the list as drawn (after any filter)
//   page      the ?page= number from the address (1 when missing or not a number); held within the pages that exist
//   href      the address of a page number, keeping the page's other query values
//   rows      the path from the list to its rows: "> li" (default), "> tbody > tr", "> *"
//   perPage   rows a page on phones and tablets (default 20)
//   first     rows shown before "Show N more" (default 3)
//   label     what a row is, for the page links' accessible name ("members", "donations")
//   children  the list element itself (ul, ol, table or div); DataList adds a class to it and wraps it

export const DATALIST_PER_PAGE = 20;
const FOLD = phoneUpTo(1023.98);

export function dataListPage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default function DataList({ id, count, page, href, rows = '> li', perPage = DATALIST_PER_PAGE, first = 3, label = 'items', children }: {
  id: string; count: number; page: number; href: (page: number) => string; rows?: string; perPage?: number; first?: number; label?: string;
  children: ReactElement<{ className?: string }>;
}) {
  const pages = Math.max(1, Math.ceil(count / perPage));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * perPage;               // rows before this page
  const end = Math.min(count, start + perPage);  // last row on this page
  const onPage = end - start;
  const more = Math.max(0, onPage - first);
  const box = `dl-${id}`, list = `dl-l-${id}`;
  const row = `.${box} > .${list} ${rows}`;
  const css = [
    `.${box} > .dl-more, .${box} > .dl-pages { display: none; }`,
    `@media ${FOLD} {`,
    start > 0 ? `${row}:nth-child(-n+${start}) { display: none !important; }` : '',
    end < count ? `${row}:nth-child(n+${end + 1}) { display: none !important; }` : '',
    more > 0 ? `.${box}:has(> .dl-more:not([open])) > .${list} ${rows}:nth-child(n+${start + first + 1}) { display: none !important; }` : '',
    more > 0 ? `.${box} > .dl-more { display: block; margin: 10px 0 6px; } .${box} > .dl-more > summary { display: flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 14px; border: 1px solid #14100d; font-size: 15px; font-weight: bold; color: #14100d; cursor: pointer; list-style: none; } .${box} > .dl-more > summary::-webkit-details-marker { display: none; } .${box} > .dl-more[open] { display: none; }` : '',
    pages > 1 ? `.${box} > .dl-pages { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 10px 0 14px; font-size: 15px; color: #14100d; } .${box} > .dl-pages a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 14px; border: 1px solid #14100d; color: #14100d; font-weight: bold; text-decoration: none; }` : '',
    '}',
  ].join('');
  const listEl = cloneElement(children, { className: [children.props.className, list].filter(Boolean).join(' ') });
  return (
    <div className={box} data-own-more="">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {listEl}
      {more > 0 && (
        <details className="dl-more">
          <summary>Show {more.toLocaleString('en-GB')} more</summary>
        </details>
      )}
      {pages > 1 && (
        <nav className="dl-pages" aria-label={`Pages of ${label}`}>
          {p > 1 ? <a href={href(p - 1)} rel="prev">Previous</a> : <span />}
          <span>Page {p} of {pages.toLocaleString('en-GB')}</span>
          {p < pages ? <a href={href(p + 1)} rel="next">Next</a> : <span />}
        </nav>
      )}
    </div>
  );
}
