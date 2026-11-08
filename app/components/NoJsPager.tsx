import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { phoneUpTo } from '@/lib/breakpoints';

// Long lists on phones with JavaScript off (owner, 6 Nov 2026; the 10,000px rule). With JavaScript on the phone script (lib/phone-enhance.ts) already
// shortens lists, and from 640px up lists show whole, so nothing here applies to either: the styles match only `html:not(.og-js)` under 640px.
// Every row stays in the page, which is still rendered once and cached. Each screen of rows has an anchor, and :target shows it, with Previous and
// Next links. Paging with ?page=2 would make these cached pages render on every request for every reader.
// No wrapper goes round the list: a wrapper changes what the phone script sees (it measures a table's parent and walks sibling elements). Only
// hidden elements are added beside it, and the list gets a class. Works in any page, server or client.
//   id     unique on the page: letters, numbers and hyphens
//   count  how many rows there are; at or under `size` this renders only its children
//   rows   the path from the list to the rows: "> tbody > tr", "> li", "> *"
//   items  instead of a list: the rows are siblings of this pager, each with className `njp-i-<id>` (njpItem), and `children` is left out
//   sizes  rows on each screen, where they vary in height (debate speeches): replaces `size`, and is what pagesByHeight returns
//   always pages on phones with JavaScript on as well, for a list the phone script leaves alone, such as one inside a fold
//   wide   with `always`: pages at every width, from 640px up as well, with JavaScript on and off (MP Political career, PC4)
//   cards  a table as stacked rows on phones with JavaScript off, as the phone script makes it with JavaScript on: the label of each column, null for none
//   title  which column (from 1) is the row's bold title in those stacked rows
export const njpItem = (id: string) => `njp-i-${id}`;

// How many rows fit on each screen, from each row's height, so that long rows get fewer companions.
export function pagesByHeight(heights: number[], room: number, most = Infinity): number[] {
  const sizes: number[] = [];
  let px = 0, n = 0;
  for (const h of heights) {
    if (n > 0 && (px + h > room || n >= most)) { sizes.push(n); px = 0; n = 0; }
    px += h; n++;
  }
  if (n > 0) sizes.push(n);
  return sizes;
}

export default function NoJsPager({ id, count, rows, size = 25, sizes, always = false, wide = false, cards, title, children }: { id: string; count: number; rows?: string; size?: number; sizes?: number[]; always?: boolean; wide?: boolean; cards?: (string | null)[]; title?: number; children?: ReactElement<{ className?: string }> }) {
  const split = sizes ?? Array.from({ length: Math.ceil(count / size) }, () => size);
  const cardCss = cards ? `@media ${phoneUpTo(639.98)} {${cards.map((label, i) => (label ? `html:not(.og-js) .njc-${id} > tbody > tr > :nth-child(${i + 1})::before{content:${JSON.stringify(`${label}: `)};font-weight:bold}` : '')).join('')}${title ? `html:not(.og-js) .njc-${id} > tbody > tr > :nth-child(${title}){font-weight:bold;font-size:16px}` : ''}}` : '';
  const cardClass = cards ? `njc njc-${id}` : '';
  const cardStyle = cards ? <style dangerouslySetInnerHTML={{ __html: cardCss }} /> : null;
  if (split.length <= 1) return <>{cardStyle}{children && cards ? cloneElement(children, { className: [children.props.className, cardClass].filter(Boolean).join(' ') }) : children}</>;
  const pages = split.length;
  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  const upTo = (k: number) => split.slice(0, k).reduce((a, b) => a + b, 0);   // rows on screens 1 to k
  const on = always ? 'html' : 'html:not(.og-js)';
  const list = `njp-l-${id}`;
  const item = njpItem(id);
  const row = rows ? `.${list} ${rows}` : `.${item}`;
  const nth = (expr: string) => (rows ? `:nth-child(${expr})` : `:nth-child(${expr} of .${item})`);
  const css = [
    `${on} #${id}-p1:not(:has(~ .njp-a:target)) ~ ${row}${nth(`n+${upTo(1) + 1}`)}{display:none!important}`,
    `${on} #${id}-p1:not(:has(~ .njp-a:target)) ~ .njp-n-${id}-1{display:flex}`,
    ...nums.slice(1).flatMap((k) => [
      `${on} #${id}-p${k}:target ~ ${row}:not(${nth(`n+${upTo(k - 1) + 1}`)}${nth(`-n+${upTo(k)}`)}){display:none!important}`,
      `${on} #${id}-p${k}:target ~ .njp-n-${id}-${k}{display:flex}`,
    ]),
  ].join('');
  return (
    <>
      {cardStyle}
      <style dangerouslySetInnerHTML={{ __html: wide && always ? css : `@media ${phoneUpTo(639.98)} {${css}}` }} />
      {nums.map((k) => <i key={k} id={`${id}-p${k}`} className={`njp-a${always ? ' njp-on' : ''}${wide && always ? ' njp-w' : ''}`} />)}
      {children ? cloneElement(children, { className: [children.props.className, list, cardClass].filter(Boolean).join(' ') }) : null}
      {children && nums.map((k) => <PagerNav key={k} id={id} k={k} pages={pages} always={always} wide={wide && always} />)}
    </>
  );
}

function PagerNav({ id, k, pages, always = false, wide = false }: { id: string; k: number; pages: number; always?: boolean; wide?: boolean }) {
  return (
    // A div, not a nav: the phone script's section folds stop at a NAV.
    <div role="navigation" className={`njp-nav${always ? ' njp-on' : ''}${wide ? ' njp-w' : ''} njp-n-${id}-${k}`} aria-label="Pages">
      {k > 1 ? <a href={`#${id}-p${k - 1}`}>Previous</a> : <span />}
      <span>Page {k} of {pages}</span>
      {k < pages ? <a href={`#${id}-p${k + 1}`}>Next</a> : <span />}
    </div>
  );
}

// The Previous and Next links for rows that are siblings (`items` above): put after the last of them.
export function NoJsPagerLinks({ id, count, size = 25, sizes }: { id: string; count: number; size?: number; sizes?: number[] }) {
  const pages = sizes ? sizes.length : Math.ceil(count / size);
  if (pages <= 1) return null;
  return <>{Array.from({ length: pages }, (_, i) => <PagerNav key={i} id={id} k={i + 1} pages={pages} />)}</>;
}

// A long section as a native fold, for phones with JavaScript off only; otherwise the section shows as it always has. No wrapper: everything between
// the fold and its hidden end marker is hidden while it is closed. id as above. With `always` it folds on phones with JavaScript on as well.
export function NoJsFold({ id, label, open = false, always = false, children }: { id: string; label: ReactNode; open?: boolean; always?: boolean; children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@media ${phoneUpTo(639.98)} {${always ? 'html' : 'html:not(.og-js)'} #${id}:not([open]) ~ *:not(#${id}-end):not(#${id}-end ~ *){display:none!important}}` }} />
      <details id={id} className={always ? 'njf njf-on' : 'njf'} open={open}><summary>{label}</summary></details>
      {children}
      <i id={`${id}-end`} className="njp-a" />
    </>
  );
}
