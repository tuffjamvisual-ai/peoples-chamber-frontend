// Daily ParlParse vote sync — keeps mp_division_votes fresh with the ~10×
// coverage parlparse provides over Commons Votes API alone.
//
// Strategy: sliding 30-day window. Re-imports the last 30 days each run,
// using ON CONFLICT (member_id, date_only, division_number) DO NOTHING so
// already-known votes don't double up.
//
// Phase 1 (CVA division_number backfill) is a one-off — runs only if there
// are still CVA-sourced rows with NULL division_number, otherwise skipped.
//
// We don't pull parquets into the function (8MB is heavy for a 300s budget
// when combined with parsing). Instead we use the per-day XML files which
// are small and indexed by date.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const XML_BASE = 'https://www.theyworkforyou.com/pwdata/scrapedxml/divisionsonly';
const PEOPLE_JSON_URL = 'https://raw.githubusercontent.com/mysociety/parlparse/master/members/people.json';

type VoteRow = {
  member_id: number;
  vote_type: 'aye' | 'no' | 'both';
  is_teller: boolean;
  division_date_only: string;       // YYYY-MM-DD
  division_number: number;
  division_date: string;            // YYYY-MM-DDTHH:MM:SS
  division_title: string | null;
  source: 'parlparse';
  division_id: number | null;       // populated from CVA bulk lookup when available
};

