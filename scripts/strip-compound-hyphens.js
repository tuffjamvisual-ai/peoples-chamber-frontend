#!/usr/bin/env node
// Strip AI-tell compound-modifier hyphens from production source +
// DB prose content. Examples: 'non-metropolitan' -> 'non metropolitan',
// 'year-on-year' -> 'year on year', 'anti-social' -> 'antisocial',
// 'single-tier' -> 'single tier'.
//
// Carefully preserves:
//   - Proper place names with linking words: 'X-on-Y', 'X-by-Y',
//     'X-upon-Y', 'X-in-Y', 'X-le-Y', 'X-la-Y', 'X-sur-Y', 'X-of-Y',
//     'X-and-Y' (e.g. Shoreham-by-Sea, Stockton-on-Tees,
//     Hammersmith-and-Fulham, h-Eileanan)
//   - CSS, code, attribute, file paths, URLs (handled by only running
//     against prose-bearing fields in DB and the editorial-body
//     constant in /council-tax source)
//
// Patterns to strip (replace '-' with ' '):
const COMPOUND_HYPHEN_PATTERNS = [
  // Negation + modifier
  /\bnon-([a-z]+)/gi,
  /\bpre-([a-z]+|\d{4})/gi,
  /\bpost-([a-z]+|\d{4})/gi,
  /\banti-([a-z]+)/gi,
  /\bsemi-([a-z]+)/gi,
  /\bself-([a-z]+)/gi,
  /\bsub-([a-z]+)/gi,
  /\bex-([A-Z][a-z]+|[a-z]+)/g,
  /\bre-([a-z]+)/gi,
  /\bco-([a-z]+)/gi,
  /\binter-([a-z]+)/gi,

  // Direction compounds
  /\b(north|south|east|west)-(east|west|north|south)\b/gi,

  // -wing political
  /\b(left|right|far-left|far-right)-wing\b/gi,
  /\bcentre-(left|right)\b/gi,

  // -class social
  /\b(working|middle|upper)-class\b/gi,

  // -term temporal
  /\b(short|long|mid|medium|near|far)-term\b/gi,
  /\b(first|second|third)-term\b/gi,

  // -tier governance
  /\b(single|two|three|multi|upper|lower)-tier\b/gi,

  // -on-year / year-on-year etc.
  /\byear-on-year\b/gi,
  /\bday-on-day\b/gi,
  /\bmonth-on-month\b/gi,

  // -owned
  /\b([a-z]+)-owned\b/gi,

  // -grabbing
  /\b([a-z]+)-grabbing\b/gi,

  // -level
  /\b([a-z]+)-level\b/gi,

  // built-up, mixed-up, beat-up
  /\b([a-z]+)-up\b(?!\s*=)/gi,

  // -based, -focused, -driven, -led
  /\b([a-z]+)-based\b/gi,
  /\b([a-z]+)-focused\b/gi,
  /\b([a-z]+)-focussed\b/gi,
  /\b([a-z]+)-driven\b/gi,
  /\b([a-z]+)-led\b/gi,

  // -metropolitan specifically (already covered by 'non-' but also for
  // 'non-Metropolitan' patterns and any others)
  /\b([A-Z][a-z]+)-metropolitan\b/gi,

  // social-care, public-spend, etc.
  /\bsocial-care\b/gi,

  // 'cabinet-style' and other -style
  /\b([a-z]+)-style\b/gi,

  // -thinking, -looking, -facing, -reaching, -running, -winning,
  // -lasting, -standing, -ending, -going, -seeking, -breaking
  /\b([a-z]+)-thinking\b/gi,
  /\b([a-z]+)-looking\b/gi,
  /\b([a-z]+)-facing\b/gi,
  /\b([a-z]+)-reaching\b/gi,
  /\b([a-z]+)-running\b/gi,
  /\b([a-z]+)-winning\b/gi,
  /\b([a-z]+)-lasting\b/gi,
  /\b([a-z]+)-standing\b/gi,
  /\b([a-z]+)-ending\b/gi,
  /\b([a-z]+)-going\b/gi,
  /\b([a-z]+)-seeking\b/gi,
  /\b([a-z]+)-breaking\b/gi,
  /\b([a-z]+)-changing\b/gi,
  /\b([a-z]+)-shaping\b/gi,
  /\b([a-z]+)-defining\b/gi,
  /\b([a-z]+)-leading\b/gi,
  /\b([a-z]+)-serving\b/gi,
  /\b([a-z]+)-bearing\b/gi,
  /\b([a-z]+)-paying\b/gi,
  /\b([a-z]+)-related\b/gi,
  /\b([a-z]+)-rooted\b/gi,

  // -run, -done, -made, -told, -known, -kept, -gone
  /\b([a-z]+)-run\b/gi,
  /\b([a-z]+)-made\b/gi,
  /\b([a-z]+)-told\b/gi,
  /\b([a-z]+)-known\b/gi,
  /\b([a-z]+)-kept\b/gi,

  // -worthy, -ready, -friendly, -free, -heavy, -light, -wide
  /\b([a-z]+)-worthy\b/gi,
  /\b([a-z]+)-ready\b/gi,
  /\b([a-z]+)-friendly\b/gi,
  /\b([a-z]+)-free\b/gi,
  /\b([a-z]+)-heavy\b/gi,
  /\b([a-z]+)-light\b/gi,
  /\b([a-z]+)-wide\b/gi,
  /\b([a-z]+)-deep\b/gi,
  /\b([a-z]+)-strong\b/gi,
  /\b([a-z]+)-rich\b/gi,
  /\b([a-z]+)-poor\b/gi,
  /\b([a-z]+)-old\b/gi,
  /\b([a-z]+)-new\b/gi,
  /\b([a-z]+)-only\b/gi,

  // -industrial, -industrial, -war (compound time/era modifiers)
  /\b([a-z]+)-industrial\b/gi,
  /\b([a-z]+)-war\b/gi,
  /\b([a-z]+)-COVID\b/gi,
  /\b([a-z]+)-Brexit\b/gi,
  /\b([a-z]+)-Corbyn\b/gi,
  /\b([a-z]+)-Trump\b/gi,

  // -dependent, -reliant, -resistant
  /\b([a-z]+)-dependent\b/gi,
  /\b([a-z]+)-reliant\b/gi,
  /\b([a-z]+)-resistant\b/gi,

  // -aware
  /\b([a-z]+)-aware\b/gi,
];

