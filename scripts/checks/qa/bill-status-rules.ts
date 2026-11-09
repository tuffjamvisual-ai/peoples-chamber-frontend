// QA1 A1 (owner approved, 9 Nov 2026): rules for bill status agreement, shared by the unit test
// (scripts/checks/bill-status-agreement.test.ts) and the read only data check (scripts/checks/qa/bill-status-data.ts).
//
// 1. One status function. Every reader facing place that turns the Bills API flags (billWithdrawn, isDefeated, isAct /
//    Royal Assent, session ended) into a status must call one function. codeOffenders() lists the files under app/ and
//    lib/ that read the raw flags in code (not in a select string or a type) other than that function's own module.
// 2. No stage after the end. A withdrawn bill lists no stage sitting dated after its withdrawal, and an Act none after
//    Royal Assent. The Bills API has no "cancelled" marker on a stage or a sitting, so any such sitting is a fault.
//    Defeated bills carry no defeat date, so this rule cannot date them.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// The module UX1a creates for the one status function. Until it exists the code rule is an expected failure (the test
// is marked todo); set this to its path when UX1a is merged, and the test becomes a hard failure.
export const BILL_STATUS_MODULE: string | null = 'lib/bill-status.ts'; // UX1a, 9 Nov 2026

const FLAGS = new Set(['bill_withdrawn', 'is_defeated', 'is_act', 'billWithdrawn', 'isDefeated', 'isAct']);
// Syncs store the flags; they do not show a status. Scripts and checks are not reader facing.
const SKIP = [/^app\/api\/sync-/, /^app\/api\/sweep-/, /\.test\.tsx?$/];

// The flags a file reads in code: property accesses (bill.is_act, b?.isDefeated, row['is_act']) and destructured
// names ({ is_act }). Strings (select lists), comments and type members are not reads, so they are not counted.
export function flagReads(src: string, fileName = 'x.tsx'): string[] {
  const sf = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isPropertyAccessExpression(n) && FLAGS.has(n.name.text)) found.add(n.name.text);
    else if (ts.isElementAccessExpression(n) && ts.isStringLiteral(n.argumentExpression) && FLAGS.has(n.argumentExpression.text)) found.add(n.argumentExpression.text);
    else if (ts.isBindingElement(n) && FLAGS.has((n.propertyName ?? n.name).getText(sf))) found.add((n.propertyName ?? n.name).getText(sf));
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return [...found].sort();
}

export function usesFlags(src: string, fileName?: string): boolean {
  return flagReads(src, fileName).length > 0;
}

function walk(dir: string, out: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
}

export function codeOffenders(root: string): string[] {
  const files: string[] = [];
  for (const d of ['app', 'lib']) walk(path.join(root, d), files);
  return files
    .map((f) => path.relative(root, f).split(path.sep).join('/'))
    .filter((rel) => !SKIP.some((re) => re.test(rel)) && rel !== BILL_STATUS_MODULE)
    .filter((rel) => usesFlags(fs.readFileSync(path.join(root, rel), 'utf8'), rel))
    .sort();
}

export type StoredBill = {
  id: number;
  bill_withdrawn: string | null;
  is_act: boolean | null;
  current_stage: string | null;
  stages: { items?: { description?: string; stageSittings?: { date?: string | null }[] }[] } | null;
};

const day = (d: string | null | undefined) => (d ? d.slice(0, 10) : null);

// The sittings a bill lists after it ended (withdrawn, or Royal Assent for an Act), as "<stage> <date>".
export function stagesAfterEnd(b: StoredBill): string[] {
  const items = b.stages?.items ?? [];
  const sittings = items.flatMap((i) => (i.stageSittings ?? []).map((s) => ({ stage: i.description ?? '?', date: day(s.date) })));
  let end: string | null = null;
  if (b.bill_withdrawn) end = day(b.bill_withdrawn);
  else if (b.is_act) {
    const ra = sittings.filter((s) => s.stage === 'Royal Assent' && s.date).map((s) => s.date as string).sort();
    end = ra.length ? ra[ra.length - 1] : null;
  }
  if (!end) return [];
  return sittings.filter((s) => s.date && s.date > end! && s.stage !== 'Royal Assent').map((s) => `${s.stage} ${s.date}`);
}
