#!/usr/bin/env node
// Backfill councils.chief_exec from Wikipedia infoboxes.
//
// SOURCE AND RELIABILITY — READ BEFORE USING THE OUTPUT DATA
// ──────────────────────────────────────────────────────────
// This script reads the raw wikitext of each council's Wikipedia article
// and extracts the chief executive name from the {{Infobox legislature}}
// leaderN_type / leaderN parameter pair.
//
// Wikipedia is crowd-edited and is NOT a primary source. Chief executives
// change jobs frequently — turnover is typically 2–4 years — and Wikipedia
// articles are often updated weeks or months after the fact, or not at all.
// Treat every value written by this script as a best-effort starting point
// that requires re-verification before being cited or quoted. Do not treat
// these values as having the same reliability as the GOV.UK-sourced finance
// data or the Parliament API-sourced MP data elsewhere in this database.
//
// The data_source convention used elsewhere in this codebase for Wikidata-
// derived fields applies here: tag mentally as "wikipedia/best-effort".
//
// EXTRACTION RULE
// ───────────────
// For councils using {{Infobox legislature}}: scan leaderN_type parameters
// for a value whose plain text (wiki links stripped) matches "chief executive"
// or "managing director" (case-insensitive). Read the corresponding leaderN
// value and strip <ref>…</ref>, [[…|display]] links, and HTML comments.
//
// Slot N is NOT fixed — it's leader3 in the majority of cases but varies
// (e.g. leader4 at Birmingham where Deputy Leader occupies slot 3). The
// match on the type label is the reliable signal, not the slot number.
//
// SCOPE
// ─────
// Excludes: 11 NI councils (gss_code LIKE 'N09%') — confirmed 0% coverage;
//   their Wikipedia infoboxes only list elected posts (Mayor / Deputy Mayor),
//   not the chief executive.
// London boroughs: attempted — the script detects {{Infobox settlement}}
//   (no chief exec field) vs {{Infobox legislature}} (attempt) per page
//   rather than skipping the whole group; only ~3–5 of 33 are expected to
//   match.
// All other councils: attempted.
//
// Run without --live to preview matches and coverage (default dry-run).
// Pass --live to write NULL-only to the database.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const DRY_RUN   = !process.argv.includes('--live');
const UA        = 'PeoplesChamber/1.0 (https://opengovt.uk; tuffjamvisual@gmail.com)';
const DELAY_MS  = 250; // polite inter-request pause

// ── DB helpers ────────────────────────────────────────────────────────────
function psqlRead(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-t', '-A', '-F', '|', '-c', sql],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
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

// ── Markup stripping ──────────────────────────────────────────────────────
function stripRefs(s) {
  return s
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref\b[^>]*\/>/gi, '');
}
function stripWikiLinks(s) {
  // [[Article|Display]] → Display; [[Article]] → Article
  return s.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const parts = inner.split('|');
    return parts[parts.length - 1].trim();
  });
}
function stripTemplates(s) {
  // {{nowrap|text}} → text; bare {{template}} → ''
  return s
    .replace(/\{\{[^|{}]+\|([^{}]+)\}\}/g, (_, content) => content.trim())
    .replace(/\{\{[^{}]+\}\}/g, '');
}
function stripHtmlComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, '');
}
function cleanValue(raw) {
  let s = raw;
  s = stripRefs(s);
  s = stripHtmlComments(s);
  s = stripWikiLinks(s);
  s = stripTemplates(s);
  s = s.replace(/<[^>]+>/g, '');  // residual HTML tags
  return s.trim();
}

