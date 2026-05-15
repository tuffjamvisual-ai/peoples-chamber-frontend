#!/usr/bin/env node
/**
 * Backfill department_contacts from gov.uk. For each of the 24
 * slugs in lib/govuk-slugs.ts, fetch
 *   https://www.gov.uk/api/content/government/organisations/<govuk-slug>
 * and extract:
 *   - social_media_links (array of {service, url, title})
 *   - foi_email
 *   - press_phone
 *
 * Then UPSERT into department_contacts keyed by dept_slug.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/backfill-department-contacts.js [--dry-run]
 *
 * The cron route /api/sync-department-contacts re-uses the same
 * extraction logic via the exported function below.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse lib/govuk-slugs.ts as text — avoids needing ts-node here.
function loadGovukSlugs() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'govuk-slugs.ts'), 'utf8');
  const out = {};
  const re = /'([^']+)':\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) out[m[1]] = m[2];
  return out;
}

async function fetchContacts(govukSlug) {
  const res = await fetch(
    `https://www.gov.uk/api/content/government/organisations/${govukSlug}`,
  );
  if (!res.ok) throw new Error(`gov.uk ${res.status}`);
  const data = await res.json();

  const details = data?.details || {};
  const links = data?.links || {};

  const social_media_links = (details.social_media_links || []).map((s) => ({
    service: s.service_type,
    url: s.href,
    title: s.title,
  }));
  const foi_email =
    links.ordered_foi_contacts?.[0]?.details?.email_addresses?.[0]?.email || '';
  const orderedContacts = links.ordered_contacts || [];
  const press_phone =
    orderedContacts.find((c) => c.title?.toLowerCase().includes('media'))?.details
      ?.phone_numbers?.[0]?.number || '';

  return { social_media_links, foi_email, press_phone };
}

function psql(sql) {
  // Pipe SQL via stdin; -c rejects newlines (treats them as psql
  // meta-command separators).
  return execSync(`psql "${DATABASE_URL}" -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
  });
}

function sqlLiteral(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function jsonLiteral(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

async function run() {
  const slugs = loadGovukSlugs();
  const entries = Object.entries(slugs);
  console.log(`Backfilling ${entries.length} departments${DRY_RUN ? ' (dry-run)' : ''}`);

  let ok = 0,
    fail = 0;
  for (const [deptSlug, govukSlug] of entries) {
    try {
      const c = await fetchContacts(govukSlug);
      if (DRY_RUN) {
        console.log(
          `  [dry] ${deptSlug.padEnd(28)} social=${c.social_media_links.length} foi=${c.foi_email || '-'} press=${c.press_phone || '-'}`,
        );
      } else {
        psql(`
          INSERT INTO department_contacts (dept_slug, social_media_links, foi_email, press_phone, last_synced)
          VALUES (${sqlLiteral(deptSlug)}, ${jsonLiteral(c.social_media_links)}, ${sqlLiteral(c.foi_email)}, ${sqlLiteral(c.press_phone)}, NOW())
          ON CONFLICT (dept_slug) DO UPDATE SET
            social_media_links = EXCLUDED.social_media_links,
            foi_email = EXCLUDED.foi_email,
            press_phone = EXCLUDED.press_phone,
            last_synced = NOW();
        `);
        console.log(
          `  ✓ ${deptSlug.padEnd(28)} social=${c.social_media_links.length} foi=${c.foi_email ? 'yes' : '-'} press=${c.press_phone ? 'yes' : '-'}`,
        );
      }
      ok++;
    } catch (err) {
      console.log(`  ✗ ${deptSlug.padEnd(28)} ${err.message}`);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`Done — ok=${ok}, fail=${fail}`);
}

run();
