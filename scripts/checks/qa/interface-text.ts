// QA1 A5 (owner approved, 9 Nov 2026): house style on interface text. The wording we write into components (JSX text,
// string children, and the visible attributes title, aria-label, alt and placeholder) has no hyphen or dash in our own
// words (the rule in scripts/style-dash.ts, which skips addresses and quotations) and says "per cent", never "%".
// Official names and other allowed wording are in scripts/checks/qa/house-style-exceptions.json.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { strayDash } from '../../style-dash';

export type TextFinding = { file: string; line: number; rule: 'dash' | 'percent'; text: string };
const VISIBLE_ATTRS = new Set(['title', 'aria-label', 'alt', 'placeholder']);

// A percent sign that reads as "per cent": after a number or a closing brace ({value}%), not inside a CSS-like value.
const PERCENT = /(\d|\})\s?%/;

export function interfaceTexts(src: string, fileName: string): { line: number; text: string }[] {
  const sf = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: { line: number; text: string }[] = [];
  const add = (n: ts.Node, text: string) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (/[A-Za-z]{2}/.test(t)) out.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, text: t });
  };
  // CSS and script inside <style> and <script> elements are code, not wording.
  const tagName = (e: ts.JsxElement) => e.openingElement.tagName.getText(sf);
  const visit = (n: ts.Node): void => {
    if (ts.isJsxElement(n) && ['style', 'script'].includes(tagName(n))) return;
    if (ts.isJsxText(n)) add(n, n.text);
    else if (ts.isJsxExpression(n) && n.expression && (ts.isStringLiteral(n.expression) || ts.isNoSubstitutionTemplateLiteral(n.expression))
      && n.parent && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) add(n, n.expression.text);
    else if (ts.isJsxAttribute(n) && VISIBLE_ATTRS.has(n.name.getText(sf)) && n.initializer) {
      const v = n.initializer;
      if (ts.isStringLiteral(v)) add(v, v.text);
      else if (ts.isJsxExpression(v) && v.expression && (ts.isStringLiteral(v.expression) || ts.isNoSubstitutionTemplateLiteral(v.expression))) add(v, v.expression.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

// JSX text is split around {expressions}, so a {value}% shows as a text node starting "%": that is checked too.
export function checkText(text: string, allow: string[]): TextFinding['rule'][] {
  const rules: TextFinding['rule'][] = [];
  if (strayDash(text, allow)) rules.push('dash');
  if (PERCENT.test(text) || /^%/.test(text)) rules.push('percent');
  return rules;
}

function walk(dir: string, out: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.tsx')) out.push(p);
  }
}

export function loadExceptions(root: string): { allow: string[]; files: string[] } {
  const j = JSON.parse(fs.readFileSync(path.join(root, 'scripts/checks/qa/house-style-exceptions.json'), 'utf8'));
  return { allow: j.allow ?? [], files: j.skip_files ?? [] };
}

export function scanInterfaceText(root: string): TextFinding[] {
  const { allow, files: skip } = loadExceptions(root);
  const files: string[] = [];
  for (const d of ['app', 'lib']) walk(path.join(root, d), files);
  const out: TextFinding[] = [];
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join('/');
    if (skip.some((s) => rel === s || rel.startsWith(s))) continue;
    for (const { line, text } of interfaceTexts(fs.readFileSync(f, 'utf8'), rel)) {
      for (const rule of checkText(text, allow)) out.push({ file: rel, line, rule, text: text.slice(0, 90) });
    }
  }
  return out;
}

// A finding's key for the baseline: the file, the rule and the text (not the line, which moves when code is edited).
export const findingKey = (f: TextFinding) => `${f.file}|${f.rule}|${f.text}`;