// ── Core extraction ───────────────────────────────────────────────────────
// Returns: { name, rawType, isAmbiguous } | null
// isAmbiguous = true when the type label is more than just "chief executive"
// or "managing director" — e.g. "(acting)", "interim", "and head of paid service"
function extractChiefExec(wikitext) {
  // Only scan within the first {{Infobox legislature block.
  // We work line-by-line rather than trying to bracket-match nested templates.
  const lines = wikitext.split('\n');
  let inInfobox = false;
  const leaderTypes = new Map(); // N → {rawType, line}
  const leaderNames = new Map(); // N → rawValue

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inInfobox) {
      if (/^\{\{[Ii]nfobox\s+[Ll]egislature/.test(trimmed)) inInfobox = true;
      continue;
    }
    // Stop at the closing }} of the top-level infobox (or another top-level template start)
    if (/^\}\}/.test(trimmed)) break;

    const typeMatch = trimmed.match(/^\|\s*leader(\d+)_type\s*=\s*(.+)$/);
    if (typeMatch) {
      leaderTypes.set(typeMatch[1], typeMatch[2]);
      continue;
    }
    const nameMatch = trimmed.match(/^\|\s*leader(\d+)\s*=\s*(.+)$/);
    if (nameMatch) {
      leaderNames.set(nameMatch[1], nameMatch[2]);
    }
  }

  if (!inInfobox) return null;  // not an Infobox legislature page

  // Scan type entries in slot order
  for (const [n, rawType] of [...leaderTypes.entries()].sort((a, b) => +a[0] - +b[0])) {
    const plainType = cleanValue(rawType).toLowerCase();
    const isCE = plainType.includes('chief executive');
    const isMD = plainType.includes('managing director');
    if (!isCE && !isMD) continue;

    const rawName = leaderNames.get(n);
    if (!rawName) continue;

    const name = cleanValue(rawName);
    if (!name || name.length < 2) continue;

    // Exact canonical forms vs anything longer/modified
    const isExact = ['chief executive', 'managing director'].includes(plainType);
    const isAmbiguous = !isExact;

    return { name, rawType: rawType.trim(), isAmbiguous };
  }

  return null;
}

// ── Qualifier rules ───────────────────────────────────────────────────────
// Applies user-approved handling for ambiguous type labels:
//   (acting) / (interim)  → keep name, append qualifier in parens
//   Joint Chief Executives, readable ("and" present) → write as-is
//   Joint Chief Executives, broken (no "and") → SKIP
//   Town Clerk and Chief Executive → append full title in parens
//   Other ambiguous → write as-is (fallback)
function applyQualifierRules(matched) {
  const writes  = [];
  const skipped = [];

  for (const r of matched) {
    if (!r.isAmbiguous) {
      writes.push({ ...r, writeValue: r.chief_exec });
      continue;
    }

    const pt = cleanValue(r.rawType).toLowerCase();

    if (pt.includes('joint chief executives')) {
      if (r.chief_exec.includes(' and ')) {
        writes.push({ ...r, writeValue: r.chief_exec });
      } else {
        skipped.push({ ...r, skipReason: 'joint CE — broken extraction (no " and " separator)' });
      }
      continue;
    }

    if (pt.includes('town clerk')) {
      writes.push({ ...r, writeValue: `${r.chief_exec} (Town Clerk and Chief Executive)` });
      continue;
    }

    // (acting) or (interim)
    const qualifierMatch = r.rawType.match(/\((acting|interim)\)/i);
    if (qualifierMatch) {
      const q = qualifierMatch[1].toLowerCase();
      writes.push({ ...r, writeValue: `${r.chief_exec} (${q})` });
      continue;
    }

    // Fallback — write as-is
    writes.push({ ...r, writeValue: r.chief_exec });
  }

  return { writes, skipped };
}

