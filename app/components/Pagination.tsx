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

interface Props {
  currentPage: number;
  totalPages: number;
  /** Base URL without query string, e.g. '/bills' or '/transparency/donations'. */
  baseUrl: string;
  /** Extra query-string segment to preserve other params, e.g. '&q=tax'. Must start with '&'. */
  qsExtra?: string;
  /** Param name to use for the page, defaults to 'page'. */
  pageParam?: string;
}

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#f4e8d4';
const MONO = 'Special Elite, monospace';

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
  color: 'rgba(20,16,13,0.35)',
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
}: Props) {
  if (totalPages <= 1) return null;
  const href = (p: number) => `${baseUrl}?${pageParam}=${p}${qsExtra}`;
  const tokens = pageTokens(currentPage, totalPages);

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
      {/* Numbered page row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {currentPage > 1 ? (
          <Link href={href(currentPage - 1)} style={baseLinkStyle} aria-label="Previous page">
            &larr; Prev
          </Link>
        ) : (
          <span style={disabledLinkStyle} aria-disabled>
            &larr; Prev
          </span>
        )}

        {tokens.map((t, i) =>
          t === null ? (
            <span key={`gap-${i}`} style={ellipsisStyle} aria-hidden>
              &hellip;
            </span>
          ) : t === currentPage ? (
            <span key={t} style={activeLinkStyle} aria-current="page">
              {t}
            </span>
          ) : (
            <Link key={t} href={href(t)} style={baseLinkStyle}>
              {t}
            </Link>
          ),
        )}

        {currentPage < totalPages ? (
          <Link href={href(currentPage + 1)} style={baseLinkStyle} aria-label="Next page">
            Next &rarr;
          </Link>
        ) : (
          <span style={disabledLinkStyle} aria-disabled>
            Next &rarr;
          </span>
        )}
      </div>

      {/* Go-to-page form. Native <form> with GET so it works without
          JS (crawler + no-JS visitors get a real navigation). */}
      <form
        action={baseUrl}
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
