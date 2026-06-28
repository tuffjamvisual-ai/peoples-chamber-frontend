import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Ministers' revolving door, post-ACOBA. ACOBA closed on 13 October 2025 and
// its remit for former ministers passed to the Independent Adviser on
// Ministerial Standards, who publishes BARs advice as a single gov.uk HTML
// table (Former minister | Date of advice | Appointment). This route parses
// that table into the same revolving_door table the old ACOBA sync fed.
// Senior civil servants / special advisers now go via the Civil Service
// Commission, whose decisions live on per-person JS subpages and are not
// ingested here yet.

const PAGE_URL =
  'https://www.gov.uk/government/publications/advice-issued-under-the-business-appointment-rules-for-ministers/advice-issued-under-the-business-appointment-rules-for-ministers';

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function deent(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&quot;/g, '"')
    .replace(/&pound;/g, '£').replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ').trim();
}

function parseDate(s: string): string | null {
  const m = s.toLowerCase().match(/([a-z]+)\s+(\d{4})/);
  if (m && MONTHS[m[1]]) return `${m[2]}-${MONTHS[m[1]]}-01`;
  const y = s.match(/\b(20\d{2})\b/);
  return y ? `${y[1]}-01-01` : null;
}

function cleanName(n: string): string {
  return n.replace(/^(The\s+)?(Rt\s+Hon|Right\s+Honourable)\.?\s+/i, '').trim();
}

type Row = { person_name: string; previous_role: string | null; new_role: string | null; organisation: null; approval_date: string; conditions: null };

function parse(html: string): Row[] {
  const tbody = (html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
  const trs = [...tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const out: Array<{ person_name: string; previous_role: string | null; new_role: string | null; approval_date: string }> = [];
  for (const tr of trs) {
    const tds = [...tr.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => deent(m[1]));
    if (tds.length < 3) continue;
    const [who, when, appt] = tds;
    const ci = who.indexOf(',');
    const person_name = cleanName(ci === -1 ? who : who.slice(0, ci));
    const previous_role = ci === -1 ? null : who.slice(ci + 1).trim();
    const approval_date = parseDate(when);
    if (!person_name || !approval_date) continue;
    out.push({ person_name, previous_role, new_role: appt || null, approval_date });
  }
  // Collapse same person+role+month into one row (multiple appointments in a
  // month) so the (person_name, previous_role, approval_date) constraint holds.
  const grouped = new Map<string, { person_name: string; previous_role: string | null; approval_date: string; roles: Set<string> }>();
  for (const r of out) {
    const k = `${r.person_name}|${r.previous_role}|${r.approval_date}`;
    if (!grouped.has(k)) grouped.set(k, { person_name: r.person_name, previous_role: r.previous_role, approval_date: r.approval_date, roles: new Set() });
    if (r.new_role) grouped.get(k)!.roles.add(r.new_role);
  }
  return [...grouped.values()].map((g) => ({
    person_name: g.person_name,
    previous_role: g.previous_role,
    new_role: [...g.roles].join('; ') || null,
    organisation: null,
    approval_date: g.approval_date,
    conditions: null,
  }));
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }
  const supabase = createClient(url, key);

  try {
    const res = await fetch(PAGE_URL);
    if (!res.ok) return NextResponse.json({ ok: false, error: `fetch ${res.status}` }, { status: 502 });
    const rows = parse(await res.text());

    // Skip any row where this person already has an entry in the same
    // year-month (guards the ACOBA -> Independent Adviser handover overlap,
    // where date strings differ and would not collide on the constraint).
    const { data: existing } = await supabase.from('revolving_door').select('person_name, approval_date');
    const seen = new Set((existing || []).map((r) => `${r.person_name}|${String(r.approval_date).slice(0, 7)}`));
    const fresh = rows.filter((r) => !seen.has(`${r.person_name}|${r.approval_date.slice(0, 7)}`));

    let inserted = 0;
    for (let i = 0; i < fresh.length; i += 100) {
      const batch = fresh.slice(i, i + 100);
      const { error } = await supabase
        .from('revolving_door')
        .upsert(batch, { onConflict: 'person_name,previous_role,approval_date', ignoreDuplicates: true });
      if (!error) inserted += batch.length;
    }

    return NextResponse.json({ ok: true, parsed: rows.length, newRows: fresh.length, inserted, syncedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
