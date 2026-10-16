#!/usr/bin/env node
// Puts back the hyphens missing from council descriptions ("non metropolitan district",
// "well known") by checking each description against the Wikipedia article it came from
// (councils.wikipedia_url). Written 16 Oct 2026.
//
// Only hyphenated words that appear in the Wikipedia text are restored, and only where the
// description has the same words with a space instead ("non metropolitan" becomes
// "non-metropolitan" when Wikipedia has "non-metropolitan"). Nothing else in the text changes.
//
// DRY RUN BY DEFAULT: lists every change. Pass --write to save.
//
// Usage:
//   node scripts/fix-council-descriptions.js > council-descriptions-dryrun.txt 2>&1
//   node scripts/fix-council-descriptions.js --write > council-descriptions-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function wikiText(url) {
  const m = String(url || '').match(/wikipedia\.org\/wiki\/([^#?]+)/);
  if (!m) return null;
  const title = decodeURIComponent(m[1]);
  const api = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
  const res = await fetch(api, { headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk; contact@opengovt.uk)' } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status} for ${title}`);
  const j = await res.json();
  const page = Object.values((j.query && j.query.pages) || {})[0];
  return page && page.extract ? page.extract : null;
}

(async () => {
  const { data: councils, error } = await db.from('councils').select('slug, description, wikipedia_url').not('description', 'is', null).order('slug');
  if (error) throw new Error(error.message);
  let changed = 0, noWiki = 0;
  const updates = [];
  for (const c of councils) {
    let wiki = null;
    try { wiki = await wikiText(c.wikipedia_url); } catch (e) { console.log(`  ${c.slug}: ${e.message}`); }
    await sleep(200);
    if (!wiki) { noWiki++; continue; }
    // Every hyphenated word in the article, e.g. "non-metropolitan", "Stoke-on-Trent".
    const hyph = [...new Set(wiki.match(/\b[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+\b/gu) || [])].sort((a, b) => b.length - a.length);
    let text = c.description;
    const fixed = [];
    for (const h of hyph) {
      const spaced = h.replace(/-/g, ' ');
      const re = new RegExp(`\\b${esc(spaced)}\\b`, 'g');
      if (re.test(text)) { text = text.replace(re, h); fixed.push(h); }
    }
    if (text !== c.description) {
      changed++;
      updates.push({ slug: c.slug, description: text });
      console.log(`  ${c.slug}: ${fixed.join(', ')}`);
    }
  }
  console.log(`\ndescriptions: ${councils.length}; to fix: ${changed}; no Wikipedia text found: ${noWiki}`);
  if (!WRITE) { console.log('DRY RUN complete. Nothing was written.'); return; }
  for (const u of updates) {
    const { error: e } = await db.from('councils').update({ description: u.description }).eq('slug', u.slug);
    if (e) throw new Error(`${u.slug}: ${e.message}`);
  }
  console.log(`WRITE complete: ${updates.length} saved.`);
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
