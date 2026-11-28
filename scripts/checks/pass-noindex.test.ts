// next.config.ts noindex rule (Cowork ENTRY 798 finding A, 804): the real rules from next.config.ts, matched with Next's own
// code (buildCustomRoute, as the server builds header routes, and matchHas), in order, the last header of a key winning (headers.md).
//   npx --no-install tsx --tsconfig tsconfig.json --test scripts/checks/pass-noindex.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomRoute } from 'next/dist/server/lib/router-utils/filesystem';
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';
import rawConfig from '../../next.config';
import type { NextConfig } from 'next';
// next.config.ts exports a Promise of the config (withAnalyzerIfEnabled); awaited inside each test (no top level await here).
const rules = async () => ((await (rawConfig as unknown as Promise<NextConfig>)).headers!()) as Promise<Rule[]>;

type Rule = { source: string; has?: Parameters<typeof matchHas>[2]; missing?: Parameters<typeof matchHas>[3]; headers: { key: string; value: string }[] };

async function headersFor(rules: Rule[], host: string, url: string, extra: Record<string, string> = {}) {
  const u = new URL(url, 'http://x');
  const query = Object.fromEntries(u.searchParams);
  const req = { headers: { host, ...extra } } as unknown as Parameters<typeof matchHas>[0];
  const out: Record<string, string> = {};
  for (const r of rules) {
    if (!buildCustomRoute('header', r, undefined, false).match(u.pathname)) continue;
    if (!matchHas(req, query, r.has, r.missing)) continue;
    for (const h of r.headers) out[h.key.toLowerCase()] = h.value;
  }
  return out;
}

const PATHS = ['/', '/mps', '/mps/123', '/bills?page=2', '/bills?page=1', '/search?q=nhs', '/divisions/page/3', '/newsletter/issues/2026-11-28',
  '/editorials/whitehall271126', '/recommendations', '/api/feedback'];
const REAL = { 'x-optd-real-host': 'www.opengovt.uk' };

test('www itself: unchanged from before the change, with or without the new header', async () => {
  const now = await rules();
  // The rule as it was before (host item only).
  const before = now.map((r) => (r.missing?.length === 2 ? { ...r, missing: r.missing.slice(0, 1) } : r));
  assert.equal(now.filter((r) => r.missing?.length === 2).length, 1, 'exactly one rule changed');
  for (const p of PATHS) {
    const was = await headersFor(before, 'www.opengovt.uk', p);
    assert.deepEqual(await headersFor(now, 'www.opengovt.uk', p), was, p);
    assert.deepEqual(await headersFor(now, 'www.opengovt.uk', p, REAL), was, `${p} with header`);
  }
});

test('origin with x-optd-real-host www: exactly the headers www gets', async () => {
  const now = await rules();
  for (const p of PATHS) assert.deepEqual(await headersFor(now, 'origin.opengovt.uk', p, REAL), await headersFor(now, 'www.opengovt.uk', p), p);
  // Pages with their own noindex keep it.
  assert.equal((await headersFor(now, 'origin.opengovt.uk', '/bills?page=2', REAL))['x-robots-tag'], 'noindex, follow');
  assert.equal((await headersFor(now, 'origin.opengovt.uk', '/newsletter/issues/2026-11-28', REAL))['x-robots-tag'], 'noindex');
  assert.equal((await headersFor(now, 'origin.opengovt.uk', '/mps', REAL))['x-robots-tag'], undefined);
});

test('origin without the header, or with any other value: noindex on every page', async () => {
  const now = await rules();
  for (const extra of <Record<string, string>[]>[{}, { 'x-optd-real-host': 'origin.opengovt.uk' }, { 'x-optd-real-host': 'www.opengovt.uk.example' },
    { 'x-optd-real-host': 'xwww.opengovt.uk' }, { 'x-optd-real-host': 'wwwXopengovtXuk' }, { 'x-optd-real-host': '' }]) {
    for (const p of PATHS) assert.equal((await headersFor(now, 'origin.opengovt.uk', p, extra))['x-robots-tag'], 'noindex', `${p} ${JSON.stringify(extra)}`);
  }
});

test('other hosts (vercel.app, previews) without the header: noindex as today', async () => {
  const now = await rules();
  for (const host of ['peoples-chamber-frontend.vercel.app', 'peoples-chamber-frontend-git-x.vercel.app', 'opengovt.uk'])
    for (const p of PATHS) assert.equal((await headersFor(now, host, p))['x-robots-tag'], 'noindex', `${host}${p}`);
});
