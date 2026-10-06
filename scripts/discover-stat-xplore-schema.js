#!/usr/bin/env node
// Development-time schema explorer for the DWP Stat-Xplore Open Data API.
//
// Purpose: find the real dataset IDs, field IDs and measure IDs for the
// six welfare-explorer benefits (Universal Credit, PIP, Housing Benefit,
// DLA, Carer's Allowance, ESA) by walking the live /schema tree, instead
// of hard-coding guessed field names from blog posts or old examples —
// Stat-Xplore's dataset/field IDs do change between releases.
//
// This is a CLI development tool only. It is never imported by the
// public site or by the production import job — those must use IDs
// that have been confirmed against a live /schema response and then
// recorded (with the response's own ID strings, not retyped by hand)
// in the import code.
//
// Usage:
//   node scripts/discover-stat-xplore-schema.js
//     -> lists the root folders/databases
//   node scripts/discover-stat-xplore-schema.js "str:folder:fuc"
//     -> lists that node's children (drill down one level at a time by
//        re-running with the id printed on the line you want to open)
//   node scripts/discover-stat-xplore-schema.js --search "personal independence"
//     -> recursively walks the tree (depth-limited) and prints every
//        folder/database whose label contains the search term

'use strict';
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.STAT_XPLORE_API_KEY;
if (!API_KEY) { console.error('STAT_XPLORE_API_KEY not set (.env.local)'); process.exit(1); }

const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const MAX_SEARCH_DEPTH = 4; // folders are only a few levels deep in practice

async function fetchSchema(id) {
  const url = id ? `${BASE}/schema/${encodeURIComponent(id)}` : `${BASE}/schema`;
  const res = await fetch(url, { headers: { APIKey: API_KEY } });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Auth failed (${res.status}) — check STAT_XPLORE_API_KEY is current and has not been regenerated.`);
  }
  if (!res.ok) throw new Error(`/schema${id ? '/' + id : ''} -> HTTP ${res.status}`);
  return res.json();
}

function printNode(node, indent = '') {
  console.log(`${indent}${node.type.padEnd(9)} ${node.id}  —  ${node.label}`);
}

async function listChildren(id) {
  const node = await fetchSchema(id);
  console.log(`\n${node.label} (${node.id})\n${'─'.repeat(60)}`);
  for (const child of node.children || []) printNode(child, '  ');
  if (!node.children || !node.children.length) {
    console.log('  (no children — this is a leaf. For a DATABASE node, drill one more'
      + ' level to see its MEASURE and FIELD nodes, which is what the import code needs.)');
  }
  return node;
}

async function search(term, id = undefined, depth = 0, seen = new Set()) {
  if (depth > MAX_SEARCH_DEPTH) return;
  const node = await fetchSchema(id);
  const needle = term.toLowerCase();
  for (const child of node.children || []) {
    if (seen.has(child.id)) continue;
    seen.add(child.id);
    if (child.label.toLowerCase().includes(needle)) printNode(child);
    // Only recurse into folders/databases, not into every measure/field —
    // those are reached by drilling into a matched database directly.
    if (child.type === 'FOLDER' || child.type === 'DATABASE') {
      await search(term, child.id, depth + 1, seen);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--search') {
    const term = args.slice(1).join(' ');
    if (!term) { console.error('Usage: --search "<term>"'); process.exit(1); }
    console.log(`Searching schema tree for "${term}" (depth <= ${MAX_SEARCH_DEPTH})...\n`);
    await search(term);
    return;
  }
  const id = args[0]; // undefined -> root
  await listChildren(id);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
