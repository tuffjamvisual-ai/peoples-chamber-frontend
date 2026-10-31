// Ministers' diary matching check (owner "go", 31 Oct 2026). Read only: writes nothing.
//
// The MP profile (app/mps/[id]/page.tsx) shows ministers_meetings and ministers_hospitality rows for an MP by reading
// rows WHERE minister_name ILIKE '%<MP name without honorifics>%', newest first, at most 500 per table (meetings only
// up to today), then keeping rows whose minister_name contains the MP's first word AND last word as plain substrings.
// This compares, for every MP in mps:
//   OLD = what that code shows;
//   NEW = every row whose minister_name passes lib/mp-recipient-match.ts recipientIsMp (last name as a whole word, a
//         word equal to or starting with the first name), with no row limit (meetings still only up to today, as now).
// Both tables are read in full with lib/read-all.ts readAll. Prints the totals; the MPs where NEW gains rows (with the
// minister_name strings gained) and where it loses rows (with the strings lost), the 20 biggest of each; any MP whose
// OLD read hit 500; and every minister_name string NEW gives to more than one MP.
//
// Usage: npx tsx --tsconfig tsconfig.json scripts/checks/ministers-diary-match-check.ts

import { createClient } from '@supabase/supabase-js';
import { recipientIsMp, stripHonorific } from '../../lib/mp-recipient-match';
import { readAll } from '../../lib/read-all';

process.loadEnvFile(`${__dirname}/../../.env.local`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const LIMIT = 500;
const TODAY = new Date().toISOString().slice(0, 10);

type Row = { id: number; minister_name: string | null; date: string | null };
type Mp = { member_id: number; display_name: string | null; name: string | null };
type Change = { id: number; name: string; rows: number; strings: Map<string, number> };

function fmtStrings(m: Map<string, number>): string {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${JSON.stringify(s)} (${n})`).join(', ');
}

async function compare(table: string, dateCol: string, mps: Mp[], onlyToToday: boolean) {
  const raw = await readAll<Record<string, unknown>>(() => supabase.from(table), {
    columns: `id, minister_name, ${dateCol}`,
    orderBy: 'id',
    label: table,
  });
  let rows: Row[] = raw.map((r) => ({ id: r.id as number, minister_name: (r.minister_name as string | null) ?? null, date: (r[dateCol] as string | null) ?? null }));
  const totalRead = rows.length;
  if (onlyToToday) rows = rows.filter((r) => r.date !== null && r.date <= TODAY);

  // Rows by distinct minister_name.
  const byName = new Map<string, Row[]>();
  for (const r of rows) {
    const n = r.minister_name ?? '';
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n)!.push(r);
  }
  const names = [...byName.keys()];

  const gained: Change[] = [];
  const lost: Change[] = [];
  const capped: { id: number; name: string; matched: number }[] = [];
  const newOwners = new Map<string, Set<string>>(); // minister_name -> MPs NEW gives it to
  let oldTotal = 0;
  let newTotal = 0;

  for (const mp of mps) {
    const nameTop = mp.display_name || mp.name || '';
    const nameKey = stripHonorific(nameTop);
    const firstWord = nameKey.split(/\s+/)[0]?.toLowerCase() ?? '';
    const lastWord = nameKey.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '';
    const label = `${mp.member_id} ${nameTop}`;

    // OLD: ILIKE on the full name (with % _ , removed, as the page does), newest first, 500, then the substring filter.
    const ilikeKey = nameKey.replace(/[%_,]/g, '').toLowerCase();
    const ilikeRows = names.filter((n) => n.toLowerCase().includes(ilikeKey)).flatMap((n) => byName.get(n)!);
    ilikeRows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id - a.id);
    if (ilikeRows.length >= LIMIT) capped.push({ id: mp.member_id, name: nameTop, matched: ilikeRows.length });
    const oldRows = ilikeRows.slice(0, LIMIT).filter((r) => {
      const n = String(r.minister_name || '').toLowerCase();
      return !!firstWord && !!lastWord && n.includes(firstWord) && n.includes(lastWord);
    });

    // NEW: the token rule, every row.
    const newNames = names.filter((n) => recipientIsMp(n, firstWord, lastWord));
    const newRows = newNames.flatMap((n) => byName.get(n)!);
    for (const n of newNames) {
      if (!newOwners.has(n)) newOwners.set(n, new Set());
      newOwners.get(n)!.add(label);
    }

    oldTotal += oldRows.length;
    newTotal += newRows.length;
    const oldIds = new Set(oldRows.map((r) => r.id));
    const newIds = new Set(newRows.map((r) => r.id));
    const g: Change = { id: mp.member_id, name: nameTop, rows: 0, strings: new Map() };
    for (const r of newRows) if (!oldIds.has(r.id)) { g.rows++; g.strings.set(r.minister_name ?? '', (g.strings.get(r.minister_name ?? '') ?? 0) + 1); }
    const l: Change = { id: mp.member_id, name: nameTop, rows: 0, strings: new Map() };
    for (const r of oldRows) if (!newIds.has(r.id)) { l.rows++; l.strings.set(r.minister_name ?? '', (l.strings.get(r.minister_name ?? '') ?? 0) + 1); }
    if (g.rows) gained.push(g);
    if (l.rows) lost.push(l);
  }

  gained.sort((a, b) => b.rows - a.rows || a.id - b.id);
  lost.sort((a, b) => b.rows - a.rows || a.id - b.id);
  const shared = [...newOwners.entries()].filter(([, s]) => s.size > 1).sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));

  console.log(`\n=== ${table} ===`);
  console.log(`rows read ${totalRead}${onlyToToday ? `; ${rows.length} dated up to today (${TODAY})` : ''}; distinct minister_name strings ${names.length}`);
  console.log(`rows shown across all MPs: OLD ${oldTotal}, NEW ${newTotal}`);
  console.log(`\nMPs where NEW has rows OLD lacks: ${gained.length} (${gained.reduce((s, c) => s + c.rows, 0)} rows). The 20 biggest:`);
  for (const c of gained.slice(0, 20)) console.log(`  ${c.id} ${c.name}: +${c.rows}: ${fmtStrings(c.strings)}`);
  console.log(`\nMPs where OLD has rows NEW lacks: ${lost.length} (${lost.reduce((s, c) => s + c.rows, 0)} rows). The 20 biggest:`);
  for (const c of lost.slice(0, 20)) console.log(`  ${c.id} ${c.name}: -${c.rows}: ${fmtStrings(c.strings)}`);
  console.log(`\nMPs whose OLD read hit ${LIMIT}: ${capped.length}`);
  for (const c of capped) console.log(`  ${c.id} ${c.name}: ${c.matched} rows matched the ILIKE, ${LIMIT} read`);
  console.log(`\nminister_name strings NEW gives to more than one MP: ${shared.length}`);
  for (const [n, s] of shared) console.log(`  ${JSON.stringify(n)} (${byName.get(n)!.length} rows): ${[...s].join(' | ')}`);
}

async function main() {
  const mps = await readAll<Mp>(() => supabase.from('mps'), { columns: 'member_id, display_name, name', orderBy: 'member_id', label: 'mps' });
  console.log(`${mps.length} MPs read.`);
  await compare('ministers_meetings', 'meeting_date', mps, true);
  await compare('ministers_hospitality', 'hospitality_date', mps, false);
}

main().catch((e) => {
  console.error('ministers-diary-match-check failed:', e);
  process.exit(1);
});
