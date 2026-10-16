#!/usr/bin/env node
// Council website addresses from GOV.UK's local authority register
// (https://www.gov.uk/api/local-authority/<slug>, the register behind "Find your local
// council"). Written 16 Oct 2026: 18 councils had no website and others carried addresses
// picked up from Wikipedia pages by mistake (an ONS population table for St Albans, a BBC
// article for Conwy, a dictionary entry for Lichfield, tourism sites for Kent and North Devon).
//
// For each council it tries the likely GOV.UK slugs and accepts a match only when GOV.UK's
// council name matches ours. Then:
//   - our address missing, or on a different site from GOV.UK's (a news article, a statistics
//     page, a council's old name): GOV.UK's site is used, at its home page
//   - our address on the same site as GOV.UK's: ours is kept, trimmed to the home page if it
//     pointed at an inner page (GOV.UK's own links are sometimes odd, e.g. "m." or "new." sites)
// Addresses on government domains (.gov.uk, .gov.wales, .gov.scot, .llyw.cymru) are always saved
// as https, which government sites must support; an existing https address is never changed to
// http. Odd host names (m., new., next., my., go., www3., main., services., democracy. and similar) become www.
// Addresses are not test-loaded: many council sites block automated visits, which made a
// loading test refuse good addresses and suggest http for sites that work on https.
// A few councils GOV.UK does not list are set by hand (OVERRIDES). Councils not matched and
// not overridden are left as they are.
//
// DRY RUN BY DEFAULT: lists every change. Pass --write to save website_url.
//
// Usage:
//   node scripts/fix-council-websites.js > council-websites-dryrun.txt 2>&1
//   node scripts/fix-council-websites.js --write > council-websites-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GENERIC = /\b(the|of|council|borough|district|city|county|metropolitan|royal|london|and|unitary|authority|corporation|comhairle|nan|eilean|siar)\b/g;
const core = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/['’.]/g, '').replace(GENERIC, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const slugify = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function candidates(c) {
  const out = new Set();
  out.add(c.slug);
  out.add(c.slug.replace(/-s-/g, 's-'));
  if (c.short_name) out.add(slugify(c.short_name));
  out.add(slugify(String(c.name).replace(/\b(Council|Borough|District|City|Metropolitan|County|Royal|of|the)\b/gi, ' ')));
  out.add(slugify(String(c.name).replace(/\s+(Council|Borough Council|District Council|City Council|County Council|Metropolitan Borough Council)$/i, '')));
  return [...out].filter(Boolean);
}

// Councils GOV.UK's register does not match by name, checked by hand on 16 Oct 2026.
const OVERRIDES = {
  'city-of-london-corporation': 'https://www.cityoflondon.gov.uk/',
  'newcastle': 'https://www.newcastle.gov.uk/',
  'folkestone-and-hythe': 'https://www.folkestone-hythe.gov.uk/',
  'hull': 'https://www.hull.gov.uk/',
};

// The site an address belongs to: the last three labels for .gov.uk-style names
// (devon.gov.uk), the last two otherwise (derrystrabane.com).
function siteOf(u) {
  let host;
  try { host = new URL(u).hostname.toLowerCase(); } catch { return null; }
  const parts = host.split('.');
  const three = /\.(gov|org|co|ac|police)\.(uk)$|\.gov\.(wales|scot)$|\.llyw\.cymru$/.test(host);
  return parts.slice(three ? -3 : -2).join('.');
}
const GOV_HOST = /\.(gov\.uk|gov\.wales|gov\.scot|llyw\.cymru)$/i;
// Home page of an address: https on government domains, odd register host names tidied.
function homeOf(u, tidy) {
  const x = new URL(u);
  let host = x.hostname.toLowerCase();
  if (tidy) host = host.replace(/^(m|new|next|my|go|www\d|main|services|democracy|committees?|moderngov|cmis)\./, 'www.');
  const proto = GOV_HOST.test(host) ? 'https:' : x.protocol;
  return `${proto}//${host}/`;
}

async function lookup(slug) {
  const res = await fetch(`https://www.gov.uk/api/local-authority/${slug}`, { headers: { Accept: 'application/json', 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GOV.UK ${res.status} for ${slug}`);
  const j = await res.json();
  return j.local_authority || null;
}

(async () => {
  const { data: councils, error } = await db.from('councils').select('slug, name, short_name, website_url').order('slug');
  void sleep;
  if (error) throw new Error(error.message);
  let same = 0, filled = 0, replaced = 0;
  const changes = [];
  const unmatched = [];
  const dead = [];
  for (const c of councils) {
    let govuk = OVERRIDES[c.slug] || null;
    if (!govuk) {
      for (const s of candidates(c)) {
        const la = await lookup(s);
        await sleep(150);
        if (la && core(la.name) === core(c.name) && la.homepage_url) { govuk = la.homepage_url; break; }
      }
    }
    if (!govuk) { unmatched.push(`${c.slug} (${c.name}); ours: ${c.website_url || 'none'}`); continue; }
    const ours = c.website_url && siteOf(c.website_url) ? c.website_url : null;
    // Same site as GOV.UK's: keep ours (its home page). Otherwise GOV.UK's home page.
    const sameSite = ours && siteOf(ours) === siteOf(govuk);
    let target = sameSite ? homeOf(ours, true) : homeOf(govuk, !OVERRIDES[c.slug]);
    // Never move an existing https address to http.
    if (ours && /^https:/i.test(ours) && /^http:/i.test(target) && new URL(ours).hostname === new URL(target).hostname) target = target.replace(/^http:/i, 'https:');
    const norm = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
    const proto = (u) => String(u || '').split(':')[0].toLowerCase();
    if (c.website_url && norm(c.website_url) === norm(target) && proto(c.website_url) === proto(target)) { same++; continue; }
    if (c.website_url) replaced++; else filled++;
    changes.push({ slug: c.slug, from: c.website_url, to: target, why: !ours ? 'missing or not a council site' : sameSite ? (norm(ours) === norm(target) ? (/^http:/i.test(ours) ? 'http to https' : 'tidied') : 'home page') : 'different site from GOV.UK' });
  }
  console.log(`councils: ${councils.length}; already right: ${same}; to fill: ${filled}; to replace: ${replaced}; not matched on GOV.UK: ${unmatched.length}`);
  console.log('\nchanges:');
  for (const ch of changes) console.log(`  ${ch.slug}: ${ch.from || '(none)'}  ->  ${ch.to}   [${ch.why}]`);
  if (dead.length) console.log(`\naddresses that did not load (left as they are):\n  ${dead.join('\n  ')}`);
  console.log(`\nnot matched (left as they are, for a person to check):\n  ${unmatched.join('\n  ')}`);
  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }
  for (const ch of changes) {
    const { error: e } = await db.from('councils').update({ website_url: ch.to }).eq('slug', ch.slug);
    if (e) throw new Error(`${ch.slug}: ${e.message}`);
  }
  console.log(`\nWRITE complete: ${changes.length} saved.`);
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
