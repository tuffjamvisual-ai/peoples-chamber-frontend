// Special Advisers transparency sync.
//
// Walks gov.uk Content API search for the latest quarterly SpAd
// transparency publications across every publishing department,
// fetches each CSV attachment, parses gifts / hospitality / media
// meetings into three dedicated tables, and adds the quarter's
// special_advisers roster from the union of names in those CSVs.
//
// Keeps every quarter (owner, 28 Oct 2026; before then each run emptied the four tables). A run upserts the latest
// quarter: declarations by row_key (lib/spad-row-key.ts), the roster by (name, area, quarter). Within that quarter, a
// row that a department's file no longer holds is removed, but only for the areas and streams this run read; other
// quarters are never touched.
//
// Schedule: weekly Monday 15:03 UTC (vercel.json).
//
// Notes on the CSV shape: every department publishes three files
// per quarter (gifts / hospitality / media). Columns vary slightly
// between departments and stream types so we parse defensively:
// pick fields by header name with fallbacks. Rows where every
// value is 'Nil Return' are dropped from activity tables but the
// SpAd's name is still added to the roster.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { politeFetch, DOWNLOAD_TIMEOUT_MS, isPoliteStop } from '@/lib/sync-budget';
import { withRowKeys } from '@/lib/spad-row-key';
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

// A row is a nil return when, apart from the adviser's name, it holds only "nil return" style
// entries (including typos such as "Nil Retrun"), blanks or dates. Fixed 15 Oct 2026: the old
// test assumed the name was in the first column and that every other cell said exactly
// "Nil return", so most nil returns were saved as declarations (18 of 20 "gifts" were nil).
const NIL_CELL = /^(nil(\s*re?t[a-z]*)?|n\/?a|none|-+)$/i;
const DATE_CELL = /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|[a-z]{3,9}\s+\d{4}|\d{1,2}\s+[a-z]{3,9}\s+\d{4})$/i;
function isNilReturn(row: string[], nameCol: number): boolean {
  const cells = row.filter((_, i) => i !== nameCol).map((v) => (v || '').trim()).filter(Boolean);
  if (!cells.some((v) => NIL_CELL.test(v))) return false;
  return cells.every((v) => NIL_CELL.test(v) || DATE_CELL.test(v));
}

