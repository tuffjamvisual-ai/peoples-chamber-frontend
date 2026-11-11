// T1-DF (b): failSoft leaves a failed section out (its fallback) and logs it; a good read passes through.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/fail-soft.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { failSoft } from '../../lib/fail-soft';

test('a good read passes through', async () => {
  assert.deepEqual(await failSoft('x', Promise.resolve([1, 2]), []), { value: [1, 2], failed: false });
});

test('a failed read gives the fallback, marked failed, and is logged', async () => {
  const logged: string[] = [];
  const orig = console.error;
  console.error = (m: string) => { logged.push(m); };
  try {
    const r = await failSoft('/mps/5068/pmqs archive', Promise.reject(new Error('canceling statement due to statement timeout')), [] as number[]);
    assert.deepEqual(r, { value: [], failed: true });
  } finally { console.error = orig; }
  assert.equal(logged.length, 1);
  assert.match(logged[0], /\/mps\/5068\/pmqs archive: rendered without this section \(canceling statement/);
});
