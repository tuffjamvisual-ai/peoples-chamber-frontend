// Sync lib/editorials/ registry into the public.editorials Postgres table.
//
// Run via Vercel prebuild:  "prebuild": "npx tsx scripts/sync-editorials-to-db.ts"
//                           (add to package.json scripts)
//
// Writes only happen on production Vercel deploys (VERCEL_ENV === 'production').
// On preview, development, or local (VERCEL_ENV unset), the script logs and
// exits 0 without touching the database — even if service-role credentials
// happen to be present in the environment.
//
// Exits non-zero on any DB error on a production deploy, so a broken sync
// fails the build visibly.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { editorials } from '../lib/editorials/index';
import type { Block } from '../lib/editorials/types';

config({ path: '.env.local' });

// Vercel sets VERCEL_ENV to 'production' | 'preview' | 'development'.
// Writes are intentionally restricted to production deploys only.
const VERCEL_ENV = process.env.VERCEL_ENV;

if (VERCEL_ENV !== 'production') {
  console.log(
    `sync-editorials: VERCEL_ENV=${VERCEL_ENV ?? '(unset)'} — ` +
    `writes only run on production deploys, skipping`
  );
  process.exit(0);
}

// On a production deploy these must be present; missing = real misconfiguration.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'sync-editorials: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY ' +
    'missing on production deploy — failing build'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extractBodyText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'bioLine':
      case 'pullQuote':
      case 'cta':
        parts.push(block.text);
        break;
      case 'heading':
        parts.push(block.text);
        break;
      case 'statBlock':
        parts.push([block.stat, block.label, block.context].filter(Boolean).join(' '));
        break;
      case 'dataBlock':
        parts.push([block.headlineFigure, block.context].filter(Boolean).join(' '));
        break;
      case 'councilEntry':
        parts.push([block.name, block.topLine, ...block.paragraphs, block.verdict].join(' '));
        break;
      case 'mpEntry':
        parts.push([block.name, block.topLine, ...block.paragraphs, block.verdict].join(' '));
        break;
      // signature: no readable text
    }
  }
  return parts.join('\n\n');
}

async function main() {
  const entries = Object.values(editorials);
  console.log(`sync-editorials: syncing ${entries.length} entries`);

  const now = new Date().toISOString();
  let ok = 0;
  let failed = 0;

  for (const piece of entries) {
    const row = {
      slug:               piece.slug,
      headline:           piece.headline,
      standfirst:         piece.standfirst,
      published_at:       piece.publishedAt,
      author_byline:      piece.authorByline,
      kind:               piece.kind   ?? null,
      kicker:             piece.kicker ?? null,
      body_text:          extractBodyText(piece.body),
      body_json:          piece.body as unknown as object,
      related_dept_slugs: piece.relatedDeptSlugs  ?? [],
      related_member_ids: piece.relatedMemberIds  ?? [],
      related_bill_ids:   piece.relatedBillIds    ?? [],
      synced_at:          now,
      // search_vec is GENERATED ALWAYS AS STORED — not supplied in upsert
    };

    const { error } = await supabase
      .from('editorials')
      .upsert(row, { onConflict: 'slug' });

    if (error) {
      console.error(`  FAIL  ${piece.slug}  ${error.message}`);
      failed++;
    } else {
      console.log(`  ok    ${piece.slug}`);
      ok++;
    }
  }

  console.log(`\nsync-editorials: ${ok} ok, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('sync-editorials: fatal error:', e);
  process.exit(1);
});
