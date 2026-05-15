import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Mirrors scripts/sync-revolving-door.js. See the JSDoc there for the
// ACOBA title-parsing rationale.

const DELAY_MS = 200;
const FROM_DATE = '2024-07-04';
const SEARCH_URL = 'https://www.gov.uk/api/search.json';
const ACOBA = 'advisory-committee-on-business-appointments';
const PAGE_SIZE = 100;

const DASH_SPLIT = /\s*[–—-]\s*/;
const ACOBA_TAIL = /(?:^|\s)acoba\s+(?:advice|correspondence)(?:\s+and\s+correspondence)?\.?$/i;
const ORG_LEAD = /^(the\b|Department\b|Ministry\b|Office\b|Cabinet\b|Foreign\b|HM\b|His Majesty\b|Her Majesty\b|Home\b|Treasury\b|Crown\b|National\b|Government\b)/i;
const AT_SPLIT = /^(.*?)\s+at\s+((?:the|Department|Ministry|Office|Cabinet|Foreign|HM|His Majesty|Her Majesty|Home|Treasury|Crown|National|Government)\b.+)$/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normaliseName(seg: string | null | undefined): string | null {
  if (!seg) return null;
  const s = seg.replace(/\s+/g, ' ').trim();
  const comma = s.match(/^([^,]+),\s*(.+)$/);
  if (comma) return `${comma[2].trim()} ${comma[1].trim()}`;
  return s;
}

function splitRoleAndOrg(joined: string): { previous_role: string | null; organisation: string | null } {
  const t = String(joined || '').trim();
  if (!t) return { previous_role: null, organisation: null };
  const atMatch = t.match(AT_SPLIT);
  if (atMatch) return { previous_role: atMatch[1].trim(), organisation: atMatch[2].trim() };
  const segs = t.split(',').map((s) => s.trim()).filter(Boolean);
  if (segs.length < 2) return { previous_role: t, organisation: null };
  for (let i = 1; i < segs.length; i++) {
    if (ORG_LEAD.test(segs[i])) {
      return {
        previous_role: segs.slice(0, i).join(', '),
        organisation: segs.slice(i).join(', '),
      };
    }
  }
  return { previous_role: t, organisation: null };
}

function parseTitle(title: string) {
  const t = String(title || '').trim();
  if (!t) return null;
  if (!ACOBA_TAIL.test(t)) return null;
  const parts = t.split(DASH_SPLIT).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  if (ACOBA_TAIL.test(last)) parts.pop();
  if (parts.length < 1) return null;
  const person_name = normaliseName(parts.shift());
  if (!person_name) return null;
  const joined = parts.join(' - ').trim();
  const { previous_role, organisation } = splitRoleAndOrg(joined);
  return { person_name, previous_role: previous_role || null, organisation: organisation || null };
}

type Row = {
  person_name: string;
  previous_role: string | null;
  new_role: null;
  organisation: string | null;
  approval_date: string | null;
  conditions: null;
};

async function fetchAll(): Promise<Row[]> {
  const out: Row[] = [];
  let start = 0;
  while (true) {
    const url = `${SEARCH_URL}?filter_organisations=${ACOBA}&count=${PAGE_SIZE}&start=${start}&order=-public_timestamp`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = (await res.json()) as { results?: Array<{ title: string; public_timestamp?: string }>; total?: number };
    const results = data.results || [];
    if (results.length === 0) break;
    for (const r of results) {
      const pubDate = r.public_timestamp ? r.public_timestamp.slice(0, 10) : null;
      if (pubDate && pubDate < FROM_DATE) continue;
      const parsed = parseTitle(r.title);
      if (!parsed) continue;
      out.push({
        person_name: parsed.person_name,
        previous_role: parsed.previous_role,
        new_role: null,
        organisation: parsed.organisation,
        approval_date: pubDate,
        conditions: null,
      });
    }
    start += results.length;
    if (start >= (data.total || 0)) break;
    await sleep(DELAY_MS);
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
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  try {
    const rows = await fetchAll();
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from('revolving_door')
        .upsert(batch, { onConflict: 'person_name,previous_role,approval_date', ignoreDuplicates: true });
      if (!error) inserted += batch.length;
      await sleep(DELAY_MS);
    }
    return NextResponse.json({
      ok: true,
      parsed: rows.length,
      inserted,
      dateRange:
        rows.length > 0
          ? {
              from: [...rows].map((r) => r.approval_date).filter(Boolean).sort()[0],
              to: [...rows].map((r) => r.approval_date).filter(Boolean).sort().reverse()[0],
            }
          : null,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
