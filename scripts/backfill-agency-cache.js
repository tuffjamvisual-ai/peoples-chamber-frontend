#!/usr/bin/env node
/**
 * Backfill / refresh agency_cache from gov.uk. For every distinct agency
 * slug present in dept_agencies (source of truth), fetch
 *   https://www.gov.uk/api/content/government/organisations/<slug>
 * and upsert into agency_cache. Mirrors backfill-department-contacts.js.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/backfill-agency-cache.js [--dry-run]
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

async function fetchAgency(slug) {
  const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${slug}`);
  if (!res.ok) throw new Error(`gov.uk ${res.status}`);
  const data = await res.json();

  const details = data?.details || {};
  const links = data?.links || {};

  const name = data.title || '';
  const description = data.description || '';
  const body = (details.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const acronym = details.acronym || '';

  const ministers = (links.ordered_ministers || []).map((m) => {
    const currentRole = m.links?.role_appointments?.find((r) => r.details?.current);
    return {
      name: m.title,
      role: currentRole?.links?.role?.[0]?.title || '',
      slug: m.base_path?.replace('/government/people/', '') || '',
    };
  }).filter((m) => m.role);

  const boardMembers = (links.ordered_board_members || []).map((m) => {
    const currentRole = m.links?.role_appointments?.find((r) => r.details?.current);
    return {
      name: m.title,
      role: currentRole?.links?.role?.[0]?.title || '',
      slug: m.base_path?.replace('/government/people/', '') || '',
    };
  }).filter((m) => m.role);

  const parentOrgs = (links.ordered_parent_organisations || []).map((o) => ({
    name: o.title,
    slug: o.base_path?.replace('/government/organisations/', '') || '',
  }));

  const featuredDocs = (details.ordered_featured_documents || []).map((d) => ({
    title: d.title,
    url: `https://www.gov.uk${d.href}`,
    summary: (d.summary || '').replace(/<[^>]+>/g, '').trim(),
    type: d.document_type || '',
  }));

  const socialMedia = (details.social_media_links || []).map((s) => ({
    service: s.service_type,
    url: s.href,
  }));

  return { name, description, body, acronym, ministers, board_members: boardMembers, parent_orgs: parentOrgs, featured_docs: featuredDocs, social_media: socialMedia };
}

async function run() {
  // dept_agencies.url ends with /government/organisations/<slug>, so we
  // extract the slug from there. There may be duplicates across depts.
  const slugLines = psqlT(`
    SELECT DISTINCT regexp_replace(url, '^.*/government/organisations/', '') AS slug
    FROM dept_agencies
    WHERE url ILIKE '%/government/organisations/%'
    ORDER BY slug;
  `).trim().split('\n').filter(Boolean);

  console.log(`Refreshing ${slugLines.length} agencies${DRY_RUN ? ' (dry-run)' : ''}`);

  let ok = 0, fail = 0, i = 0;
  for (const slug of slugLines) {
    i++;
    try {
      const a = await fetchAgency(slug);
      if (!DRY_RUN) {
        psql(`
          INSERT INTO agency_cache (slug, name, description, body, acronym, ministers, board_members, parent_orgs, featured_docs, social_media, updated_at)
          VALUES (
            ${sqlLiteral(slug)},
            ${sqlLiteral(a.name)},
            ${sqlLiteral(a.description)},
            ${sqlLiteral(a.body)},
            ${sqlLiteral(a.acronym)},
            ${jsonLiteral(a.ministers)},
            ${jsonLiteral(a.board_members)},
            ${jsonLiteral(a.parent_orgs)},
            ${jsonLiteral(a.featured_docs)},
            ${jsonLiteral(a.social_media)},
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            body = EXCLUDED.body,
            acronym = EXCLUDED.acronym,
            ministers = EXCLUDED.ministers,
            board_members = EXCLUDED.board_members,
            parent_orgs = EXCLUDED.parent_orgs,
            featured_docs = EXCLUDED.featured_docs,
            social_media = EXCLUDED.social_media,
            updated_at = NOW();
        `);
      }
      ok++;
      if (i % 25 === 0) console.log(`  ${i}/${slugLines.length} (ok=${ok}, fail=${fail})`);
    } catch (err) {
      fail++;
      console.log(`  ✗ ${slug} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`Done — ok=${ok}, fail=${fail}, total=${slugLines.length}`);
}

run();