// Replace each matched compound-hyphen with space-separated form.
function stripCompound(text) {
  if (!text) return text;
  let out = text;
  for (const re of COMPOUND_HYPHEN_PATTERNS) {
    out = out.replace(re, (match) => match.replace(/-/g, ' '));
  }
  return out;
}

// ----- Source code section ----------------------------------------

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const SOURCE_TARGETS = [
  'app/council-tax/page.tsx',
];

let sourceFiles = 0;
let sourceReplacements = 0;
for (const rel of SOURCE_TARGETS) {
  const full = path.join(ROOT, rel);
  const before = fs.readFileSync(full, 'utf8');
  // Only operate on string template literals + the FEATURE_BODY-like
  // multi-line backtick strings. To stay safe, operate over the file
  // line by line and only touch lines that are JSX text or string
  // content (don't have CSS-property syntax 'foo-bar:').
  const lines = before.split('\n');
  let inBlockComment = false;
  const outLines = lines.map((line) => {
    if (inBlockComment) {
      const end = line.indexOf('*/');
      if (end >= 0) inBlockComment = false;
      return line;
    }
    const blockStart = line.indexOf('/*');
    if (blockStart >= 0 && line.indexOf('*/', blockStart) < 0) {
      inBlockComment = true;
      return line;
    }
    // Skip lines that look like CSS property usage (e.g. 'fontFamily:
    // ...' or 'margin-top') — these are NOT prose.
    if (/[a-zA-Z]+-[a-zA-Z]+\s*:/.test(line)) return line;
    if (line.includes('font-family') || line.includes('background-image')) return line;
    if (line.startsWith('//')) return line;
    if (/^\s*import\s/.test(line)) return line;
    if (/^\s*const\s+[A-Z_]+\s*=/.test(line) && !/`/.test(line)) return line;
    // Apply compound-hyphen strip
    const next = stripCompound(line);
    if (next !== line) sourceReplacements++;
    return next;
  });
  const after = outLines.join('\n');
  if (after !== before) {
    fs.writeFileSync(full, after);
    sourceFiles++;
    console.log(`  source: ${rel}  (lines touched: ${sourceReplacements})`);
  }
}

// ----- DB content section -----------------------------------------

const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(ROOT, '.env.local') });
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.log('\nNo DATABASE_URL — skipping DB pass.');
  process.exit(0);
}

function psqlRead(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-t', '-A', '-F', '\x1f', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve(out) : reject(new Error(err)));
  });
}
function psqlWrite(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-q'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err)));
    p.stdin.end(sql);
  });
}

function dq(tag, v) {
  if (v == null) return 'NULL';
  return `$${tag}$${v}$${tag}$`;
}

async function passOnTable({ table, keyCol, valueCol }) {
  const raw = await psqlRead(`SELECT ${keyCol}, ${valueCol} FROM ${table} WHERE ${valueCol} IS NOT NULL`);
  const rows = raw.split('\n').filter(Boolean).map(line => {
    const [k, v] = line.split('\x1f');
    return { k, v };
  });
  let n = 0;
  for (const r of rows) {
    const after = stripCompound(r.v);
    if (after === r.v) continue;
    const tag = `s${String(r.k).replace(/[^a-z0-9]/gi, '')}`;
    await psqlWrite(`UPDATE ${table} SET ${valueCol} = ${dq(tag, after)} WHERE ${keyCol} = ${dq('k' + tag, r.k)};`);
    n++;
    if (n % 25 === 0) console.log(`  ${table}.${valueCol}: ${n} rows updated`);
  }
  console.log(`  ${table}.${valueCol}: ${n} rows touched`);
}

(async () => {
  console.log(`\nSource: ${sourceFiles} file(s), ${sourceReplacements} line-level replacements.\n`);
  console.log('DB pass:');
  await passOnTable({ table: 'councils', keyCol: 'slug', valueCol: 'description' });
  await passOnTable({ table: 'mp_biography', keyCol: 'member_id::text', valueCol: 'political_bio' });
  await passOnTable({ table: 'department_context', keyCol: 'slug', valueCol: 'street_context' });
  console.log('\nDone.');
})();
