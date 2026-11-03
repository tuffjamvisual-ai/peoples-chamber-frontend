// First load of the peers table (owner's yes, 3 Nov 2026), through lib/peers.ts, the code /api/sync-peers uses.
//
//   npx tsx scripts/load-peers.ts fetch <out.json> [<lords-members.json>]
//       Reads every peer from the Members API (current and former), then the Biography (posts and committees) of each
//       peer who gets a page (current, or sat since 4 July 2024). Reads only. About 1,500 requests, 1 s apart.
//       The search's paging is not stable and on 3 Nov 2026 never returned 2 of the 2,009 former peers in three passes;
//       any id in the given copy of Parliament's member list (the official data of 1 Nov 2026) that the search missed
//       is read on its own (Members/{id}), so the load is complete.
//   npx tsx scripts/load-peers.ts sql <in.json> <out.sql> COMMIT|ROLLBACK
//       Writes one transaction (BEGIN READ WRITE, 60 s statement and 5 s lock timeouts) that inserts every peer and
//       refuses unless the table was empty and exactly the expected number of rows, current peers and peers with posts
//       read are there afterwards.
import fs from 'fs';
import { fetchPeerList, readPeerList, fetchPeer, fetchPosts, peerHasPage, type PeerRow, type PostsRow } from '@/lib/peers';

const [cmd, ...args] = process.argv.slice(2);

async function fetchAll(out: string, knownFile?: string) {
  const current = await fetchPeerList(true);
  console.log(`current peers ${current.length}`);
  const f = await readPeerList(false);
  const former = f.rows;
  console.log(`former peers: search read ${f.seen.size} of ${f.total}`);
  if (f.seen.size < f.total) {
    if (!knownFile) throw new Error('the search missed former peers; give the member list file to read them one by one');
    const known = (JSON.parse(fs.readFileSync(knownFile, 'utf8')) as Array<{ value?: { id: number }; id?: number }>).map((m) => (m.value ?? m).id as number);
    const have = new Set([...f.seen, ...current.map((r) => r.member_id)]);
    const missing = known.filter((id) => !have.has(id));
    console.log(`reading ${missing.length} missed ids one by one: ${missing.join(', ')}`);
    for (const id of missing) { f.seen.add(id); const r = await fetchPeer(id); if (r && !r.is_current) former.push(r); }
    // Complete when every member in Parliament's own list has been read. On 3 Nov 2026 the search's total said 2,009
    // former peers but the list and three passes together hold 2,008: the difference is logged, not loaded.
    const unseen = known.filter((id) => !f.seen.has(id) && !current.some((r) => r.member_id === id));
    if (unseen.length) throw new Error(`former peers still missing from the member list: ${unseen.join(', ')}`);
    if (f.seen.size < f.total) console.log(`note: the search total is ${f.total}; every member in Parliament's list (${f.seen.size} former read) is loaded`);
  }
  console.log(`former peers ${former.length}`);
  const all = new Map<number, PeerRow & Partial<PostsRow>>();
  for (const r of [...former, ...current]) all.set(r.member_id, r); // a current row wins if an id is in both
  const withPages = [...all.values()].filter(peerHasPage);
  console.log(`peers with pages ${withPages.length}; reading their posts`);
  let n = 0;
  for (const p of withPages) {
    Object.assign(p, await fetchPosts(p.member_id));
    if (++n % 100 === 0) { console.log(`${new Date().toISOString()} posts ${n}/${withPages.length}`); fs.writeFileSync(out, JSON.stringify([...all.values()])); }
  }
  fs.writeFileSync(out, JSON.stringify([...all.values()]));
  console.log(`done: ${all.size} peers, posts read for ${n}`);
}

function writeSql(input: string, out: string, end: string) {
  if (end !== 'COMMIT' && end !== 'ROLLBACK') throw new Error('COMMIT or ROLLBACK');
  const rows = JSON.parse(fs.readFileSync(input, 'utf8')) as Array<PeerRow & Partial<PostsRow>>;
  const json = JSON.stringify(rows);
  if (json.includes('$peers$')) throw new Error('unsafe');
  const n = rows.length, cur = rows.filter((r) => r.is_current).length, withPosts = rows.filter((r) => r.posts_checked_at).length;
  const cols = 'member_id, name_display, name_list_as, name_full_title, gender, party, party_id, party_colour, peerage_type, peerage_type_id, start_date, end_date, end_reason, status, is_current, thumbnail_url, government_posts, opposition_posts, other_posts, committee_memberships, posts_checked_at, synced_at';
  fs.writeFileSync(out, `\\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.peers) THEN RAISE EXCEPTION 'peers is not empty'; END IF; END $$;
INSERT INTO public.peers (${cols})
SELECT ${cols} FROM jsonb_populate_recordset(NULL::public.peers, $peers$${json}$peers$::jsonb);
DO $$
DECLARE n int; c int; p int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE is_current), count(*) FILTER (WHERE posts_checked_at IS NOT NULL) INTO n, c, p FROM public.peers;
  IF (n, c, p) <> (${n}, ${cur}, ${withPosts}) THEN RAISE EXCEPTION 'refused: % peers, % current, % with posts; expected ${n}, ${cur}, ${withPosts}', n, c, p; END IF;
END $$;
SELECT count(*) AS peers, count(*) FILTER (WHERE is_current) AS current, count(*) FILTER (WHERE posts_checked_at IS NOT NULL) AS with_posts FROM public.peers;
${end};
`);
  console.log(`wrote ${out}: ${n} peers, ${cur} current, ${withPosts} with posts, ends ${end}`);
}

(cmd === 'fetch' ? fetchAll(args[0], args[1]) : cmd === 'sql' ? Promise.resolve(writeSql(args[0], args[1], args[2])) : Promise.reject(new Error('fetch or sql')))
  .catch((e) => { console.error(`load-peers: ${e.message}`); process.exit(1); });
