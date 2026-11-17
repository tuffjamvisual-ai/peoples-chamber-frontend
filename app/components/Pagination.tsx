// Shared pagination component used by /bills, /transparency/[section],
// /laws and any future paginated page. Two skip-to-page surfaces:
//
//   1. Numbered page links with truncation:
//        < Prev  1  2  ...  29  [30]  31  ...  59  60  Next >
//      Always shows first, last, current ± 2 neighbours, ellipses for
//      the gaps. Click any number to jump.
//
//   2. Go to page input:
//        Go to page [___] of 60   [ Go ]
//      Type a page number and hit Go (or Enter). Falls back to the
//      browser's native form submission since this is a real <form>,
//      so it works without JS for crawlers.
//
// Both surfaces render real <a href> anchors and a real <form>
// pointing at the same baseUrl, so the entire pagination layer is
// crawlable and shareable. No client JS.
//
// Typography per the site rule: Special Elite throughout (this is
// navigation UI, not a heading).
//
// Added 2026-06-05.

import Link from 'next/link';
import { PHONE, TOUCH, phoneUpTo } from '@/lib/breakpoints';

// Phones and tablets (T2 ENTRY 1 item 4, Cowork 14 Nov 2026; tablets ENTRY 135 H1, 16 Nov 2026): every page link and
// button is a 44 x 44px tap and the page number box has 16px text; the page numbers were 32px wide.
// One row on phones (Cowork 14 Nov 2026, ENTRY 10): 4px between boxes (3px under 430px, so Prev, 1, 2, 3, …, last and Next
// fit 320px) and 6px inside them, the gap mark (…) only as wide
// as itself, and under 430px Prev and Next as arrows only (the word stays for screen readers, and in the link's name).
const PHONE_CSS = `@media ${TOUCH} { .og-pg { min-width: 44px !important; min-height: 44px; box-sizing: border-box; } }
@media ${PHONE} { .og-pg { padding: 0 6px !important; } .og-pg-gap { min-width: 0 !important; padding: 0 !important; margin: 0 -2px; } }
.og-pg-g1, .og-pg-g0 { display: none !important; }
@media ${phoneUpTo(429.98)} { .og-pg-x1, .og-pg-g2 { display: none !important; } .og-pg-g1 { display: inline-flex !important; } }
@media ${phoneUpTo(389.98)} { .og-pg-x0, .og-pg-g1 { display: none !important; } .og-pg-g0 { display: inline-flex !important; } }
@media ${phoneUpTo(429.98)} { .og-pg-row { gap: 3px !important; } .og-pg-word { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } }`;

interface Props {
  currentPage: number;
  totalPages: number;
  /** Base URL without query string, e.g. '/bills' or '/transparency/donations'. */
  baseUrl: string;
  /** Extra query-string segment to preserve other params, e.g. '&q=tax'. Must start with '&'. */
  qsExtra?: string;
  /** Param name to use for the page, defaults to 'page'. */
  pageParam?: string;
  /** An element id to land on, for a second list lower on the page (/pmqs, 1945 to 1961). */
  hash?: string;
  /** Each page's address when the page is in the path (F04: /x for page 1, /x/page/<n> after). Unset: baseUrl?page=n. */
  hrefFor?: (p: number) => string;
  /** Page in the browser instead of following the link (only from a client component; /laws while a search is typed). */
  onPage?: (p: number) => void;
}

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#f4e8d4';
const MONO = 'var(--font-special-elite), monospace';

// Build the list of page-number tokens with ellipsis truncation.
// Always include: first, last, current, current-1, current-2,
// current+1, current+2. Use null tokens for ellipses.
function pageTokens(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, total, current, current - 1, current - 2, current + 1, current + 2]);
  const pages = Array.from(set).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const tokens: (number | null)[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) tokens.push(null); // ellipsis gap
    tokens.push(p);
    prev = p;
  }
  return tokens;
}

// Phones, the middle of a long list (Cowork 14 Nov 2026, ENTRY 11): the full set (current ± 2) cannot sit on one row of
// 44px boxes under 430px. If it fits 296px (320 wide) it shows as it is. Otherwise from 390 to 429px: first, …, current
// with one either side, …, last, if that fits 366px, else first, …, current, …, last; under 390px the one with one either
// side only if it fits 296px. The 'Go to page' box stays, so every page can still be reached. The hidden numbers and gap
// marks stay in the page for wider screens; CSS picks the set by width.
const BOX = 44, GAP = 3, MARK = 17;
function rowWidth(nums: number[]): number {
  let gaps = 0;
  for (let i = 1; i < nums.length; i++) if (nums[i] - nums[i - 1] > 1) gaps++;
  const items = nums.length + gaps + 2;
  return 2 * BOX + nums.length * BOX + gaps * (MARK - 4) + (items - 1) * GAP;
}
function phoneSets(current: number, total: number, all: number[]): { wide: number[] | null; narrow: number[] | null } {
  if (rowWidth(all) <= 296) return { wide: null, narrow: null };
  const near = all.filter((p) => p === 1 || p === total || Math.abs(p - current) <= 1);
  const least = all.filter((p) => p === 1 || p === total || p === current);
  return { wide: rowWidth(near) <= 366 ? near : least, narrow: rowWidth(near) <= 296 ? near : least };
}

const baseLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '32px',
  height: '32px',
  padding: '0 8px',
  fontFamily: MONO,
  fontSize: '15px',
  letterSpacing: '0.04em',
  color: INK,
  textDecoration: 'none',
  border: `1px solid ${INK_HAIRLINE}`,
  background: 'transparent',
  cursor: 'pointer',
};

