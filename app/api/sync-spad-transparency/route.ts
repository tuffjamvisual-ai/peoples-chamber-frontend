// Special Advisers transparency sync.
//
// Walks gov.uk Content API search for the latest quarterly SpAd
// transparency publications across every publishing department,
// fetches each CSV attachment, parses gifts / hospitality / media
// meetings into three dedicated tables, and rebuilds the
// special_advisers roster from the union of names in those CSVs.
//
// Current-quarter-only by design. Every successful run TRUNCATES
// the four tables before writing. We deliberately do not keep an
// archive. The next time a fresh quarter publishes, this run
// replaces the last one. The site always shows "this is the most
// recent published quarter".
//
// Schedule: weekly Monday 14:45 UTC (vercel.json).
//
// Notes on the CSV shape: every department publishes three files
// per quarter (gifts / hospitality / media). Columns vary slightly
// between departments and stream types so we parse defensively:
// pick fields by header name with fallbacks. Rows where every
// value is 'Nil Return' are dropped from activity tables but the
// SpAd's name is still added to the roster.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

const UA = 'PeoplesChamber/1.0 (https://www.thepeopleschamber.uk; transparency sync)';
const SEARCH = 'https://www.gov.uk/api/search.json';
const CONTENT = 'https://www.gov.uk/api/content';

type SearchResult = {
  title: string;
  link: string;
  public_timestamp: string;
  organisations?: Array<{ slug?: string; title?: string }>;
};

type Attachment = { title: string; url: string };

// ---- CSV ---------------------------------------------------------------

// Mini CSV parser that handles quoted fields with embedded commas,
// doubled quotes and CRLF or LF line endings. Enough for the
// well-formed gov.uk transparency CSVs.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuote = false; }
      else { cell += c; }
    } else {
      if (c === '"') { inQuote = true; }
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r') { /* swallow */ }
      else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v && v.trim().length > 0));
}

// header -> index lookup tolerant of capitalisation/whitespace
function headerIndex(headers: string[], wanted: RegExp): number {
  for (let i = 0; i < headers.length; i++) {
    if (wanted.test((headers[i] || '').toLowerCase())) return i;
  }
  return -1;
}

function isNilReturn(row: string[]): boolean {
  // Skip the name (col 0); a row is a Nil Return if every OTHER cell
  // matches the gov.uk convention.
  const tail = row.slice(1);
  return tail.length > 0 && tail.every((v) => /^nil\s*return$/i.test((v || '').trim()));
}

// ---- area mapping ------------------------------------------------------

// Each publication titles tells us which "publishing area" / department.
// We collapse the title prefix to a short readable area name.
function areaFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.startsWith('no10') || t.includes('no 10')) return 'No 10';
  if (t.startsWith('cabinet office')) return 'Cabinet Office';
  if (t.includes('leader of the house of commons')) return 'Commons Leader & Whips';
  if (t.includes('leader of the house of lords')) return 'Lords Leader & Whips';
  if (t.startsWith('hm treasury')) return 'HM Treasury';
  if (t.startsWith('fcdo')) return 'Foreign Office';
  if (t.startsWith('dhsc')) return 'DHSC';
  if (t.startsWith('dfe')) return 'DfE';
  if (t.startsWith('dwp')) return 'DWP';
  if (t.startsWith('dsit')) return 'DBT'; // DSIT abolished Jul 2026, folded into Business
  if (t.startsWith('dft')) return 'DfT';
  if (t.startsWith('defra')) return 'Defra';
  if (t.startsWith('desnz')) return 'DESNZ';
  if (t.startsWith('moj')) return 'MoJ';
  if (t.startsWith('dbt')) return 'DBT';
  if (t.startsWith('nio')) return 'NIO';
  if (t.startsWith('home office')) return 'Home Office';
  if (t.startsWith('mod')) return 'MoD';
  if (t.startsWith('dcms')) return 'DCMS';
  if (t.startsWith('mhclg')) return 'MHCLG';
  if (t.startsWith('scotland office')) return 'Scotland Office';
  if (t.startsWith('wales office')) return 'Wales Office';
  return title.split(':')[0].split('—')[0].trim();
}

