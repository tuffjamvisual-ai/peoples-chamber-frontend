// Weekly cron — pulls Committee on Standards published reports from
// committees-api.parliament.uk and upserts into mp_conduct_findings.
//
// Same parsing logic as scripts/sync-standards-committee.js (kept in
// sync; the CLI tool is preserved for ad-hoc enrichment runs and
// development).
//
// Schedule: '0 13 * * 1' (Monday 13:00 UTC) — after the activity-
// metrics cron at 12:00. Light traffic: one API call, ~100 rows.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const COMMITTEE_ID = 290;
const PAGE_SIZE = 300;
const PUB_URL = `https://committees-api.parliament.uk/api/Publications?committeeId=${COMMITTEE_ID}&take=${PAGE_SIZE}`;

// The character class must include both a regular hyphen and an en-dash
// so we match both 'Nth Report - Name' and 'Nth Report – Name' title
// variants that the Standards Committee uses interchangeably. The
// strip-dashes-production.js script replaced the en-dash with a hyphen
// in source the first time it ran; the next time it runs it'll do the
// same again. Adding this comment as the canary for future maintainers
// (and a reminder to skip this file in the script's allow-list if it
// re-runs).
const REPORT_RE = /^(\d+(?:st|nd|rd|th)?|First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth)\s+[Rr]eport\s*[-–]\s*(.+?)$/;
const GENERIC = /^(register of interests|the house of commons standards landscape|members'?\s*staff|influencing code|standards|code of conduct|all[- ]?party parliamentary groups|rules for|precautionary exclusion|risk[- ]based|recall of mps act|house of commons commission|complaints procedure|appeals process|review of|inquiry into|alternatives to|members'? conduct)/i;

function extractMpName(description: string | null): string | null {
  if (!description) return null;
  const m = REPORT_RE.exec(description.trim());
  if (!m) return null;
  let cand = m[2].trim();
  if (GENERIC.test(cand)) return null;
  if (cand.includes(':')) return null;
  if (cand.length > 40) return null;
  return cand
    .replace(/^(Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr)\s+/, '')
    .replace(/\s+(MP|QC|KC|CBE|OBE|MBE)\s*$/, '')
    .trim();
}

type Pub = { id: number; description?: string | null; publicationStartDate?: string | null; type?: { name?: string } };

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

  // 1. Fetch publications
  const res = await fetch(PUB_URL, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } });
  if (!res.ok) return NextResponse.json({ error: `committees-api HTTP ${res.status}` }, { status: 502 });
  const json = await res.json() as { items?: Pub[] };
  const reports = (json.items ?? []).filter((it) => it.type?.name === 'Report');

  type Finding = { publication_id: number; mp_name: string; date: string | null; description: string; url: string };
  const findings: Finding[] = [];
  for (const r of reports) {
    const description = r.description || '';
    const mpName = extractMpName(description);
    if (!mpName) continue;
    findings.push({
      publication_id: r.id,
      mp_name: mpName,
      date: (r.publicationStartDate || '').slice(0, 10) || null,
      description,
      url: `https://committees.parliament.uk/publications/${r.id}/`,
    });
  }

  // 2. Resolve member_id by name match — fetch all current MPs in one shot.
  const { data: mps, error: mpErr } = await supabase
    .from('mps')
    .select('member_id, name, display_name, current_member');
  if (mpErr) return NextResponse.json({ error: mpErr.message }, { status: 500 });
  type MpRow = { member_id: number; name: string | null; display_name: string | null; current_member: boolean | null };
  const candidates: MpRow[] = (mps ?? []) as MpRow[];

  function resolve(name: string): number | null {
    const lower = name.toLowerCase();
    let exact = candidates.find((m) => (m.display_name?.toLowerCase() === lower) || (m.name?.toLowerCase() === lower));
    if (exact) return exact.member_id;
    const fuzzy = candidates.filter((m) =>
      (m.display_name?.toLowerCase().includes(lower)) ||
      (m.name?.toLowerCase().includes(lower)),
    );
    if (fuzzy.length === 1) return fuzzy[0].member_id;
    return null;
  }

  let resolved = 0;
  const rows = findings.map((f) => {
    const member_id = resolve(f.mp_name);
    if (member_id) resolved++;
    return {
      member_id,
      mp_name_at_time: f.mp_name,
      case_ref: `pcs-cmt-${f.publication_id}`,
      closed_date: f.date,
      source: 'standards_committee',
      summary: f.description,
      url: f.url,
      source_published: f.date,
      scraped_at: new Date().toISOString(),
    };
  });

  // 3. Upsert
  const { error: upErr } = await supabase
    .from('mp_conduct_findings')
    .upsert(rows, { onConflict: 'case_ref' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    reports_seen: reports.length,
    findings_extracted: findings.length,
    member_resolved: resolved,
    upserted: rows.length,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}
