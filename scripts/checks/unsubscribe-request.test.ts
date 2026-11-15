// Security review L6 / ENTRY 58 item 2: opening an unsubscribe link changes nothing (lib/unsubscribe-request.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/unsubscribe-request.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unsubscribeAction, TOKEN_RE } from '../../lib/unsubscribe-request';

test('GET (a link opened, by a reader or a mail link checker) only shows the confirm page', () => {
  assert.equal(unsubscribeAction('GET', null), 'show-confirm-page');
  assert.equal(unsubscribeAction('HEAD', null), 'show-confirm-page');
});
test('the confirm page form unsubscribes and returns to the newsletter page', () => {
  assert.equal(unsubscribeAction('POST', { confirm: '1' }), 'form-confirmed');
});
test('a mail program one-click POST (List-Unsubscribe-Post) still unsubscribes', () => {
  assert.equal(unsubscribeAction('POST', { confirm: '' }), 'one-click');
  assert.equal(unsubscribeAction('POST', null), 'one-click');
});
test('tokens are the subscriber UUIDs only', () => {
  assert.ok(TOKEN_RE.test('11111111-1111-1111-1111-111111111111'));
  assert.ok(!TOKEN_RE.test('x'));
});
