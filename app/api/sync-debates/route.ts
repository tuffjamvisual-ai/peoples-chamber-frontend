import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: pull recent Commons debate metadata from the Hansard API into the
// `debates` table. Metadata only (title, sitting date, section, ext id) — the
// full transcript is fetched live and rendered in-house on /debates/[guid].
// Looks back DAYS days each run so newly-published sittings are picked up and
// any re-titled sections are corrected. Idempotent via ON CONFLICT upsert.

const API = 'https://hansard-api.parliament.uk/search/debates.json';
const DETAIL = 'https://hansard-api.parliament.uk/debates/debate';
const PARL_START = '2024-07-04';
const DAYS = 21;
const TAKE = 100;
const ENRICH_CONCURRENCY = 8;

const SKIP = /^(deferred division|division|prayers|royal assent|petitions?|the petition of)\s*$/i;
const SKIP_SUMMARY = /^(motion made|question (put|proposed|agreed)|resolved|ordered|that this house do now adjourn|the house (divided|proceeded)|i beg to move,?\s*that this house do now adjourn)/i;

function sectionLabel(s: string): string {
  const t = (s || '').trim();
  if (/westminster hall/i.test(t)) return 'Westminster Hall';
  if (/committee/i.test(t)) return 'General Committees';
  if (/written statement/i.test(t)) return 'Written Statements';
  return 'Commons Chamber';
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const plain = (h: string) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();

interface DItem { ItemType?: string; Value?: string | null }
interface DNode { Items?: DItem[]; ChildDebates?: DNode[] }
function walk(node: DNode, items: DItem[], divs: DItem[]) {
  for (const it of node.Items || []) {
    if (it.ItemType === 'Contribution') items.push(it);
    else if (it.ItemType === 'Division' && it.Value) divs.push(it);
  }
  for (const c of node.ChildDebates || []) walk(c, items, divs);
}
function firstSentence(s: string, max: number): string {
  const m = s.match(/^[\s\S]*?[.?!](\s|$)/);
  let out = (m ? m[0] : s).trim();
  if (out.length > max) out = out.slice(0, max - 1).trim() + '…';
  return out;
}
function summaryFrom(items: DItem[]): string | null {
  const texts = items.map((i) => plain(i.Value || '')).filter(Boolean);
  for (const t of texts.slice(0, 40)) {
    const m = t.match(/That (?:this House|the House|the Committee|the Grand Committee) has considered\b[\s\S]*?(?=\.\s|\.$)/i);
    if (m && m[0].length > 30) return firstSentence(m[0].trim() + '.', 200);
  }
  for (const t of texts) if (t.length > 20 && !SKIP_SUMMARY.test(t)) return firstSentence(t, 200);
  return null;
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const end = new Date().toISOString().slice(0, 10);
  const startMs = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  let start = new Date(startMs).toISOString().slice(0, 10);
  if (start < PARL_START) start = PARL_START;

  const rows = new Map<string, { hansard_ext_id: string; title: string; sitting_date: string; section: string; house: string; summary?: string | null; division_ids?: string[] }>();
  let skip = 0;
  for (let page = 0; page < 100; page++) {
    let j;
    try {
      j = await fetchJson(`${API}?queryParameters.house=Commons&queryParameters.startDate=${start}&queryParameters.endDate=${end}&queryParameters.take=${TAKE}&queryParameters.skip=${skip}`);
    } catch { break; }
    const R = j.Results || [];
    if (R.length === 0) break;
    for (const r of R) {
      const extId = r.DebateSectionExtId;
      if (!extId) continue;
      const title = (r.Title || r.DebateSection || '').trim();
      if (!title || SKIP.test(title)) continue;
      const date = (r.SittingDate || '').slice(0, 10);
      if (!date || date < PARL_START) continue;
      rows.set(extId, {
        hansard_ext_id: extId,
        title,
        sitting_date: date,
        section: sectionLabel(r.DebateSection || r.House),
        house: 'Commons',
      });
    }
    skip += TAKE;
    if (R.length < TAKE) break;
  }

  const payload = [...rows.values()];

  // Enrich the window's debates with a scannable summary and exact division
  // slugs (from the in-transcript division numbers, validated against our own
  // divisions so a "Vote held" badge never 404s).
  const { data: vdivs } = await supabase
    .from('commons_divisions_titled')
    .select('division_date_only, division_number')
    .gte('division_date_only', start);
  const validDiv = new Set((vdivs || []).map((d) => `${d.division_date_only}#${d.division_number}`));

  let di = 0;
  async function enrichWorker() {
    while (di < payload.length) {
      const d = payload[di++];
      let j;
      try { j = await fetchJson(`${DETAIL}/${d.hansard_ext_id}.json`); } catch { continue; }
      if (!j || !j.Overview) continue;
      const items: DItem[] = [], divs: DItem[] = [];
      walk(j, items, divs);
      d.summary = summaryFrom(items);
      const slugs: string[] = [];
      for (const dv of divs) {
        const num = parseInt(String(dv.Value).split('|')[0], 10);
        if (Number.isFinite(num) && validDiv.has(`${d.sitting_date}#${num}`)) slugs.push(`pw-${d.sitting_date}-${num}-commons`);
      }
      d.division_ids = [...new Set(slugs)];
    }
  }
  await Promise.all(Array.from({ length: ENRICH_CONCURRENCY }, () => enrichWorker()));

  let upserted = 0;
  for (let i = 0; i < payload.length; i += 500) {
    const chunk = payload.slice(i, i + 500);
    const { error } = await supabase.from('debates').upsert(chunk, { onConflict: 'hansard_ext_id' });
    if (!error) upserted += chunk.length;
  }

  return NextResponse.json({ ok: true, window: { start, end }, scanned: skip, collected: payload.length, upserted });
}
