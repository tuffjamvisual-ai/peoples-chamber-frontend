// Shares items between two columns of even height for "two columns, no boxes"
// layouts. The list is cut once, at the point where the two halves are closest in
// height (judged by the weight given, an estimate of each item's height), so the
// reading order runs down the left column and then down the right, as in a
// newspaper. On phones the two columns stack, which keeps the same order.
export function balanceColumns<T>(items: T[], weight: (item: T) => number): [T[], T[]] {
  const w = items.map(weight);
  // Items of much the same size: split by count, with any odd item on the left,
  // as a newspaper does. Mixed sizes: cut where the heights come out closest.
  if (w.length && Math.max(...w) <= 1.6 * Math.min(...w)) {
    const k = Math.ceil(items.length / 2);
    return [items.slice(0, k), items.slice(k)];
  }
  const total = w.reduce((t, x) => t + x, 0);
  let run = 0;
  // Prefer the left column to hold at least as many items as the right (an odd
  // item sits on the left), but only while the columns still end roughly level:
  // if that would leave a gap of more than a tenth of the total height, the
  // closest cut wins instead.
  const minLeft = Math.ceil(items.length / 2);
  let free = 0, freeDiff = Infinity, left = 0, leftDiff = Infinity;
  for (let k = 0; k <= items.length; k++) {
    const diff = Math.abs(total - 2 * run);
    if (diff < freeDiff) { freeDiff = diff; free = k; }
    if (k >= minLeft && diff < leftDiff) { leftDiff = diff; left = k; }
    if (k < items.length) run += w[k];
  }
  const best = leftDiff - freeDiff <= 0.1 * total ? left : free;
  return [items.slice(0, best), items.slice(best)];
}

// CSS for the two column grid: two columns side by side, one on phones.
export const TWO_COLUMN_CSS = '.og-two{display:grid;grid-template-columns:1fr 1fr;column-gap:44px;align-items:start}@media (max-width:760px){.og-two{grid-template-columns:1fr}}';

// For short lists of similar sized items (link lists): a plain two column grid,
// rows side by side, no boxes. One column on phones.
export const TWO_COLUMN_GRID_CSS = '.og-grid2{display:grid;grid-template-columns:1fr 1fr;column-gap:44px}@media (max-width:760px){.og-grid2{grid-template-columns:1fr}}';
