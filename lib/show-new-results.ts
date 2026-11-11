// T1-MOB2 (2), owner 11 Nov 2026: after Next, Previous or Show more replaces a list in place, the reader is taken to the
// new results: their heading is scrolled to the top of the screen and takes keyboard focus (so a screen reader reads it
// and Tab carries on from there). Used by every list that a script replaces in place (the MP voting record, an MP's or
// peer's written questions). Lists paged by links (NoJsPager, Pagination, Show more links) land on their own anchor.
export function showNewResults(el: HTMLElement | null): void {
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.scrollIntoView({ block: 'start' });
  el.focus({ preventScroll: true });
}
