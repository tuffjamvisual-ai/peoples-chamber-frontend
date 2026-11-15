// Security review L5 (COWORK-TO-T1 ENTRY 59): account email links use the fixed site address in production.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/auth-link-base.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authLinkBase, PRODUCTION_SITE } from '../../lib/auth-link-base';

test('production ignores the request host', () => {
  const env = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'production';
  assert.equal(authLinkBase(new Request('https://evil.example/api/auth/forgot')), PRODUCTION_SITE);
  process.env.VERCEL_ENV = env;
});
test('preview and local use the build address', () => {
  const env = process.env.VERCEL_ENV, site = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.VERCEL_ENV = 'preview'; delete process.env.NEXT_PUBLIC_SITE_URL;
  assert.equal(authLinkBase(new Request('https://x-preview.vercel.app/api/auth/forgot')), 'https://x-preview.vercel.app');
  process.env.VERCEL_ENV = env; if (site) process.env.NEXT_PUBLIC_SITE_URL = site;
});
