// QA2c (owner approved via Cowork, 9 Nov 2026): every "Updated <date>" line a page shows, judged against the limit of
// the source it names. The line is app/components/RecordDate.tsx: <p class="og-record-date" data-source="table.column">.
// The limit is that source's cadence in lib/data-freshness.ts (CADENCE_MAX_AGE_DAYS: keep MAX_AGE in step), read from the
// file's text because that module needs the Next.js server to load. A line with no data-source, or a source not listed
// there, falls back to the most lenient cadence of the sources listed for the page's route, as before.
// Shared by scripts/checks/qa/weekly-live-check.ts and scripts/checks/qa/rendered-checks.mjs.
import fs from 'fs';
import path from 'path';

export const MAX_AGE = { daily: 2, weekly: 9, monthly: 35, quarterly: 100, annual: 400 };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function loadSources(root) {
  return fs.readFileSync(path.join(root, 'lib/data-freshness.ts'), 'utf8').split('\n')
    .map((l) => ({
      table: /table: '([^']+)'/.exec(l)?.[1], column: /column: '([^']+)'/.exec(l)?.[1],
      cadence: /cadence: '(\w+)'/.exec(l)?.[1], page: /page: '([^']+)'/.exec(l)?.[1],
    }))
    .filter((s) => s.table && s.column && s.cadence && MAX_AGE[s.cadence] != null);
}

// Every "Updated <d Month yyyy>" line in the HTML, with the source it names (or null).
export function recordDates(html) {
  const out = [];
  for (const m of html.matchAll(/<p\b([^>]*\bclass="og-record-date"[^>]*)>\s*Updated (\d{1,2}) ([A-Za-z]+) (\d{4})/g)) {
    const mo = MONTHS.indexOf(m[3].toLowerCase());
    if (mo < 0) continue;
    out.push({ source: /\bdata-source="([^"]+)"/.exec(m[1])?.[1] ?? null, date: new Date(Date.UTC(Number(m[4]), mo, Number(m[2]))) });
  }
  return out;
}

// Each line judged: by its own source's limit when the source is listed, else by the page's most lenient listed limit,
// else not judged. Returns the lines with { judgedBy, limit, age, stale }.
export function judgeDates(lines, route, sources, now = Date.now()) {
  const pageAges = sources.filter((s) => s.page === route).map((s) => MAX_AGE[s.cadence]);
  const pageLimit = pageAges.length ? Math.max(...pageAges) : null;
  return lines.map((l) => {
    const own = l.source ? sources.filter((s) => `${s.table}.${s.column}` === l.source).map((s) => MAX_AGE[s.cadence]) : [];
    const limit = own.length ? Math.max(...own) : pageLimit;
    const judgedBy = own.length ? 'source' : pageLimit != null ? 'page' : 'none';
    const age = Math.floor((now - l.date.getTime()) / 86400000);
    return { ...l, judgedBy, limit, age, stale: limit != null && age > limit };
  });
}
