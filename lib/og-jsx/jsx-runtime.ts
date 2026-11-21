// React's JSX runtime with links to other sites opening in a new tab (lib/og-jsx/new-tab.ts; tsconfig jsxImportSource).
import * as R from 'react/jsx-runtime';
import { newTabProps } from './new-tab';

export type { JSX } from 'react/jsx-runtime';
export const Fragment = R.Fragment;

const make = (type: unknown, props: unknown, key?: unknown) => R.jsx(type as never, props, key as never);

export function jsx(type: Parameters<typeof R.jsx>[0], props: unknown, key?: Parameters<typeof R.jsx>[2]) {
  const n = newTabProps(type, props, false, make);
  return n.isStatic ? R.jsxs(type, n.props, key) : R.jsx(type, n.props, key);
}

export function jsxs(type: Parameters<typeof R.jsxs>[0], props: unknown, key?: Parameters<typeof R.jsxs>[2]) {
  return R.jsxs(type, newTabProps(type, props, true, make).props, key);
}