// One roster entry per adviser per area, even when files spell the name differently
// ("Rebecca Hughes" / "Rebecca Mary Hughes"): keyed on first and last name.
function rosterKey(name: string, area: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  return `${area}|${parts[0] || ''}|${parts[parts.length - 1] || ''}`;
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
  // UK Export Finance is part of the Department for Business and Trade; its returns list the
  // same DBT advisers, so they belong under DBT rather than as separate "UKEF" groups.
  if (t.startsWith('ukef') || t.includes('uk export finance')) return 'DBT';
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

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const startedAt = Date.now();

  // 1. Discover the latest quarter via a phrase-locked search.
  // Searching for "special advisers' gifts" matches only the actual
  // transparency publications (not ACOBA advice, annual reports, etc).
  // We take the most recent one and read the quarter off its title.
  const discoverRes = await politeFetch(`${SEARCH}?q=%22special+advisers%22+%22gifts%22&order=-public_timestamp&count=30`, { headers: { 'User-Agent': UA } })
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
  const quarterRes = await politeFetch(`${SEARCH}?q=${quarterQ}&count=50`, { headers: { 'User-Agent': UA } })
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
  const rosterNames = new Map<string, string>(); // rosterKey -> first spelling seen
  const errors: string[] = [];
  const readAreas = { gifts: new Set<string>(), hospitality: new Set<string>(), meetings: new Set<string>() };

  for (const pub of pubs) {
    if (Date.now() - startedAt > 180_000) { errors.push('time budget exhausted'); break; }
    try {
      const contentRes = await politeFetch(`${CONTENT}${pub.link}`, { headers: { 'User-Agent': UA } });
      if (!contentRes.ok) { errors.push(`content api ${pub.link} ${contentRes.status}`); continue; }
      const content = await contentRes.json() as { details?: { attachments?: Attachment[] } };
      const atts = content.details?.attachments || [];
      for (const a of atts) {
        const stream = streamFromTitle(a.title);
        if (!stream) continue;
        const area = areaFromTitle(a.title);
        const csvRes = await politeFetch(a.url, { headers: { 'User-Agent': UA } }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
        if (!csvRes.ok) { errors.push(`csv ${a.url} ${csvRes.status}`); continue; }
        const csv = await csvRes.text();
        const rows = parseCsv(csv);
        if (rows.length < 2) continue;
        const header = rows[0].map((h) => (h || '').toLowerCase().trim());

        const nameCol = headerIndex(header, /(special\s+advisers?|adviser\s+name|name)/);
        if (nameCol < 0) continue;
        readAreas[stream].add(area);

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const name = (row[nameCol] || '').trim();
          if (!name || name === 'name') continue;
          const rk = rosterKey(name, area);
          if (!rosterNames.has(rk)) { rosterNames.set(rk, name); rosterSet.add(`${name}|${area}`); }
          if (isNilReturn(row, nameCol)) continue;

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
      if (isPoliteStop(e)) throw e; // a 429 or the time budget: stop cleanly (lib/sync-budget.ts)
      errors.push(`${pub.link}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Safety: if this run read far fewer advisers for the quarter than are saved for it (publications failed to
  // download, or a time out), change nothing.
  const { count: savedRoster } = await supabase.from('special_advisers').select('id', { count: 'exact', head: true }).eq('quarter', latestQuarter);
  if (savedRoster && rosterSet.size < savedRoster * 0.6) {
    return NextResponse.json({ ok: false, error: `only ${rosterSet.size} advisers read against ${savedRoster} saved for ${latestQuarter}; nothing changed`, errors: errors.slice(0, 10) }, { status: 502 });
  }

  // 4. Upsert the quarter; other quarters stay as they are.
  async function upsert(table: string, rows: unknown[], onConflict: string, ignoreDuplicates: boolean) {
    let written = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const slice = rows.slice(i, i + 500);
      const { error } = await supabase.from(table).upsert(slice, { onConflict, ignoreDuplicates });
      if (error) throw new Error(`upsert ${table}: ${error.message}`);
      written += slice.length;
    }
    return written;
  }
  // Rows of this quarter, in the areas this run read, that the files no longer hold.
  async function removeStale(table: string, areas: Set<string>, keep: Set<string>, keyCol: 'row_key' | 'name') {
    if (!areas.size) return 0;
    const { data, error } = await supabase.from(table).select(`id, area, ${keyCol}`).eq('quarter', latestQuarter).in('area', [...areas]);
    if (error) throw new Error(`read ${table}: ${error.message}`);
    const stale = ((data ?? []) as unknown as Record<string, string | number>[])
      .filter((r) => !keep.has(keyCol === 'name' ? `${r.name}|${r.area}` : String(r.row_key))).map((r) => r.id as number);
    for (let i = 0; i < stale.length; i += 200) {
      const { error: delError } = await supabase.from(table).delete().in('id', stale.slice(i, i + 200));
      if (delError) throw new Error(`remove ${table}: ${delError.message}`);
    }
    return stale.length;
  }
  const rosterRows = Array.from(rosterSet).map((k) => {
    const [name, area] = k.split('|');
    return { name, area, quarter: latestQuarter, updated_at: new Date().toISOString() };
  });
  const giftRows = withRowKeys(gifts, ['quarter', 'area', 'spad_name', 'gift_date', 'gift_descr', 'donor', 'value_gbp', 'outcome']);
  const hospRows = withRowKeys(hosps, ['quarter', 'area', 'spad_name', 'hosp_date', 'hosp_descr', 'provider', 'purpose']);
  const meetRows = withRowKeys(meets, ['quarter', 'area', 'spad_name', 'meeting_date', 'media_org', 'individual', 'purpose']);
  const rosterWritten = await upsert('special_advisers', rosterRows, 'name,area,quarter', false);
  const giftsWritten = await upsert('spad_gifts', giftRows, 'row_key', true);
  const hospsWritten = await upsert('spad_hospitality', hospRows, 'row_key', true);
  const meetsWritten = await upsert('spad_media_meetings', meetRows, 'row_key', true);
  const allRead = new Set([...readAreas.gifts, ...readAreas.hospitality, ...readAreas.meetings]);
  const removed = {
    roster: await removeStale('special_advisers', allRead, rosterSet, 'name'),
    gifts: await removeStale('spad_gifts', readAreas.gifts, new Set(giftRows.map((r) => r.row_key)), 'row_key'),
    hospitality: await removeStale('spad_hospitality', readAreas.hospitality, new Set(hospRows.map((r) => r.row_key)), 'row_key'),
    media_meetings: await removeStale('spad_media_meetings', readAreas.meetings, new Set(meetRows.map((r) => r.row_key)), 'row_key'),
  };

  return NextResponse.json({
    ok: errors.length === 0,
    quarter: latestQuarter,
    publications_seen: pubs.length,
    roster: rosterWritten,
    gifts: giftsWritten,
    hospitality: hospsWritten,
    media_meetings: meetsWritten,
    removed_from_quarter: removed,
    elapsed_ms: Date.now() - startedAt,
    errors: errors.slice(0, 10),
  });
}

export const GET = withHeartbeat('/api/sync-spad-transparency', GET_impl);