// "October to December 2025" → identifies the quarter. We trust the
// publication titles for this; the gov.uk style is consistent.
function quarterFromTitle(title: string): string | null {
  const m = title.match(/((?:January|April|July|October))\s+to\s+(?:March|June|September|December)\s+\d{4}/i);
  return m ? m[0] : null;
}

function streamFromTitle(t: string): 'gifts' | 'hospitality' | 'meetings' | null {
  const s = t.toLowerCase();
  if (s.includes('gift')) return 'gifts';
  if (s.includes('hospitality') || s.includes('travel')) return 'hospitality';
  if (s.includes('meeting') || s.includes('senior media')) return 'meetings';
  return null;
}

// ---- main --------------------------------------------------------------

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const startedAt = Date.now();

  // 1. Discover the latest quarter via a phrase-locked search.
  // Searching for "special advisers' gifts" matches only the actual
  // transparency publications (not ACOBA advice, annual reports, etc).
  // We take the most recent one and read the quarter off its title.
  const discoverRes = await fetch(`${SEARCH}?q=%22special+advisers%22+%22gifts%22&order=-public_timestamp&count=30`, { headers: { 'User-Agent': UA } })
    .then((r) => r.json() as Promise<{ results: SearchResult[] }>);
  let latestQuarter: string | null = null;
  for (const r of discoverRes.results || []) {
    const q = quarterFromTitle(r.title);
    if (q && streamFromTitle(r.title)) { latestQuarter = q; break; }
  }
  if (!latestQuarter) {
    return NextResponse.json({ error: 'no quarter detected' }, { status: 500 });
  }

  // 2. Phrase-locked search for every departmental SpAd transparency
  // publication for the identified quarter. We search for the quarter
  // string itself plus "special advisers"; that returns the ~13
  // departmental publications per quarter.
  const quarterQ = encodeURIComponent(`"${latestQuarter}" "special advisers"`);
  const quarterRes = await fetch(`${SEARCH}?q=${quarterQ}&count=50`, { headers: { 'User-Agent': UA } })
    .then((r) => r.json() as Promise<{ results: SearchResult[] }>);
  const pubs = (quarterRes.results || []).filter((r) => {
    return r.title.includes(latestQuarter)
      && /special\s+advisers?/i.test(r.title)
      && /(gifts|hospitality|meetings|travel|senior\s+media)/i.test(r.title);
  });

  // 3. For each publication, fetch its content_api JSON for the
  //    attachments list, then download each CSV.
  type ParsedRow = Record<string, string>;
  const gifts: Array<ParsedRow & { area: string; quarter: string; source_pub_slug: string }> = [];
  const hosps: Array<ParsedRow & { area: string; quarter: string; source_pub_slug: string }> = [];
  const meets: Array<ParsedRow & { area: string; quarter: string; source_pub_slug: string }> = [];
  const rosterSet = new Set<string>();   // key = `${name}|${area}`
  const errors: string[] = [];

  for (const pub of pubs) {
    if (Date.now() - startedAt > 180_000) { errors.push('time budget exhausted'); break; }
    try {
      const contentRes = await fetch(`${CONTENT}${pub.link}`, { headers: { 'User-Agent': UA } });
      if (!contentRes.ok) { errors.push(`content api ${pub.link} ${contentRes.status}`); continue; }
      const content = await contentRes.json() as { details?: { attachments?: Attachment[] } };
      const atts = content.details?.attachments || [];
      for (const a of atts) {
        const stream = streamFromTitle(a.title);
        if (!stream) continue;
        const area = areaFromTitle(a.title);
        const csvRes = await fetch(a.url, { headers: { 'User-Agent': UA } });
        if (!csvRes.ok) { errors.push(`csv ${a.url} ${csvRes.status}`); continue; }
        const csv = await csvRes.text();
        const rows = parseCsv(csv);
        if (rows.length < 2) continue;
        const header = rows[0].map((h) => (h || '').toLowerCase().trim());

        const nameCol = headerIndex(header, /(special\s+advisers?|adviser\s+name|name)/);
        if (nameCol < 0) continue;

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const name = (row[nameCol] || '').trim();
          if (!name || name === 'name') continue;
          rosterSet.add(`${name}|${area}`);
          if (isNilReturn(row)) continue;

          if (stream === 'gifts') {
            gifts.push({
              spad_name: name,
              area,
              gift_date: row[headerIndex(header, /date/)] || '',
              gift_descr: row[headerIndex(header, /(gift|item|description)/)] || '',
              donor: row[headerIndex(header, /(from|donor|source)/)] || '',
              value_gbp: row[headerIndex(header, /value/)] || '',
              outcome: row[headerIndex(header, /outcome/)] || '',
              quarter: latestQuarter,
              source_pub_slug: pub.link,
            } as ParsedRow & { area: string; quarter: string; source_pub_slug: string });
          } else if (stream === 'hospitality') {
            hosps.push({
              spad_name: name,
              area,
              hosp_date: row[headerIndex(header, /date/)] || '',
              hosp_descr: row[headerIndex(header, /(hospitality|description|type)/)] || '',
              provider: row[headerIndex(header, /(from|provider|host|source)/)] || '',
              purpose: row[headerIndex(header, /purpose/)] || '',
              quarter: latestQuarter,
              source_pub_slug: pub.link,
            } as ParsedRow & { area: string; quarter: string; source_pub_slug: string });
          } else if (stream === 'meetings') {
            meets.push({
              spad_name: name,
              area,
              meeting_date: row[headerIndex(header, /date/)] || '',
              media_org: row[headerIndex(header, /(organisation|outlet|media)/)] || '',
              individual: row[headerIndex(header, /(name\s+of\s+individual|individual|figure)/)] || '',
              purpose: row[headerIndex(header, /purpose/)] || '',
              quarter: latestQuarter,
              source_pub_slug: pub.link,
            } as ParsedRow & { area: string; quarter: string; source_pub_slug: string });
          }
        }
      }
    } catch (e) {
      errors.push(`${pub.link}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 4. Replace tables atomically (truncate-then-insert; no archive).
  // Truncate via .delete() with neq trick — service role bypasses RLS.
  await supabase.from('spad_gifts').delete().neq('id', -1);
  await supabase.from('spad_hospitality').delete().neq('id', -1);
  await supabase.from('spad_media_meetings').delete().neq('id', -1);
  await supabase.from('special_advisers').delete().neq('id', -1);

  // Insert in batches of 500
  async function batchInsert(table: string, rows: unknown[]) {
    let written = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const slice = rows.slice(i, i + 500);
      const { error } = await supabase.from(table).insert(slice);
      if (error) { errors.push(`insert ${table}: ${error.message}`); break; }
      written += slice.length;
    }
    return written;
  }
  const rosterRows = Array.from(rosterSet).map((k) => {
    const [name, area] = k.split('|');
    return { name, area, quarter: latestQuarter };
  });
  const rosterWritten = await batchInsert('special_advisers', rosterRows);
  const giftsWritten = await batchInsert('spad_gifts', gifts);
  const hospsWritten = await batchInsert('spad_hospitality', hosps);
  const meetsWritten = await batchInsert('spad_media_meetings', meets);

  return NextResponse.json({
    ok: errors.length === 0,
    quarter: latestQuarter,
    publications_seen: pubs.length,
    roster: rosterWritten,
    gifts: giftsWritten,
    hospitality: hospsWritten,
    media_meetings: meetsWritten,
    elapsed_ms: Date.now() - startedAt,
    errors: errors.slice(0, 10),
  });
}
