import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Ministers' revolving door, post-ACOBA. ACOBA closed on 13 October 2025 and
// its remit for former ministers passed to the Independent Adviser on
// Ministerial Standards, who publishes BARs advice as a single gov.uk HTML
// table (Former minister | Date of advice | Appointment). Each row links to an
// individual advice letter; this route parses the table AND each new letter to
// populate the role description and the designated conditions, mirroring the
// detail the old ACOBA rows carried. Senior civil servants / special advisers
// now go via the Civil Service Commission and are not ingested here yet.

const PAGE_URL =
  'https://www.gov.uk/government/publications/advice-issued-under-the-business-appointment-rules-for-ministers/advice-issued-under-the-business-appointment-rules-for-ministers';

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function strip(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘').replace(/&pound;/g, '£').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ').trim();
}

function parseLetter(html: string): { description: string | null; conditions: string | null } {
  const gi = html.indexOf('govspeak');
  let region = gi === -1 ? html : html.slice(gi, gi + 16000);
  region = region.replace(/\\u003c/gi, '<').replace(/\\u003e/gi, '>').replace(/\\u0026/gi, '&')
    .replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\n/g, ' ').replace(/\\t/g, ' ');
  const cut = region.search(/grateful if you would note the following points/i);
  const condRegion = cut === -1 ? region : region.slice(0, cut);
  let lis = [...condRegion.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1])).filter(Boolean);
  if (cut === -1) lis = lis.filter((c) => /condition/i.test(c));
  const conditions = lis.length ? lis.map((c) => '• ' + c).join('  ') : null;

  const text = strip(region.replace(/<\/p>/g, '  ').replace(/<li>/g, ' '));
  let sm = text.match(/You stated in your application that ([^]*?[.!?])(?:\s|$)/i)
    || text.match(/for my advice on ([^]*?[.!?])(?:\s|$)/i);
  let description = sm ? sm[1].replace(/^(that |you will |being |taking up |take up |a |an )/i, '').trim() : null;
  if (!description) {
    const hm = text.match(/BUSINESS APPOINTMENT APPLICATION:[^–—-]*[–—-]\s*([^.]+)/i);
    if (hm) description = hm[1].trim();
  }
  if (description && description.length > 600) description = description.slice(0, 597) + '…';
  return { description, conditions };
}

type Row = {
  person_name: string; previous_role: string | null; new_role: string | null;
  organisation: null; approval_date: string; conditions: string | null; description: string | null;
  urls: string[];
};

function parseTable(html: string): Row[] {
  const tbody = (html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
  const trs = [...tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const groups = new Map<string, {
    person_name: string; previous_role: string | null; approval_date: string;
    roleSet: Set<string>; urlSet: Set<string>;
  }>();
  for (const tr of trs) {
    const tds = [...tr.matchAll(/<td>([\s\S]*?)<\/td>/g)];
    if (tds.length < 3) continue;
    const who = strip(tds[0][1]);
    const dm = strip(tds[1][1]).toLowerCase().match(/([a-z]+)\s+(\d{4})/);
    if (!dm || !MONTHS[dm[1]]) continue;
    const approval_date = `${dm[2]}-${MONTHS[dm[1]]}-01`;
    const ci = who.indexOf(',');
    const person_name = (ci === -1 ? who : who.slice(0, ci)).replace(/^(The\s+)?(Rt\s+Hon|Right\s+Honourable)\.?\s+/i, '').trim();
    const previous_role = ci === -1 ? null : who.slice(ci + 1).trim();
    const appt = strip(tds[2][1]) || null;
    const url = [...tr.matchAll(/href="([^"]+\/advice[^"]+)"/g)].map((m) => m[1]).pop()
      || [...tr.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).pop();
    const k = `${person_name}|${previous_role}|${approval_date}`;
    if (!groups.has(k)) {
      groups.set(k, { person_name, previous_role, approval_date, roleSet: new Set(), urlSet: new Set() });
    }
    const g = groups.get(k)!;
    if (appt) g.roleSet.add(appt);
    if (url) g.urlSet.add(url);
  }
  return [...groups.values()].map((g) => ({
    person_name: g.person_name, previous_role: g.previous_role,
    new_role: [...g.roleSet].join('; ') || null, organisation: null,
    approval_date: g.approval_date, conditions: null, description: null, urls: [...g.urlSet],
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
    const rows = parseTable(await res.text());

    // Skip any person already present in the same year-month (handover overlap guard).
    const { data: existing } = await supabase.from('revolving_door').select('person_name, approval_date');
    const seen = new Set((existing || []).map((r) => `${r.person_name}|${String(r.approval_date).slice(0, 7)}`));
    const fresh = rows.filter((r) => !seen.has(`${r.person_name}|${r.approval_date.slice(0, 7)}`));

    // Enrich each fresh row from its advice letter(s).
    for (const r of fresh) {
      const descs: string[] = [], conds: string[] = [];
      for (const letterUrl of r.urls) {
        try {
          const lr = await fetch(letterUrl);
          if (!lr.ok) continue;
          const { description, conditions } = parseLetter(await lr.text());
          if (description) descs.push(description);
          if (conditions) conds.push(conditions);
        } catch { /* skip letter */ }
      }
      r.description = [...new Set(descs)].join(' ') || null;
      r.conditions = [...new Set(conds)].join('  ') || null;
    }

    let inserted = 0;
    const payload = fresh.map(({ urls, ...rest }) => rest);
    for (let i = 0; i < payload.length; i += 100) {
      const batch = payload.slice(i, i + 100);
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
