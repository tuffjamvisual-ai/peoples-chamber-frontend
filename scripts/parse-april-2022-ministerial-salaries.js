#!/usr/bin/env node
/**
 * Parses the April 2022 ministerial salary publication on gov.uk
 * (the last published list — Cabinet Office hasn't released a current
 * year disclosure since). Stores the structured rows so the next step
 * can UPSERT specific posts into peer_finance with an explicit
 * "Last published: April 2022" date label.
 *
 * Source:
 *   https://www.gov.uk/government/publications/ministerial-salary-data
 *   publication slug: ministerial-salary-data
 *   attachment:       salaries-of-members-of-his-majestys-government-april-2022-html
 *
 * Usage:
 *   node scripts/parse-april-2022-ministerial-salaries.js
 *   node scripts/parse-april-2022-ministerial-salaries.js --json > /tmp/ministerial-salaries-april-2022.json
 */

const SOURCE_URL =
  'https://www.gov.uk/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-april-2022-html';
const CONTENT_API =
  'https://www.gov.uk/api/content/government/publications/ministerial-salary-data/salaries-of-members-of-his-majestys-government-april-2022-html';
const PERIOD_LABEL = 'Last published April 2022';
const AS_JSON = process.argv.includes('--json');

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&pound;/g, '£')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(s) {
  if (!s) return null;
  const m = s.match(/£?\s*([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const res = await fetch(CONTENT_API);
  if (!res.ok) {
    console.error(`Fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  const body = data?.details?.body || '';

  // Find each section header and capture rows until the next h2/h3.
  // Section headings in the gov.uk HTML are <h2> / <h3> tags. Rows
  // sit in <tr> with three <td> cells: post | entitled | claimed.
  const sectionMatches = [...body.matchAll(/<h[23][^>]*>([^<]+)<\/h[23]>/g)];
  const rows = [];

  for (let i = 0; i < sectionMatches.length; i++) {
    const heading = stripTags(sectionMatches[i][1]);
    const start = sectionMatches[i].index + sectionMatches[i][0].length;
    const end = i + 1 < sectionMatches.length ? sectionMatches[i + 1].index : body.length;
    const chunk = body.slice(start, end);

    // Pull every <tr> in this section.
    for (const tr of chunk.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) =>
        stripTags(m[1]),
      );
      if (cells.length < 2) continue;
      const post = cells[0];
      const entitled = parseAmount(cells[1] || '');
      const claimed = parseAmount(cells[2] || '');
      // Skip header rows like "Post | Entitled salary (£) | Claimed salary (£)"
      if (!post || /post|entitled salary|salary \(/i.test(post)) continue;
      if (entitled == null && claimed == null) continue;
      rows.push({ section: heading, post, entitled, claimed });
    }
  }

  const output = {
    source_url: SOURCE_URL,
    period_label: PERIOD_LABEL,
    fetched_at: new Date().toISOString(),
    rows,
  };

  if (AS_JSON) {
    process.stdout.write(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`Period: ${PERIOD_LABEL}`);
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`Parsed rows: ${rows.length}`);
  console.log();

  // Group by section for human-readable output.
  const bySection = rows.reduce((acc, r) => {
    (acc[r.section] ||= []).push(r);
    return acc;
  }, {});

  for (const [section, secRows] of Object.entries(bySection)) {
    console.log(`── ${section} ──`);
    for (const r of secRows) {
      const ent = r.entitled != null ? `£${r.entitled.toLocaleString()}` : '—';
      const claim = r.claimed != null ? `£${r.claimed.toLocaleString()}` : '—';
      console.log(`  ${r.post.padEnd(60)}  entitled=${ent.padEnd(10)} claimed=${claim}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
