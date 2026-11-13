// Phone or desktop layout: the one definition (owner, 8 Nov 2026, RT1). A phone turned on its side is 568 to 932px wide,
// past every phone width below, so it used to get the desktop view (the folder on the desk background, the full
// navigation). It now gets the phone layout, just wider: a phone is a screen under the given width, OR a touch phone in
// landscape (landscape, at most 500px tall, no hover, a coarse pointer). Tablets (over 500px tall) and desktops,
// including a small desktop window with a mouse, are unchanged.
//
// Every phone media query in the components and every JavaScript check is built from here. The two plain CSS files that
// cannot import it (app/globals.css, app/components/opengov-shell.css, and the other .css files) repeat these exact
// words; scripts/checks/breakpoints-check.ts fails if any copy differs or a phone width query lacks the landscape part.

/** A touch phone held sideways. */
export const LANDSCAPE_PHONE = '(orientation: landscape) and (max-height: 500px) and (hover: none) and (pointer: coarse)';

/** The phone layout up to `maxWidth` px wide, and on any phone held sideways: `@media ${phoneUpTo(767.98)} { ... }`. */
export const phoneUpTo = (maxWidth: number) => `(max-width: ${maxWidth}px), ${LANDSCAPE_PHONE}`;

/** The opposite: from `minWidth` px wide, except a phone held sideways. Written without `not` so that every browser reads
 *  it: a screen is not a sideways phone when it is portrait, over 500px tall, can hover, or has a fine or no pointer. */
export const wideFrom = (minWidth: number) =>
  ['(orientation: portrait)', '(min-height: 500.01px)', '(hover: hover)', '(pointer: fine)', '(pointer: none)']
    .map((c) => `(min-width: ${minWidth}px) and ${c}`)
    .join(', ');

/** The main phone layout (under 768px, or sideways): folds, phone tables, the phone script. Under 640px until T1-768
 *  (owner rule, 10 Nov 2026: phone means under 768px; changed 11 Nov 2026), so tablets of 640 to 767px get it too. */
export const PHONE = phoneUpTo(767.98);
// List folds (T1-TABFOLD, owner approved 13 Nov 2026: tablets follow the growing lists rule): phones and tablets, up to
// 1,023px wide (and phones held sideways). The shared list folds use it: NoJsPager's 'Show all', PhoneMore, ScreenMore,
// MoreChain (globals.css) and the phone script's long lists. Section folds, tables as cards and the rest stay at PHONE.
// From 1,024px up nothing changes.
export const LIST_FOLD = phoneUpTo(1023.98);
