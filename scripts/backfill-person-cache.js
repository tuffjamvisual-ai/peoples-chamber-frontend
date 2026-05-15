#!/usr/bin/env node
/**
 * Backfill / refresh person_cache from gov.uk. For every distinct slug
 * present in dept_ministers ∪ dept_officials, fetch
 *   https://www.gov.uk/api/content/government/people/<slug>
 * and upsert into person_cache. Mirrors backfill-agency-cache.js.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/backfill-person-cache.js [--dry-run]
 */

const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

function psql(sql) {
  return execSync(`psql "${DATABASE_URL}" -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
  });
}
function psqlT(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -v ON_ERROR_STOP=1`, {
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

async function fetchPerson(slug) {
  const res = await fetch(`https://www.gov.uk/api/content/government/people/${slug}`);
  if (!res.ok) throw new Error(`gov.uk ${res.status}`);
  const data = await res.json();

  const allRoles = (data?.links?.role_appointments || []).map((r) => ({
    title: r.links?.role?.[0]?.title || '',
    organisation: r.links?.role?.[0]?.links?.ordered_parent_organisations?.[0]?.title || '',
    startDate: r.details?.started_on || '',
    endDate: r.details?.ended_on || '',
    current: !!r.details?.current,
    body: r.links?.role?.[0]?.details?.body || '',
  }));

  const current_roles = allRoles.filter((r) => r.current);
  const past_roles = allRoles
    .filter((r) => !r.current)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  return {
    name: data?.title || '',
    photo: data?.details?.image?.url || '',
    current_roles,
    past_roles,
  };
}

async function run() {
  const slugLines = psqlT(`
    SELECT DISTINCT slug FROM (
      SELECT slug FROM dept_ministers WHERE slug IS NOT NULL AND slug <> ''
      UNION
      SELECT slug FROM dept_officials WHERE slug IS NOT NULL AND slug <> ''
    ) s
    ORDER BY slug;
  `).trim().split('\n').filter(Boolean);

  console.log(`Refreshing ${slugLines.length} people${DRY_RUN ? ' (dry-run)' : ''}`);

  let ok = 0, fail = 0, i = 0;
  for (const slug of slugLines) {
    i++;
    try {
      const p = await fetchPerson(slug);
      if (!DRY_RUN) {
        psql(`
          INSERT INTO person_cache (slug, name, photo, current_roles, past_roles, last_synced)
          VALUES (
            ${sqlLiteral(slug)},
            ${sqlLiteral(p.name)},
            ${sqlLiteral(p.photo)},
            ${jsonLiteral(p.current_roles)},
            ${jsonLiteral(p.past_roles)},
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            photo = EXCLUDED.photo,
            current_roles = EXCLUDED.current_roles,
            past_roles = EXCLUDED.past_roles,
            last_synced = NOW();
        `);
      }
      ok++;
      if (i % 25 === 0) console.log(`  ${i}/${slugLines.length} (ok=${ok}, fail=${fail})`);
    } catch (err) {
      fail++;
      if (fail <= 10) console.log(`  ✗ ${slug} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`Done — ok=${ok}, fail=${fail}, total=${slugLines.length}`);
}

run();
