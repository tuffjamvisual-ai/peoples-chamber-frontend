// Unit tests for lib/council-audit-words.ts and lib/council-budget-label.ts (Cowork ENTRY 755, 756). No network or database.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/council-audit-words.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditLine, latestAudit, AUDIT_STATUS_WORDS, BACKSTOP_NOTE, type AuditRow } from '../../lib/council-audit-words';
import { BUDGET_LABEL_BY_NATION, spendingDiffersNote } from '../../lib/council-budget-label';

const row = (year: string, status: string, signed: string | null, firm = 'Azets Audit Services Limited'): AuditRow =>
  ({ year, status, signed_date: signed, firm, source_month: '2026-10-31', source_url: 'https://www.psaa.co.uk/x.xlsx' });

test('every PSAA status has plain words, and none names an opinion type', () => {
  for (const s of ['Delivered On Time', 'Late Opinion Delivered', 'Delivered by backstop', 'Post backstop opinion delivered', 'Unsigned']) assert.ok(AUDIT_STATUS_WORDS[s], s);
  const all = Object.values(AUDIT_STATUS_WORDS).join(' ') + ' ' + BACKSTOP_NOTE;
  assert.doesNotMatch(all, /disclaim|qualified|unqualified|modified|wrongdoing|not a finding/i);
});

test("the backstop note is ENTRY 756's, word for word", () => {
  assert.equal(BACKSTOP_NOTE, 'Signed under the national backstop: auditors had to give an opinion by a set date, which was often before the audit could be completed. This status does not show what the auditor found; the auditor’s report does.');
});

test('a signed year reads with its date and firm; an unsigned year says so', () => {
  assert.equal(auditLine(row('2024-25', 'Delivered by backstop', '2026-02-24')), '2024/25 accounts: signed under the national backstop, 24 February 2026 (Azets Audit Services Limited)');
  assert.equal(auditLine(row('2025-26', 'Unsigned', null)), '2025/26 accounts: no audit opinion signed yet');
});

test('latest: the newest year, and when it is unsigned the newest signed year too', () => {
  const rows = [row('2025-26', 'Unsigned', null), row('2024-25', 'Delivered by backstop', '2026-02-24'), row('2023-24', 'Delivered by backstop', '2025-02-27')];
  assert.deepEqual(latestAudit(rows).map((r) => r.year), ['2025-26', '2024-25']);
  assert.deepEqual(latestAudit([row('2025-26', 'Delivered by backstop', '2026-10-01')]).map((r) => r.year), ['2025-26']);
  assert.deepEqual(latestAudit([]), []);
});

test('the budget figure is named by nation with its year; Northern Ireland has none', () => {
  assert.equal(BUDGET_LABEL_BY_NATION.England.label, 'Net current expenditure 2024/25');
  assert.match(BUDGET_LABEL_BY_NATION.Wales.label, /2026\/27/);
  assert.match(BUDGET_LABEL_BY_NATION.Scotland.label, /2026\/27/);
  assert.equal(BUDGET_LABEL_BY_NATION['Northern Ireland'], undefined);
  assert.equal(spendingDiffersNote('Northern Ireland', null), null);
  assert.match(spendingDiffersNote('England', '2025/26')!, /in 2025\/26.*negative figure when its income/);
});

test('no hyphens or dashes in the visible words, and per cent is spelled out', () => {
  const text = [...Object.values(AUDIT_STATUS_WORDS), BACKSTOP_NOTE, ...Object.values(BUDGET_LABEL_BY_NATION).flatMap((b) => [b.label, b.sub, b.measure]), spendingDiffersNote('England', '2025/26')!].join(' ');
  assert.doesNotMatch(text, /\w[-‐-―]\w|\s[–—-]\s/);
  assert.doesNotMatch(text, /%/);
});