const activeLinkStyle: React.CSSProperties = {
  ...baseLinkStyle,
  background: INK,
  color: CREAM,
  borderColor: INK,
  fontWeight: 'bold',
};

const disabledLinkStyle: React.CSSProperties = {
  ...baseLinkStyle,
  color: '#14100d',
  pointerEvents: 'none',
  cursor: 'default',
};

const ellipsisStyle: React.CSSProperties = {
  ...baseLinkStyle,
  border: 'none',
  color: INK_SOFT,
  cursor: 'default',
  pointerEvents: 'none',
};

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  qsExtra = '',
  pageParam = 'page',
  hash,
  hrefFor,
  onPage,
}: Props) {
  if (totalPages <= 1) return null;
  const href = hrefFor
    ? (p: number) => hrefFor(p) + (hash ? `#${hash}` : '')
    : (p: number) => `${baseUrl}?${pageParam}=${p}${qsExtra}${hash ? `#${hash}` : ''}`;
  const click = (p: number) => (onPage ? { onClick: (e: { preventDefault: () => void }) => { e.preventDefault(); onPage(p); } } : {});
  const tokens = pageTokens(currentPage, totalPages);
  const nums = tokens.filter((t): t is number => t !== null);
  const { wide, narrow } = phoneSets(currentPage, totalPages, nums);
  // A gap mark after page n for a phone set: when the set's next page is not n + 1.
  const gapAfter = (set: number[] | null, n: number) => { if (!set) return false; const i = set.indexOf(n); return i >= 0 && i < set.length - 1 && set[i + 1] > n + 1; };
  const mark = (key: string, cls: string) => (
    <span key={key} className={`og-pg-gap ${cls}`} style={ellipsisStyle} aria-hidden>&hellip;</span>
  );

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        marginTop: '32px',
        marginBottom: '16px',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PHONE_CSS }} />
      {/* Numbered page row */}
      <div
        className="og-pg-row"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {currentPage > 1 ? (
          <Link href={href(currentPage - 1)} {...click(currentPage - 1)} className="og-pg" style={baseLinkStyle} aria-label="Previous page">
            &larr;<span className="og-pg-word">&nbsp;Prev</span>
          </Link>
        ) : (
          <span className="og-pg" style={disabledLinkStyle} aria-disabled>
            &larr;<span className="og-pg-word">&nbsp;Prev</span>
          </span>
        )}

        {tokens.flatMap((t, i) => {
          if (t === null) return [mark(`gap-${i}`, wide ? 'og-pg-g2' : '')];
          const cls = ['og-pg', wide && !wide.includes(t) ? 'og-pg-x1' : '', narrow && !narrow.includes(t) ? 'og-pg-x0' : ''].filter(Boolean).join(' ');
          const box = t === currentPage ? (
            <span key={t} className={cls} style={activeLinkStyle} aria-current="page">
              {t}
            </span>
          ) : (
            <Link key={t} href={href(t)} {...click(t)} className={cls} style={baseLinkStyle}>
              {t}
            </Link>
          );
          return [box, ...(gapAfter(wide, t) ? [mark(`g1-${t}`, 'og-pg-g1')] : []), ...(gapAfter(narrow, t) ? [mark(`g0-${t}`, 'og-pg-g0')] : [])];
        })}

        {currentPage < totalPages ? (
          <Link href={href(currentPage + 1)} {...click(currentPage + 1)} className="og-pg" style={baseLinkStyle} aria-label="Next page">
            <span className="og-pg-word">Next&nbsp;</span>&rarr;
          </Link>
        ) : (
          <span className="og-pg" style={disabledLinkStyle} aria-disabled>
            <span className="og-pg-word">Next&nbsp;</span>&rarr;
          </span>
        )}
      </div>

      {/* Go-to-page form. Native <form> with GET so it works without
          JS (crawler + no-JS visitors get a real navigation). */}
      <form
        action={hash ? `${baseUrl}#${hash}` : baseUrl}
        method="GET"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: MONO,
          fontSize: '15px',
          color: INK_SOFT,
        }}
      >
        {/* Preserve other query params as hidden inputs so the form
            submission keeps the same search / filter state. qsExtra
            comes in as '&key=value&key2=value2'; split it back out. */}
        {qsExtra
          .replace(/^&/, '')
          .split('&')
          .filter(Boolean)
          .map((kv) => {
            const eq = kv.indexOf('=');
            const k = eq >= 0 ? decodeURIComponent(kv.slice(0, eq)) : kv;
            const v = eq >= 0 ? decodeURIComponent(kv.slice(eq + 1)) : '';
            return <input key={k} type="hidden" name={k} value={v} />;
          })}
        <label htmlFor={`${pageParam}-jump`}>Go to page</label>
        <input
          id={`${pageParam}-jump`}
          name={pageParam}
          type="number"
          min={1}
          max={totalPages}
          defaultValue={currentPage}
          inputMode="numeric"
          style={{
            width: '64px',
            padding: '5px 8px',
            fontFamily: MONO,
            fontSize: '15px',
            color: INK,
            border: `1px solid ${INK_HAIRLINE}`,
            background: 'transparent',
            textAlign: 'center',
          }}
        />
        <span>of {totalPages}</span>
        <button
          type="submit"
          className="og-pg"
          style={{
            ...baseLinkStyle,
            padding: '0 14px',
            cursor: 'pointer',
          }}
        >
          Go
        </button>
      </form>
    </nav>
  );
}