// Build a (date_only|Number) -> DivisionId map by paginating the Commons
// Votes API bulk search endpoint. CVA caps `take` at 25 regardless of
// what we request, so we iterate via skip until we hit an empty page.
// Used to attach division_id to parlparse-sourced rows so they render
// the same /bills/, /statutory-instruments/ and external commonsvotes
// deep-links as CVA-sourced rows.
async function buildCvaLookup(fromIso: string, toIso: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let skip = 0;
  const PAGE = 25;
  while (skip < 5000) {
    const url = `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.startDate=${fromIso}&queryParameters.endDate=${toIso}&queryParameters.take=${PAGE}&queryParameters.skip=${skip}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } });
    if (!res.ok) break;
    const rows = await res.json() as Array<{ DivisionId?: number; Number?: number; Date?: string }>;
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      const dateOnly = (r.Date || '').slice(0, 10);
      if (!dateOnly || r.Number == null || r.DivisionId == null) continue;
      out.set(`${dateOnly}|${r.Number}`, r.DivisionId);
    }
    if (rows.length < PAGE) break;
    skip += PAGE;
  }
  return out;
}

// publicwhip person_id → datadotparl_id (= our member_id)
async function fetchCrosswalk(): Promise<Map<string, number>> {
  const res = await fetch(PEOPLE_JSON_URL, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`people.json HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map<string, number>();
  for (const p of data.persons || []) {
    for (const ident of p.identifiers || []) {
      if (ident.scheme === 'datadotparl_id') {
        map.set(p.id, parseInt(ident.identifier, 10));
        break;
      }
    }
  }
  return map;
}

// List XML files between fromIso and toIso (inclusive).
async function listDailyXmls(fromIso: string, toIso: string): Promise<string[]> {
  const res = await fetch(`${XML_BASE}/`, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`xml index HTTP ${res.status}`);
  const html = await res.text();
  const all = Array.from(html.matchAll(/href="(divisions(\d{4}-\d{2}-\d{2})[a-z]?\.xml)"/g))
    .map(m => ({ fn: m[1], date: m[2] }));
  return all.filter(r => r.date >= fromIso && r.date <= toIso).map(r => r.fn);
}

async function fetchXml(fn: string): Promise<string> {
  const res = await fetch(`${XML_BASE}/${fn}`, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`${fn} HTTP ${res.status}`);
  return res.text();
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

// Parse a divisionsYYYY-MM-DDx.xml — extract vote rows.
function parseXmlDay(xml: string, crosswalk: Map<string, number>, cvaLookup: Map<string, number>): VoteRow[] {
  const out: VoteRow[] = [];
  // Each <division> block: id, divnumber, divdate, time, title? (varies)
  // Children: <divisioncount ayes noes/>, <mplist vote="aye|no"><mpname person_id="..." vote="..." />...
  const blocks = Array.from(xml.matchAll(/<division\b([^>]*)>([\s\S]*?)<\/division>/g));
  for (const blk of blocks) {
    const attrs = blk[1];
    const inner = blk[2];

    const numM = /divnumber="(\d+)"/.exec(attrs);
    const dateM = /divdate="(\d{4}-\d{2}-\d{2})"/.exec(attrs);
    const timeM = /time="([\d:]+)"/.exec(attrs);
    if (!numM || !dateM) continue;
    const division_number = parseInt(numM[1], 10);
    const division_date_only = dateM[1];
    const division_date = `${division_date_only}T${timeM ? timeM[1] : '00:00:00'}`;

    // Title is set by the surrounding minor-heading in the XML, not the
    // division element itself. Walking back to find it adds latency for
    // little gain — leaving title null; the parquet-backed backfill has
    // titles, and the cron's job is keeping votes current, not enriching.
    const division_title = null;

    const mpnames = Array.from(inner.matchAll(/<mpname\b([^>]*)>([^<]*)<\/mpname>/g));
    for (const mp of mpnames) {
      const a = mp[1];
      const pidM = /person_id="uk\.org\.publicwhip\/person\/(\d+)"/.exec(a);
      const voteM = /vote="(aye|no|tellaye|tellno|both)"/.exec(a);
      if (!pidM || !voteM) continue;
      const memberId = crosswalk.get(`uk.org.publicwhip/person/${pidM[1]}`);
      if (memberId == null) continue;
      const v = voteM[1];
      const is_teller = v === 'tellaye' || v === 'tellno';
      const vote_type: 'aye' | 'no' | 'both' =
        (v === 'aye' || v === 'tellaye') ? 'aye'
        : (v === 'no'  || v === 'tellno')  ? 'no'
        : 'both';
      out.push({
        member_id: memberId,
        vote_type,
        is_teller,
        division_date_only,
        division_number,
        division_date,
        division_title,
        source: 'parlparse',
        division_id: cvaLookup.get(`${division_date_only}|${division_number}`) ?? null,
      });
    }
  }
  return out;
}

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
  const TIME_BUDGET_MS = 260_000;

  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDate.toISOString().slice(0, 10);

  const crosswalk = await fetchCrosswalk();
  const cvaLookup = await buildCvaLookup(fromIso, toIso);
  const xmlFiles = await listDailyXmls(fromIso, toIso);

  let scannedFiles = 0;
  let insertedRows = 0;
  let parsedVotes = 0;
  let timedOut = false;

  for (const fn of xmlFiles) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) { timedOut = true; break; }
    let xml: string;
    try { xml = await fetchXml(fn); } catch { continue; }
    scannedFiles++;
    const rows = parseXmlDay(decodeXmlEntities(xml), crosswalk, cvaLookup);
    if (rows.length === 0) continue;
    parsedVotes += rows.length;

    // Insert in chunks via supabase-js. ON CONFLICT enforced by the partial
    // unique index (member_id, date_only, number); supabase-js's .upsert
    // handles this when we pass onConflict.
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error, count } = await supabase
        .from('mp_division_votes')
        .upsert(slice, {
          onConflict: 'member_id,division_date_only,division_number',
          ignoreDuplicates: true,
          count: 'exact',
        });
      if (error) {
        console.error(`upsert error in ${fn}: ${error.message}`);
        continue;
      }
      insertedRows += count ?? slice.length;
    }
  }

  return NextResponse.json({
    ok: true,
    window: { from: fromIso, to: toIso },
    cva_lookup_size: cvaLookup.size,
    xml_files_listed: xmlFiles.length,
    xml_files_scanned: scannedFiles,
    parsed_votes: parsedVotes,
    inserted_rows: insertedRows,
    timed_out: timedOut,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}
