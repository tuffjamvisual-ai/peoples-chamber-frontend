import { bearerMatches } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { politeFetch, isPoliteStop, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';
import { refreshTables } from '@/lib/source-tags';
import {
  AE_PAGE, aeNewestCsv, aePercent, RTT_PAGE, rttTimeseriesLink, rttNewest, gpEditionUrl, gpTablesLink, gpValue,
  PRISON_API, PRISON_PAGE, prisonNewestFile, prisonFigures, aeCsvFor, yearEarlierLine, publishedOn,
} from '@/lib/dashboard-sources';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// The four public services figures with a fixed file layout, from their publishers (Cowork ENTRY 230 step 2, owner approved
// 17 Nov 2026): A&E within 4 hours, the RTT waiting list, fully qualified GPs and prison occupancy (lib/dashboard-sources.ts).
// Weekdays at 11:41 UTC, after the 9:30 releases. For each, one request for the publisher's page; the data file is fetched
// only when the page shows a newer period than the one held (prisons: the weekly file is always read, 11 KB). A row is
// written only when a newer period is published: value, period, the release date (the publisher's own: the A&E and GP
// pages state it, the prison briefing is dated; else the day found, as for RTT), the previous value and period,
// the source page, the figure quoted in its note, and the year-earlier line (recent_change, recent_direction) in the
// wording of the hand-loaded lines (Cowork ENTRY 232): the RTT series, the GP tables and the prison briefing carry the
// figure a year earlier; for A&E it is that month's CSV a year before (revised when there is one), one more request.
// Then table:dashboard_indicators is refreshed (A16: /transparency/state-dashboard and the topic pages' figures box
// rebuild only when a figure changes). The other six indicators are loaded by hand; the freshness monitor flags any
// indicator whose next release is overdue (dashboardOverdue).
// ?dry=1 reads everything and writes nothing.

const UA = 'opengovt/1.0 (+https://opengovt.uk; contact@opengovt.uk)';
const GAP_MS = 2_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const fyStartOf = (period: string) => { const [y, m] = period.split('-').map(Number); return m >= 4 ? y : y - 1; };
const nextMonth = (period: string) => { const [y, m] = period.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (period: string) => { const [y, m] = period.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
const dayName = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

type Row = { id: number; indicator_key: string; value: number; period: string; definition_note: string | null; direction_good: 'up' | 'down' };
type Newer = { value: number; period: string; sourceUrl: string; releasedAt?: string | null; note?: (old: string) => string; ago?: { value: number; label: string } };

async function text(url: string): Promise<string | null> {
  const res = await politeFetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}
async function bytes(url: string): Promise<ArrayBuffer> {
  const res = await politeFetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

// Each returns the newer figure, or null when the publisher has nothing newer than the period held.
const CHECKS: Record<string, (held: Row) => Promise<Newer | null>> = {
  async ae_4hr_pct(held) {
    const page = AE_PAGE(fyStartOf(nextMonth(held.period)));
    const html = await text(page);
    const link = html && aeNewestCsv(html, page);
    if (!link || link.period <= held.period) return null;
    await sleep(GAP_MS);
    const value = aePercent(new TextDecoder().decode(await bytes(link.url)));
    // A year earlier: the same month on the previous year's page.
    const agoPeriod = `${Number(link.period.slice(0, 4)) - 1}${link.period.slice(4)}`;
    const agoPage = AE_PAGE(fyStartOf(agoPeriod));
    await sleep(GAP_MS);
    const agoHtml = await text(agoPage);
    const agoCsv = agoHtml && aeCsvFor(agoHtml, agoPage, agoPeriod);
    let ago: Newer['ago'];
    if (agoCsv) { await sleep(GAP_MS); ago = { value: aePercent(new TextDecoder().decode(await bytes(agoCsv))), label: monthName(agoPeriod) }; }
    return { value, period: link.period, sourceUrl: page, ago, releasedAt: publishedOn(html) };
  },
  async rtt_waiting_list(held) {
    const page = RTT_PAGE(fyStartOf(nextMonth(held.period)));
    const html = await text(page);
    const file = html && rttTimeseriesLink(html, page);
    if (!file) return null;
    const label = /Trusts-([A-Za-z]{3})(\d{2})-/.exec(file); // the file name carries its month, e.g. ...-Sep26-...
    const mi = label ? MONTHS.findIndex((m) => m.startsWith(label[1])) : -1;
    if (mi >= 0 && `20${label![2]}-${String(mi + 1).padStart(2, '0')}` <= held.period) return null;
    await sleep(GAP_MS);
    const r = rttNewest(await bytes(file));
    if (r.period <= held.period) return null;
    const agoPeriod = `${Number(r.period.slice(0, 4)) - 1}${r.period.slice(4)}`;
    return { value: r.value, period: r.period, sourceUrl: page, releasedAt: publishedOn(html), ago: r.yearAgo != null ? { value: r.yearAgo, label: monthName(agoPeriod) } : undefined, note: (old) => old.replace(/at the end of [A-Z][a-z]+ \d{4}/, `at the end of ${monthName(r.period)}`) };
  },
  async gp_fte(held) {
    const period = nextMonth(held.period);
    const page = gpEditionUrl(period);
    const html = await text(page);
    const file = html && gpTablesLink(html, period); // the page exists before publication; the tables link only after
    if (!file) return null;
    await sleep(GAP_MS);
    const buf = await bytes(file);
    const raw = gpValue(buf, period);
    const value = Math.round(raw);
    const agoPeriod = `${Number(period.slice(0, 4)) - 1}${period.slice(4)}`;
    // The year-earlier figure is shifted by the rounding of this one, so the difference shown is the unrounded one, as
    // NHS England's own ("3.1% (885) more than September 2025" for 29,400.06 against 28,515.5).
    let ago: Newer['ago'];
    try { ago = { value: gpValue(buf, agoPeriod) + (value - raw), label: monthName(agoPeriod) }; } catch { ago = undefined; }
    const [y, m] = period.split('-').map(Number);
    const asAt = `${new Date(Date.UTC(y, m, 0)).getUTCDate()} ${monthName(period)}`;
    return { value, period, sourceUrl: page, ago, releasedAt: publishedOn(html), note: (old) => old.replace(/[\d,]+ at \d{1,2} [A-Z][a-z]+ \d{4}/, `${value.toLocaleString('en-GB')} at ${asAt}`) };
  },
  async prison_occupancy_pct(held) {
    const year = Number(today().slice(0, 4));
    let json = await text(PRISON_API(year));
    let pageYear = year;
    if (!json) { pageYear = year - 1; json = await text(PRISON_API(pageYear)); } // the new year's page starts in January
    const file = json && prisonNewestFile(JSON.parse(json));
    if (!file) return null;
    await sleep(GAP_MS);
    const p = prisonFigures(await bytes(file));
    if (p.period <= held.period) return null;
    return {
      value: p.value, period: p.period, sourceUrl: PRISON_PAGE(pageYear), releasedAt: p.period,
      ago: p.yearAgo ? { value: p.yearAgo.value, label: monthName(p.yearAgo.period.slice(0, 7)) } : undefined,
      note: (old) => old.replace(/Population [\d,]+ against (?:usable )?operational capacity of [\d,]+ \([^)]*\)/, `Population ${p.population.toLocaleString('en-GB')} against usable operational capacity of ${p.capacity.toLocaleString('en-GB')} (${dayName(p.period)})`),
    };
  },
};

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const dry = new URL(req.url).searchParams.get('dry') === '1';

  const { data, error } = await supabaseAdmin.from('dashboard_indicators')
    .select('id, indicator_key, value, period, definition_note, direction_good').in('indicator_key', Object.keys(CHECKS));
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const results: Record<string, unknown> = {};
  let written = 0;
  for (const held of (data ?? []) as Row[]) {
    try {
      const n = await CHECKS[held.indicator_key](held);
      if (!n) { results[held.indicator_key] = { held: held.period, newer: false }; continue; }
      const note = n.note && held.definition_note ? n.note(held.definition_note) : held.definition_note;
      const row = {
        value: n.value, period: n.period, released_at: n.releasedAt ?? today(), prev_value: held.value, prev_period: held.period,
        source_url: n.sourceUrl, definition_note: note,
        // The year-earlier line, or none when the file did not give the figure (the page then hides the line).
        ...(n.ago ? yearEarlierLine(held.indicator_key, n.value, n.ago.value, n.ago.label, held.direction_good) : { recent_change: null, recent_direction: null }),
        checked_on: today(), updated_at: new Date().toISOString(),
      };
      results[held.indicator_key] = { held: held.period, newer: true, value: n.value, period: n.period, noteChanged: note !== held.definition_note, recent: row.recent_change };
      if (!dry) {
        const { error: wErr } = await supabaseAdmin.from('dashboard_indicators').update(row).eq('id', held.id).eq('period', held.period);
        if (wErr) throw new Error(`write: ${wErr.message}`);
        written++;
      }
    } catch (e) {
      if (isPoliteStop(e)) throw e;
      results[held.indicator_key] = { held: held.period, error: (e as Error).message };
    }
    await sleep(GAP_MS);
  }
  if (written > 0) refreshTables('dashboard_indicators'); // A16: only after a figure changed
  return NextResponse.json({ ok: true, dry, written, results, syncedAt: new Date().toISOString() });
}

export const GET = withHeartbeat('/api/sync-dashboard-indicators', GET_impl);
