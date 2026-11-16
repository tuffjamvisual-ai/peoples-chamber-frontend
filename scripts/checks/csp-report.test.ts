// /api/csp-report never logs a query string or fragment (Cowork ENTRY 191): a report carrying ?token=x logs only the
// origin and path. Run: npx tsx --tsconfig tsconfig.json --test scripts/checks/csp-report.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../../app/api/csp-report/route';
import { safeUri } from '../../lib/csp-safe-uri';

test('safeUri keeps origin and path only', () => {
  assert.equal(safeUri('https://www.opengovt.uk/reset-password?token=secret123#x'), 'https://www.opengovt.uk/reset-password');
  assert.equal(safeUri('https://www.opengovt.uk/newsletter/unsubscribe?token=abc'), 'https://www.opengovt.uk/newsletter/unsubscribe');
  assert.equal(safeUri('inline'), 'inline');
  assert.equal(safeUri('/relative?token=y'), '/relative');
});

test('a report with ?token= is logged without it, and answers 204', async () => {
  const lines: string[] = [];
  const warn = console.warn;
  console.warn = (...a: unknown[]) => { lines.push(a.join(' ')); };
  try {
    const body = JSON.stringify({ 'csp-report': { 'document-uri': 'https://www.opengovt.uk/reset-password?token=secret123', 'blocked-uri': 'https://evil.example/x.js?token=secret123', 'effective-directive': 'script-src' } });
    const res = await POST(new Request('http://localhost/api/csp-report', { method: 'POST', body }));
    assert.equal(res.status, 204);
  } finally { console.warn = warn; }
  assert.equal(lines.length, 1);
  assert.ok(!lines[0].includes('token'), lines[0]);
  assert.ok(!lines[0].includes('secret123'), lines[0]);
  assert.match(lines[0], /\[csp\] script-src https:\/\/evil\.example\/x\.js https:\/\/www\.opengovt\.uk\/reset-password$/);
});
