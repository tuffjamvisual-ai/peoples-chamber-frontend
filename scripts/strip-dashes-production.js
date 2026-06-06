#!/usr/bin/env node
// One-off: strip em-dashes and en-dashes from production pages.
// Per the standing site rule and a hardened 2026-06-05 reminder
// (memory: feedback_typewriter_for_body_prose / feedback_remove_sources
// adjacent, and the user reraising 'i am still seing hyphens throughout
// all pages this is a ai tell which needs to be removed').
//
// Substitutions (preserves meaning + readability):
//   '—'        (em-dash U+2014)  -> ', '
//   '–'        (en-dash U+2013)  -> '-'
//   '&mdash;'  (HTML entity)     -> ', '
//   '&ndash;'  (HTML entity)     -> '-'
//   '&#8212;'                    -> ', '
//   '&#8211;'                    -> '-'
//
// Excluded paths (templates/previews not in production nav):
//   newspaper-*, preview-*, landing-*, blank-landing, land101, mp121,
//   unite-kingdom, new2, newpage, *.old-dark-theme, *.bak.*, *.backup-*
//
// Excluded content: lines that match /^\s*(\/\/|\/\*|\*)/ (JS / JSX
// comments) because the standing rule applies to rendered prose, not
// engineer documentation in source.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXCLUDE_DIR_PATTERNS = [
  /\/newspaper-\d+/,
  /\/newspaper-blank/,
  /\/newspaper-new1/,
  /\/newspaper-demo/,
  /\/newspaper-preview/,
  /\/preview-3/,
  /\/preview-home2/,
  /\/preview-footer/,
  /\/preview\//,
  /\/landing-pca/,
  /\/landing-demo/,
  /\/landing-preview/,
  /\/blank-landing/,
  /\/land101/,
  /\/mp121/,
  /\/unite-kingdom/,
  /\/new2/,
  /\/newpage/,
];
const EXCLUDE_FILE_PATTERNS = [
  /\.old-dark-theme$/,
  /\.bak\./,
  /\.backup-/,
  // Files that carry an intentional en-dash inside a regex character
  // class. Blunt substitution would break the regex.
  /\/api\/sync-standards-committee\/route\.ts$/,
];

function shouldSkipPath(rel) {
  if (EXCLUDE_DIR_PATTERNS.some((re) => re.test(rel))) return true;
  if (EXCLUDE_FILE_PATTERNS.some((re) => re.test(rel))) return true;
  return false;
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
      if (shouldSkipPath('/' + rel)) continue;
      list.push(full);
    }
  }
  return list;
}

// Replace dashes only OUTSIDE single-line and block comments. Keep
// comments intact so engineering documentation stays readable.
function stripDashes(text) {
  // Process line-by-line so we can leave JS/TS line comments alone.
  // Block comments (/* ... */) are detected with a small state machine.
  const lines = text.split('\n');
  let inBlockComment = false;
  const out = [];
  for (const original of lines) {
    let line = original;
    if (inBlockComment) {
      // Look for end of block comment
      const endIdx = line.indexOf('*/');
      if (endIdx >= 0) {
        inBlockComment = false;
        // Process the part of the line after the block comment
        const before = line.slice(0, endIdx + 2);
        const after = line.slice(endIdx + 2);
        const cleanedAfter = stripDashesInCode(after);
        out.push(before + cleanedAfter);
      } else {
        out.push(line);
      }
      continue;
    }
    // Detect single-line comment
    const slashIdx = line.indexOf('//');
    const blockStart = line.indexOf('/*');
    // Determine the boundary where comment territory begins
    let codeEnd = line.length;
    if (slashIdx >= 0 && (blockStart < 0 || slashIdx < blockStart)) {
      codeEnd = slashIdx;
      const code = line.slice(0, codeEnd);
      const comment = line.slice(codeEnd);
      out.push(stripDashesInCode(code) + comment);
    } else if (blockStart >= 0) {
      const code = line.slice(0, blockStart);
      let comment = line.slice(blockStart);
      const blockEnd = comment.indexOf('*/');
      if (blockEnd < 0) {
        inBlockComment = true;
        out.push(stripDashesInCode(code) + comment);
      } else {
        // Block comment ends on same line
        const after = comment.slice(blockEnd + 2);
        const commentPart = comment.slice(0, blockEnd + 2);
        out.push(stripDashesInCode(code) + commentPart + stripDashesInCode(after));
      }
    } else {
      out.push(stripDashesInCode(line));
    }
  }
  return out.join('\n');
}

function stripDashesInCode(s) {
  return s
    .replace(/&mdash;/g, ', ')
    .replace(/&#8212;/g, ', ')
    .replace(/&ndash;/g, '-')
    .replace(/&#8211;/g, '-')
    .replace(/ — /g, ', ')   // em-dash with spaces -> comma
    .replace(/—/g, ', ')      // bare em-dash -> comma
    .replace(/–/g, '-');      // en-dash -> hyphen
}

const files = walk(path.join(ROOT, 'app'));
console.log(`Scanning ${files.length} production source files for em/en-dashes…`);

let totalChanges = 0;
let changedFiles = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  if (!/[—–]|&mdash;|&ndash;|&#8212;|&#8211;/.test(before)) continue;
  const after = stripDashes(before);
  if (after === before) continue;
  // Tally diff
  const diff = (before.match(/[—–]/g) || []).length + (before.match(/&mdash;|&ndash;|&#8212;|&#8211;/g) || []).length
             - ((after.match(/[—–]/g) || []).length + (after.match(/&mdash;|&ndash;|&#8212;|&#8211;/g) || []).length);
  if (diff > 0) {
    fs.writeFileSync(file, after);
    changedFiles++;
    totalChanges += diff;
    console.log(`  ${path.relative(ROOT, file)}  ${diff} dashes stripped`);
  }
}
console.log(`\nDone. ${changedFiles} files changed, ${totalChanges} dash chars/entities removed.`);
