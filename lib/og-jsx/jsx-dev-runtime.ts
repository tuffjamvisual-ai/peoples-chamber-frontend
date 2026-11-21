// React's JSX runtime for next dev, with links to other sites opening in a new tab (lib/og-jsx/new-tab.ts).
import * as R from 'react/jsx-dev-runtime';
import { newTabProps } from './new-tab';

export type { JSX } from 'react/jsx-dev-runtime';
export const Fragment = R.Fragment;

type A = Parameters<typeof R.jsxDEV>;
const make = (type: unknown, props: unknown, key?: unknown) => R.jsxDEV(type as never, props, key as never, false);

export function jsxDEV(type: A[0], props: unknown, key: A[2], isStatic: boolean, source?: A[4], self?: unknown) {
  const n = newTabProps(type, props, isStatic, make);
  return R.jsxDEV(type, n.props, key, n.isStatic, source, self);
}
