// lib/client-ip.ts (Cowork ENTRY 795): the Worker's reader address only with the right secret; otherwise today's exact order.
//   npx --no-install tsx --tsconfig tsconfig.json --test scripts/checks/client-ip.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, sameSecret, CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../../lib/client-ip';

const S = 'k3y-for-tests-only-0123456789abcdef';
const H = (o: Record<string, string>) => new Headers(o);
const vercel = { 'x-forwarded-for': '104.16.0.1', 'x-real-ip': '104.16.0.1' }; // Cloudflare's address, as Vercel would set it

test('secret right: the reader address from the Worker is used', () => {
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: S, [CLIENT_IP_HEADER]: '81.2.69.160' }), S), '81.2.69.160');
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: S, [CLIENT_IP_HEADER]: ' 2001:db8::1 ' }), S), '2001:db8::1', 'trimmed');
});

test('secret wrong: today\'s order, the Worker address ignored', () => {
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: S.slice(0, -1) + 'x', [CLIENT_IP_HEADER]: '81.2.69.160' }), S), '104.16.0.1');
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: S + 'x', [CLIENT_IP_HEADER]: '81.2.69.160' }), S), '104.16.0.1', 'longer');
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: '', [CLIENT_IP_HEADER]: '81.2.69.160' }), S), '104.16.0.1', 'empty');
});

test('secret not set on the server: exactly today\'s order, whatever the request says', () => {
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: S, [CLIENT_IP_HEADER]: '81.2.69.160' }), undefined), '104.16.0.1');
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: '', [CLIENT_IP_HEADER]: '81.2.69.160' }), ''), '104.16.0.1', 'empty env value counts as not set');
});

test('address header missing or empty with the right secret: today\'s order', () => {
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: S }), S), '104.16.0.1');
  assert.equal(clientIp(H({ ...vercel, [PROXY_SECRET_HEADER]: S, [CLIENT_IP_HEADER]: '  ' }), S), '104.16.0.1');
});

test('today\'s order unchanged: first x-forwarded-for value, then x-real-ip, then unknown', () => {
  assert.equal(clientIp(H({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2', 'x-real-ip': '3.3.3.3' }), undefined), '1.1.1.1');
  assert.equal(clientIp(H({ 'x-real-ip': '3.3.3.3' }), undefined), '3.3.3.3');
  assert.equal(clientIp(H({}), undefined), 'unknown');
});

test('sameSecret: equal only for the same string', () => {
  assert.equal(sameSecret(S, S), true); assert.equal(sameSecret(S, S.toUpperCase()), false); assert.equal(sameSecret('', S), false); assert.equal(sameSecret('a', 'b'), false);
});
