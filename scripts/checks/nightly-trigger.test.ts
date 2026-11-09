// The nightly page refresh started by the syncs (JF1d): the 05:15 clock run is a fallback that does nothing on a day a
// sync has triggered it; every nightly GitHub sync triggers it as its last step; every scheduled workflow has a
// concurrency group.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/nightly-trigger.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require('js-yaml') as { load: (s: string) => unknown };
import { clockSkip, withTrigger, triggerName } from '../../lib/nightly-trigger';

test('the clock run refreshes when no sync has triggered it today', () => {
  assert.equal(clockSkip(null, new Date('2026-11-09T05:15:00Z')), null);
  const yesterday = withTrigger(null, 'career-parliament-sync', new Date('2026-11-08T04:40:00Z'));
  assert.equal(clockSkip(yesterday, new Date('2026-11-09T05:15:00Z')), null);
});

test('the clock run does nothing on a day a sync triggered it', () => {
  let m = withTrigger(null, 'written-statements-sync', new Date('2026-11-09T03:52:00Z'));
  m = withTrigger(m, 'career-parliament-sync', new Date('2026-11-09T04:31:00Z'));
  m = withTrigger(m, 'career-parliament-sync', new Date('2026-11-09T04:32:00Z'));
  assert.deepEqual(m.by, ['written-statements-sync', 'career-parliament-sync']);
  assert.equal(clockSkip(m, new Date('2026-11-09T05:15:00Z')), 'already refreshed today, triggered by written-statements-sync, career-parliament-sync (last at 04:32 UTC)');
  // A new day starts a new list.
  assert.deepEqual(withTrigger(m, 'daily-sync', new Date('2026-11-10T09:40:00Z')).by, ['daily-sync']);
});

test('only a workflow style name is taken as a trigger', () => {
  assert.equal(triggerName('daily-context-update'), 'daily-context-update');
  assert.equal(triggerName(null), null);
  assert.equal(triggerName('x/../y'), null);
  assert.equal(triggerName(''), null);
});

const dir = path.join(__dirname, '..', '..', '.github', 'workflows');
type Step = { id?: string; name?: string; if?: string; run?: string };
type Workflow = { on?: { schedule?: unknown }; concurrency?: { group?: string; 'cancel-in-progress'?: boolean }; jobs: Record<string, { steps?: Step[] }> };
const workflows = fs.readdirSync(dir).filter((f) => f.endsWith('.yml')).map((f) => ({ f, d: yaml.load(fs.readFileSync(path.join(dir, f), 'utf8')) as Workflow }));

test('every scheduled workflow has a concurrency group that waits rather than cancels', () => {
  const scheduled = workflows.filter((w) => w.d.on?.schedule);
  assert.ok(scheduled.length >= 9);
  for (const w of scheduled) {
    assert.ok(w.d.concurrency?.group, `${w.f} has a concurrency group`);
    assert.equal(w.d.concurrency?.['cancel-in-progress'], false, `${w.f} waits rather than cancels`);
  }
});

test('each nightly GitHub sync triggers the refresh as its last step before the report, always', () => {
  for (const f of ['career-parliament-sync.yml', 'written-statements-sync.yml', 'daily-sync.yml', 'daily-context-update.yml']) {
    const w = workflows.find((x) => x.f === f)!;
    const steps = Object.values(w.d.jobs).flatMap((j) => j.steps ?? []);
    const t = steps.findIndex((s) => s.id === 'nightly-refresh');
    const r = steps.findIndex((s) => /^Report step results/.test(s.name ?? ''));
    assert.ok(t >= 0 && r === t + 1, `${f}: the trigger comes just before the report`);
    assert.equal(steps[t].if, 'always()');
    assert.equal(steps[t].run, `node scripts/trigger-nightly-refresh.js ${f.replace(/\.yml$/, '')}`);
  }
});
