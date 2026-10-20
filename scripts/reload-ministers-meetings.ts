// Full reload of ministers_meetings from GOV.UK (owner's approval, 20 Oct 2026; lobbying phase 1), using the same
// reading rules as the weekly sync (lib/ministers-meetings-source.ts): text encoding, dates kept as published with
// notes, the source publication and CSV on every row, and the four added offices.
//
// DRY RUN BY DEFAULT: fetches (or reads from --cache), prints a report per department and publication, writes NOTHING
// to the database. --sql=file.sql writes one guarded transaction that replaces every row; --report=file.json saves
// the per-publication report (used for the coverage check).
//
// Fetching: robots.txt is read first for each host; one request at a time, one second apart; redirects not followed.
// --cache=dir keeps every response there and reuses it on the next run.
//
// Usage (Node 22):
//   node --experimental-strip-types scripts/reload-ministers-meetings.ts --cache=<dir> --report=<file> [--sql=<file>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Fetched, MeetingRow, Publication } from '../lib/ministers-meetings-source';
// Loaded at run time with its file extension, as Node requires; the type-only import above is for type checking.
type Source = typeof import('../lib/ministers-meetings-source');

const arg = (n: string) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const fail = (m: string): never => { console.error(m); process.exit(1); };
const UA = 'opengovt.uk-ministers-meetings/1.0 (https://opengovt.uk; ministers meetings transparency returns; one request a second)';
const CACHE = arg('cache') || fail('give --cache=<dir>');
fs.mkdirSync(CACHE, { recursive: true });
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- polite fetching ----------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const robots = new Map<string, string[]>();
async function allowed(url: string): Promise<boolean> {
  const u = new URL(url);
  if (!robots.has(u.host)) {
    const r = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const t = r.ok ? await r.text() : r.status === 404 ? '' : 'User-agent: *\nDisallow: /';
    let star = false; const dis: string[] = [];
    for (const line of t.split(/\r?\n/)) {
      const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
      if (!m) continue;
      if (m[1].toLowerCase() === 'user-agent') star = m[2].trim() === '*';
      else if (star && m[1].toLowerCase() === 'disallow' && m[2].trim()) dis.push(m[2].trim());
    }
    robots.set(u.host, dis);
    console.error(`robots.txt read for ${u.host} (${dis.length} disallow rules)`);
    await sleep(1000);
  }
  const p = u.pathname + u.search;
  return !robots.get(u.host)!.some((d) => new RegExp('^' + d.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')).test(p));
}
let requests = 0;
async function politeFetch(url: string, hops = 3): Promise<Fetched> {
  const file = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex'));
  if (fs.existsSync(file)) {
    const meta = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
    return { ok: meta.ok, status: meta.status, bytes: new Uint8Array(fs.readFileSync(file)) };
  }
  if (!(await allowed(url))) fail(`robots.txt disallows ${url}`);
  const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual' });
  requests++;
  await sleep(1000);
  if ([301, 302, 303, 307, 308].includes(r.status) && hops) return politeFetch(new URL(r.headers.get('location')!, url).href, hops - 1);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (/just a moment|cf-chl|captcha/i.test(new TextDecoder().decode(bytes.subarray(0, 3000))) && !url.includes('/api/')) fail(`bot check at ${url}; stopping`);
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(file + '.json', JSON.stringify({ url, ok: r.ok, status: r.status }));
  return { ok: r.ok, status: r.status, bytes };
}

// ---------- run ----------
type PubReport = { dept: string; title: string; slug: string; published: string | null; kept: boolean; csvs: { title: string; url: string; rows: number; encoding: string; problem: string | null; duplicateOf?: string }[]; attachments: string[] };
(async () => {
  const { DEPT_SLUGS, findPublications, fetchAttachments, meetingsCsvs, parseMeetingsCsv } = (await import(new URL('../lib/ministers-meetings-source.ts', import.meta.url).href)) as Source;
  const report: PubReport[] = [];
  const rows: (MeetingRow & { govuk_org_slug: string })[] = [];
  const seenCsv = new Map<string, string>();
  for (const dept of DEPT_SLUGS) {
    const { kept, all } = await findPublications(politeFetch, dept);
    const keptLinks = new Set(kept.map((p) => p.link));
    for (const pub of all as Publication[]) {
      const slug = pub.link.replace(/^.*\/publications\//, '');
      const rep: PubReport = { dept, title: pub.title, slug, published: pub.public_timestamp ?? null, kept: keptLinks.has(pub.link), csvs: [], attachments: [] };
      report.push(rep);
      if (!rep.kept) continue;
      let atts;
      try { atts = await fetchAttachments(politeFetch, pub.link); } catch (e) { rep.attachments.push(`(content API failed: ${(e as Error).message})`); continue; }
      rep.attachments = atts.map((a) => `${a.content_type || '?'}: ${a.title || ''}`);
      for (const att of meetingsCsvs(atts)) {
        if (seenCsv.has(att.url)) { rep.csvs.push({ title: att.title || '', url: att.url, rows: 0, encoding: '', problem: null, duplicateOf: seenCsv.get(att.url) }); continue; }
        seenCsv.set(att.url, dept);
        const res = await politeFetch(att.url);
        if (!res.ok) { rep.csvs.push({ title: att.title || '', url: att.url, rows: 0, encoding: '', problem: `HTTP ${res.status}` }); continue; }
        const out = parseMeetingsCsv(res.bytes, att, pub, TODAY);
        rep.csvs.push({ title: att.title || '', url: att.url, rows: out.rows.length, encoding: out.encoding, problem: out.problem });
        for (const r of out.rows) rows.push({ ...r, govuk_org_slug: dept });
      }
    }
    const n = rows.filter((r) => r.govuk_org_slug === dept).length;
    console.log(`${dept}: ${all.length} publications found, ${kept.length} kept, ${n} rows`);
  }
  console.log(`\nrequests made this run: ${requests}; rows: ${rows.length}; CSVs: ${seenCsv.size}`);
  console.log(`encodings: ${JSON.stringify(report.flatMap((p) => p.csvs).reduce((m, c) => { if (c.encoding) m[c.encoding] = (m[c.encoding] || 0) + 1; return m; }, {} as Record<string, number>))}`);
  console.log(`rows with "�": ${rows.filter((r) => JSON.stringify(r).includes('�')).length}`);
  console.log(`dates: read ${rows.filter((r) => r.meeting_date && !r.date_note).length}, read as month/day ${rows.filter((r) => r.date_note?.startsWith('read as')).length}, empty ${rows.filter((r) => !r.meeting_date).length}`);
  if (arg('report')) fs.writeFileSync(arg('report'), JSON.stringify({ today: TODAY, report, rows }, null, 1));

  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql to write the transaction.'); return; }
  const q = (v: unknown) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
  const C = ['minister_name', 'minister_dept', 'meeting_date', 'meeting_date_raw', 'date_note', 'organisation', 'purpose', 'quarter', 'source_publication_slug', 'source_publication_url', 'source_csv_url', 'source_published_on', 'govuk_org_slug'] as const;
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', '', 'DELETE FROM public.ministers_meetings;'];
  for (let i = 0; i < rows.length; i += 500) {
    L.push(`INSERT INTO public.ministers_meetings (${C.join(', ')}) VALUES`);
    L.push(rows.slice(i, i + 500).map((r) => `(${C.map((c) => q(r[c])).join(', ')})`).join(',\n') + ';');
  }
  const noSlug = 0;
  L.push('', 'DO $$', 'DECLARE n int;', 'BEGIN',
    `  SELECT count(*) INTO n FROM public.ministers_meetings;`, `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.ministers_meetings WHERE source_publication_slug IS NULL;`, `  IF n <> ${noSlug} THEN RAISE EXCEPTION 'expected every row to have its publication, % do not', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.ministers_meetings WHERE organisation LIKE '%' || chr(65533) || '%' OR minister_name LIKE '%' || chr(65533) || '%';`,
    `  IF n <> ${rows.filter((r) => (r.organisation || '').includes('�') || r.minister_name.includes('�')).length} THEN RAISE EXCEPTION 'unexpected broken characters: %', n; END IF;`,
    'END $$;', '', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${rows.length} rows). Not run.`);
})().catch((e) => fail(e.stack || String(e)));
