// The one place every page's links to other sites get a new tab (owner, Cowork ENTRY 450, 21 Nov 2026). tsconfig.json
// sets "jsxImportSource": "@/lib/og-jsx", so every JSX element the site renders passes through jsx-runtime.ts here
// (and jsx-dev-runtime.ts under next dev) before React's own runtime. Two kinds of element change, nothing else:
//   <a href="https://another.site/...">  target="_blank", rel with noopener noreferrer (its own rel words kept), and a
//       visually hidden " (opens in a new tab)" after its content (an aria-label gets the words instead);
//   any element given HTML (dangerouslySetInnerHTML, not script or style): the same for each <a> inside that HTML.
// Internal links (relative, opengovt.uk, www.opengovt.uk), #jumps, mailto: and tel: are left exactly as they were.
// next/link renders its own <a> outside this runtime: a <Link> to another site is not changed here (A20 would refuse it).
import { isExternalHref, newTabRel, newTabLabel, externalLinksInHtml, NEW_TAB_TEXT, NEW_TAB_CLASS } from '../external-link';

type Props = Record<string, unknown> & { children?: unknown };
type Make = (type: unknown, props: unknown, key?: unknown) => unknown;

// Returns the props to render with and whether the children are now a static list (jsxs).
export function newTabProps(type: unknown, props: unknown, staticChildren: boolean, make: Make): { props: unknown; isStatic: boolean } {
  if (props == null || typeof props !== 'object') return { props, isStatic: staticChildren };
  const p = props as Props;
  if (type === 'a' && isExternalHref(p.href)) {
    const hidden = make('span', { className: NEW_TAB_CLASS, children: NEW_TAB_TEXT }, 'og-new-tab');
    const kids = p.children;
    const children = kids == null || kids === false ? [hidden] : staticChildren && Array.isArray(kids) ? [...kids, hidden] : [kids, hidden];
    const out: Props = { ...p, target: '_blank', rel: newTabRel(p.rel), children };
    if (typeof p['aria-label'] === 'string') out['aria-label'] = newTabLabel(p['aria-label']);
    return { props: out, isStatic: true };
  }
  if (typeof type === 'string' && type !== 'script' && type !== 'style') {
    const inner = p.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
    if (inner && typeof inner.__html === 'string' && /<a\s/i.test(inner.__html)) {
      const html = externalLinksInHtml(inner.__html);
      if (html !== inner.__html) return { props: { ...p, dangerouslySetInnerHTML: { __html: html } }, isStatic: staticChildren };
    }
  }
  return { props, isStatic: staticChildren };
}
