#!/usr/bin/env node
// Targeted strip of AI-tell compound hyphens from production prose.
//
// Removes the specific tokens flagged in the 2026-06-06 site audit
// while preserving:
//   - Established political/parliamentary terms (co-operative, under-
//     secretary, co-sponsor, re-run)
//   - Technical/EC-register terms (non-cash, Pre-poll, non-GBP, in-kind)
//   - CSS/code values (pre-line, pre-wrap, non-scaling, top-level)
//   - Code comments and JSX attributes
//
// Tokens removed (replace '-' with ' '):
//   non-compliance, non-executive, non-UK, non-departmental, non-statutory,
//   cross-border, cross-community, cross-departmental, cross-party,
//   cross-link, cross-government, cross-sector
//   sub-optimally, sub-optimal, sub-region, sub-national
//   long-term, short-term, medium-term, fixed-term
//   post-election, post-brexit, post-independence, post-2010, post-2024,
//     post-pandemic
//   multi-ethnic, multi-cultural, multi-national, multi-billion
//   year-on-year
//   ex-minister
//   self-declaration, self-declared, self-reported
//   high-risk
//
// Skips:
//   - Files in preview/landing/newspaper template directories
//   - .old-dark-theme / .bak / .backup files
//   - Comment lines (// or /* * leading)
//   - className= and style= attribute values

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXCLUDE_DIR_RE = /\/(preview-|newspaper-|landing-|blank-landing|land101|mp121|new2|newpage|unite-kingdom|node_modules|\.next|\.git)/;
const EXCLUDE_FILE_RE = /\.(old-dark-theme|bak|backup)/;

// (pattern, replacement) — pattern matches with word boundaries by default.
// Order matters when one token is a prefix of another.
const RULES = [
  // non-* (NOT non-cash, non-GBP, non-scaling — case-insensitive matches kept open here)
  [/\bnon-compliance\b/gi, 'non compliance'],
  [/\bnon-executive\b/gi, 'non executive'],
  [/\bnon-UK\b/g, 'non UK'],
  [/\bnon-departmental\b/gi, 'non departmental'],
  [/\bnon-statutory\b/gi, 'non statutory'],
  [/\bnon-ministerial\b/gi, 'non ministerial'],
  [/\bnon-cabinet\b/gi, 'non cabinet'],

  // cross-* (NOT cross-box CSS, cross-sectional too jargony, cross-examination is one word in legal sense)
  [/\bcross-border\b/gi, 'cross border'],
  [/\bcross-community\b/gi, 'cross community'],
  [/\bcross-departmental\b/gi, 'cross departmental'],
  [/\bcross-party\b/gi, 'cross party'],
  [/\bcross-link\b/gi, 'cross link'],
  [/\bcross-government\b/gi, 'cross government'],
  [/\bcross-sector\b/gi, 'cross sector'],
  [/\bcross-cutting\b/gi, 'cross cutting'],

  // sub-*
  [/\bsub-optimally\b/gi, 'sub optimally'],
  [/\bsub-optimal\b/gi, 'sub optimal'],
  [/\bsub-region(al)?\b/gi, 'sub region$1'],
  [/\bsub-national\b/gi, 'sub national'],

  // *-term durations
  [/\blong-term\b/gi, 'long term'],
  [/\bshort-term\b/gi, 'short term'],
  [/\bmedium-term\b/gi, 'medium term'],
  [/\bfixed-term\b/gi, 'fixed term'],

  // post-*
  [/\bpost-election\b/gi, 'post election'],
  [/\bpost-brexit\b/gi, 'post Brexit'],
  [/\bpost-independence\b/gi, 'post independence'],
  [/\bpost-pandemic\b/gi, 'post pandemic'],
  [/\bpost-war\b/gi, 'post war'],
  [/\bpost-2010\b/gi, 'post 2010'],
  [/\bpost-2024\b/gi, 'post 2024'],

  // multi-*
  [/\bmulti-ethnic\b/gi, 'multi ethnic'],
  [/\bmulti-cultural\b/gi, 'multi cultural'],
  [/\bmulti-national\b/gi, 'multinational'],
  [/\bmulti-billion\b/gi, 'multibillion'],
  [/\bmulti-year\b/gi, 'multi year'],

  // misc patterns
  [/\byear-on-year\b/gi, 'year on year'],
  [/\bex-minister(s|ial)?\b/gi, 'ex minister$1'],
  [/\bself-declaration\b/gi, 'self declaration'],
  [/\bself-declared\b/gi, 'self declared'],
  [/\bself-reported\b/gi, 'self reported'],
  [/\bhigh-risk\b/gi, 'high risk'],
];

function shouldSkipPath(rel) {
  return EXCLUDE_DIR_RE.test('/' + rel) || EXCLUDE_FILE_RE.test(rel);
}

function isCommentLine(line) {
  return /^\s*(\/\/|\/\*|\*)/.test(line);
}

function isAttributeContext(line, matchStart, lineStart) {
  // Inside className=" ... " or style={{ ... }} — skip
  const before = line.slice(0, matchStart - lineStart);
  if (/\bclassName\s*=\s*["{][^"]*$/.test(before)) return true;
  if (/\bstyle\s*=\s*\{\{[^}]*$/.test(before)) return true;
  return false;
}

function transform(text) {
  let modified = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const original = lines[i];
    if (isCommentLine(original)) continue;
    let line = original;
    for (const [re, repl] of RULES) {
      // Apply replacement only when match isn't in attribute context
      line = line.replace(re, (match, ...args) => {
        const offset = args[args.length - 2];
        if (isAttributeContext(line, offset, 0)) return match;
        // Skip whole-string identifiers used as keys/slugs (e.g. 'cross-border' as object key)
        // Heuristic: surrounded by quote-or-bracket on either side AND no spaces => identifier
        const left = line[offset - 1];
        const right = line[offset + match.length];
        if ((left === "'" || left === '"' || left === '[') && (right === "'" || right === '"' || right === ']')) {
          return match;
        }
        // Skip import / require / require.resolve paths.
        // Look back ~80 chars on the same line for a './' or '../' anchor
        // immediately before the match — that's an ES module file path.
        const backwindow = line.slice(Math.max(0, offset - 80), offset);
        if (/['"](\.\/|\.\.\/|@\/)[^'"]*$/.test(backwindow)) {
          return match;
        }
        return repl;
      });
    }
    if (line !== original) {
      lines[i] = line;
      modified = true;
    }
  }
  return modified ? lines.join('\n') : null;
}

function walk(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (rel.startsWith('node_modules') || rel.startsWith('.git') || rel.startsWith('.next')) continue;
    if (entry.isDirectory()) {
      walk(full, list);
    } else if (entry.isFile()) {
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;
      if (shouldSkipPath(rel)) continue;
      list.push(full);
    }
  }
  return list;
}

const targets = walk(path.join(ROOT, 'app')).concat(walk(path.join(ROOT, 'lib')));
let touched = 0;
let totalChanges = 0;
for (const f of targets) {
  const text = fs.readFileSync(f, 'utf8');
  const newText = transform(text);
  if (newText) {
    fs.writeFileSync(f, newText);
    touched++;
    const rel = path.relative(ROOT, f);
    // Count rough diff size
    let count = 0;
    for (const [re] of RULES) {
      count += (text.match(re) || []).length;
    }
    totalChanges += count;
    console.log(`  ${rel}  (${count} change${count === 1 ? '' : 's'})`);
  }
}
console.log(`\nDone. ${touched} files modified, ${totalChanges} compound-hyphen rewrites.`);