// ── Wikipedia fetch ────────────────────────────────────────────────────────
async function fetchWikitext(pageTitle) {
  const url = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(pageTitle)}&action=raw`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  return res.text();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pageTitle(wikipediaUrl) {
  // https://en.wikipedia.org/wiki/Leeds_City_Council → Leeds_City_Council
  const m = wikipediaUrl.match(/\/wiki\/([^#?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log(DRY_RUN
    ? '=== DRY RUN — pass --live to write ===\n'
    : '=== LIVE — writing to production DB ===\n');

  // Load all councils except NI (N09 GSS prefix), where chief_exec is NULL
  const raw = await psqlRead(`
    SELECT slug, name, gss_code, wikipedia_url
    FROM councils
    WHERE chief_exec IS NULL
      AND gss_code NOT LIKE 'N09%'
    ORDER BY slug
  `);
  const councils = raw.split('\n').filter(Boolean).map(line => {
    const [slug, name, gss_code, wikipedia_url] = line.split('|');
    return { slug, name, gss_code, wikipedia_url };
  });
  console.log(`Attempting ${councils.length} councils (NI excluded).\n`);

  const results = {
    matched:    [],   // { slug, name, chief_exec, rawType, isAmbiguous, gss }
    settlement: [],   // { slug, name } — Infobox settlement, no exec field
    noExec:     [],   // { slug, name } — Infobox legislature but no CE entry
    noInfobox:  [],   // { slug, name } — neither template found / fetch failed
  };

  for (let i = 0; i < councils.length; i++) {
    const c = councils[i];
    const title = pageTitle(c.wikipedia_url);
    if (!title) { results.noInfobox.push(c); continue; }

    if (i > 0) await sleep(DELAY_MS);
    if ((i + 1) % 50 === 0 || i === 0)
      process.stdout.write(`  fetching ${i + 1}/${councils.length}…\r`);

    let wikitext;
    try { wikitext = await fetchWikitext(title); }
    catch { results.noInfobox.push(c); continue; }
    if (!wikitext) { results.noInfobox.push(c); continue; }

    // Check template type
    const hasLegislature = /\{\{[Ii]nfobox\s+[Ll]egislature/.test(wikitext);
    const hasSettlement  = /\{\{[Ii]nfobox\s+[Ss]ettlement/.test(wikitext);

    if (!hasLegislature && hasSettlement) {
      results.settlement.push(c);
      continue;
    }
    if (!hasLegislature) {
      results.noInfobox.push(c);
      continue;
    }

    const extracted = extractChiefExec(wikitext);
    if (!extracted) {
      results.noExec.push(c);
      continue;
    }

    results.matched.push({
      slug:       c.slug,
      councilName: c.name,
      gss:        c.gss_code,
      chief_exec: extracted.name,
      rawType:    extracted.rawType,
      isAmbiguous: extracted.isAmbiguous,
    });
  }

  process.stdout.write('\n');

  // Apply qualifier rules to get final write set
  const { writes, skipped: qualSkipped } = applyQualifierRules(results.matched);

  // ── Coverage report ──────────────────────────────────────────────────
  const total = councils.length;
  console.log('\n=== COVERAGE REPORT ===\n');
  console.log(`Attempted:            ${total}`);
  console.log(`Will write:           ${writes.length} (${pct(writes.length, total)})`);
  console.log(`Skipped (qualifier):  ${qualSkipped.length}`);
  console.log(`Settlement template:  ${results.settlement.length} (${pct(results.settlement.length, total)}) — no exec field by design`);
  console.log(`Legislature, no exec: ${results.noExec.length} (${pct(results.noExec.length, total)}) — exec not in this council's infobox`);
  console.log(`Fetch/parse failure:  ${results.noInfobox.length} (${pct(results.noInfobox.length, total)})`);

  // Breakdown by nation
  const byNation = (list, prefix) => list.filter(r => (r.gss || r.gss_code || '').startsWith(prefix)).length;
  console.log('\nWill-write breakdown by nation:');
  console.log(`  England (E):  ${byNation(writes, 'E')}`);
  console.log(`  Scotland (S): ${byNation(writes, 'S')}`);
  console.log(`  Wales (W):    ${byNation(writes, 'W')}`);

  // ── Ambiguous cases resolved ──────────────────────────────────────────
  const ambiguous = results.matched.filter(r => r.isAmbiguous);
  if (ambiguous.length > 0) {
    console.log(`\n=== AMBIGUOUS RESOLVED (${ambiguous.length} cases → ${ambiguous.length - qualSkipped.length} write, ${qualSkipped.length} skip) ===\n`);
    console.log('action  slug'.padEnd(50) + 'final write value');
    console.log('─'.repeat(110));
    const skippedSlugs = new Set(qualSkipped.map(r => r.slug));
    for (const r of ambiguous.sort((a, b) => a.slug.localeCompare(b.slug))) {
      if (skippedSlugs.has(r.slug)) {
        console.log(('SKIP    ' + r.slug).padEnd(50) + `(${qualSkipped.find(s => s.slug === r.slug).skipReason})`);
      } else {
        const w = writes.find(w => w.slug === r.slug);
        console.log(('WRITE   ' + r.slug).padEnd(50) + w.writeValue);
      }
    }
  }

  // ── Sample of clean matches (mix of nations + London exception) ───────
  console.log('\n=== SAMPLE MATCHES (8–10 for spot-check) ===\n');
  const sample = pickSample(writes);
  console.log('slug'.padEnd(42) + 'type label'.padEnd(30) + 'write value');
  console.log('─'.repeat(100));
  for (const r of sample) {
    console.log(r.slug.padEnd(42) + r.rawType.padEnd(30) + r.writeValue);
  }

  // ── Settlement template list (informational) ──────────────────────────
  if (results.settlement.length > 0) {
    console.log(`\n=== SETTLEMENT TEMPLATE (skipped — ${results.settlement.length} councils) ===`);
    console.log(results.settlement.map(c => c.slug).join(', '));
  }

  // ── Legislature but no exec entry ─────────────────────────────────────
  if (results.noExec.length > 0) {
    console.log(`\n=== LEGISLATURE TEMPLATE, NO EXEC ENTRY (${results.noExec.length}) ===`);
    console.log(results.noExec.map(c => c.slug).join(', '));
  }

  if (DRY_RUN) {
    console.log(`\nDry run complete. ${writes.length} values ready. Re-run with --live to apply.\n`);
    return;
  }

  // ── Live write: NULL-only, all in one transaction ─────────────────────
  if (writes.length === 0) { console.log('Nothing to write.'); return; }
  console.log(`\nWriting ${writes.length} rows…`);

  // Dollar-quote each name tagged with slug so special characters can't break SQL
  const stmts = writes.map(r => {
    const tag = `chief_${r.slug.replace(/-/g, '_')}`;
    return `UPDATE councils SET chief_exec = $${tag}$${r.writeValue}$${tag}$ WHERE slug = '${r.slug}' AND chief_exec IS NULL;`;
  });
  await psqlWrite(`BEGIN;\n${stmts.join('\n')}\nCOMMIT;\n`);
  console.log('Done.\n');

  // Post-write verification
  const after = await psqlRead(
    `SELECT count(*) FROM councils WHERE chief_exec IS NOT NULL`
  );
  console.log(`chief_exec filled: ${after} councils`);
})();

// ── Helpers ───────────────────────────────────────────────────────────────
function pct(n, total) { return total ? `${Math.round(100 * n / total)}%` : '0%'; }

function pickSample(matched) {
  // Aim for ~2 English, 2 Scottish, 2 Welsh, 1 London borough exception,
  // plus a couple of others at random — up to 10 total.
  const eng  = matched.filter(r => r.gss.startsWith('E') && !r.gss.startsWith('E09'));
  const lon  = matched.filter(r => r.gss.startsWith('E09'));
  const sco  = matched.filter(r => r.gss.startsWith('S'));
  const wal  = matched.filter(r => r.gss.startsWith('W'));
  const pick = (arr, n) => arr.sort(() => 0.5 - Math.random()).slice(0, n);
  return [
    ...pick(eng, 3),
    ...pick(lon, 1),
    ...pick(sco, 2),
    ...pick(wal, 2),
  ].slice(0, 10);
}
