// Security review M3 / L4 (COWORK-TO-T1 ENTRY 59): failure backoff and the password rule.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/auth-throttle.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { blocked, noteFailure, clearAccount, ACCOUNT_MAX, IP_MAX, WINDOW_MS, DUMMY_HASH } from '../../lib/auth-throttle';
import { passwordOk } from '../../lib/password-rule';

test('an account is refused after 5 failures in 15 minutes, and free again after the window or a success', () => {
  const t = 1_800_000_000_000;
  for (let i = 0; i < ACCOUNT_MAX; i++) { assert.equal(blocked('a@x.org', `10.0.0.${i}`, t + i), false); noteFailure('a@x.org', `10.0.0.${i}`, t + i); }
  assert.equal(blocked('a@x.org', '10.9.9.9', t + 10), true, 'any IP, same account');
  assert.equal(blocked('b@x.org', '10.9.9.9', t + 10), false, 'another account');
  assert.equal(blocked('a@x.org', '10.9.9.9', t + WINDOW_MS + 10), false, 'after the window');
  for (let i = 0; i < ACCOUNT_MAX; i++) noteFailure('c@x.org', '10.1.1.1', t + i);
  clearAccount('c@x.org');
  assert.equal(blocked('c@x.org', '10.2.2.2', t + 20), false, 'cleared by a success');
});

test('an IP is refused after 20 failures in 15 minutes, across accounts', () => {
  const t = 1_900_000_000_000;
  for (let i = 0; i < IP_MAX; i++) noteFailure(`u${i}@x.org`, '192.0.2.7', t + i);
  assert.equal(blocked('new@x.org', '192.0.2.7', t + 30), true);
  assert.equal(blocked('new@x.org', '192.0.2.8', t + 30), false);
});

test('the dummy hash is a real cost-12 hash that no typed password matches', () => {
  assert.equal(bcrypt.getRounds(DUMMY_HASH), 12);
  assert.equal(bcrypt.compareSync('password1', DUMMY_HASH), false);
});

test('password rule: 8 or more characters with a letter and a number', () => {
  assert.equal(passwordOk('abcdefg1'), true);
  assert.equal(passwordOk('abcdefgh'), false);
  assert.equal(passwordOk('12345678'), false);
  assert.equal(passwordOk('abc12'), false);
});
