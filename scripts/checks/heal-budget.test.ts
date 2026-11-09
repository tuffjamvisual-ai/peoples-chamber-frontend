// The freshness monitor's self heals (JF1c): the alert is emailed before any heal, and each heal is capped to the time
// left, so the run can never pass its 300 seconds and die before the email and its heartbeat.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/heal-budget.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { healTimeout, HEAL_DEADLINE_MS, HEAL_PER_ROUTE_MS, MIN_HEAL_MS, MAX_DURATION_MS } from '../../lib/heal-budget';

const t0 = 1_000_000;

test('early in the run a heal gets its full 180 seconds', () => {
  assert.equal(healTimeout(t0, t0 + 20_000), HEAL_PER_ROUTE_MS);
});

test('later, a heal gets only the time left before the deadline (the 230 second case that used to run to 410)', () => {
  assert.equal(healTimeout(t0, t0 + 230_000), HEAL_DEADLINE_MS - 230_000);
  // Whenever a heal starts, it ends by the deadline, inside the function's limit.
  for (let at = 0; at <= MAX_DURATION_MS; at += 5_000) {
    const t = healTimeout(t0, t0 + at);
    if (t !== null) assert.ok(at + t <= HEAL_DEADLINE_MS && HEAL_DEADLINE_MS < MAX_DURATION_MS, `start at ${at} ms`);
  }
});

test('with less than 15 seconds left, no heal starts', () => {
  assert.equal(healTimeout(t0, t0 + HEAL_DEADLINE_MS - MIN_HEAL_MS + 1), null);
  assert.equal(healTimeout(t0, t0 + 290_000), null);
});

test('the route emails the alert before it starts any heal, and heals last', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'api', 'monitor-freshness', 'route.ts'), 'utf8');
  const email = src.indexOf('await sendFreshnessAlert(emailAlerts)');
  const heal = src.indexOf('for (const route of toHeal)');
  const fetchHeal = src.indexOf('await fetch(`${origin}${route}`');
  assert.ok(email > 0 && heal > 0 && fetchHeal > 0);
  assert.ok(email < heal && heal < fetchHeal, 'the alert email comes before the heal loop');
  assert.ok(src.indexOf('return NextResponse.json({', fetchHeal) > fetchHeal, 'the heals are the last work before the response');
  assert.equal((src.match(/await fetch\(`\$\{origin\}\$\{route\}`/g) ?? []).length, 1, 'one place starts heals');
  assert.match(src, /healTimeout\(startedAt, Date\.now\(\)\)/);
});
