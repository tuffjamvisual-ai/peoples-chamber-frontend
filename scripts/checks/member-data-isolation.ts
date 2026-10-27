// Members only ever see and change their own rows (job 74). Runs the real lib/member-data.ts functions against an
// in-memory database holding two members' rows (scripts/checks/fake-supabase.ts), and the real routes without a
// session. Nothing touches the real database. Run: npx tsx scripts/checks/member-data-isolation.ts
import dotenv from 'dotenv';
import { NextRequest } from 'next/server';
import { fakeSupabase } from './fake-supabase';
import * as m from '@/lib/member-data';

dotenv.config({ path: '.env.local', quiet: true });
process.env.SESSION_SECRET = 'test-secret-for-isolation-check-0123456789'; // a test secret, never the real one
let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const now = new Date().toISOString();
const fake = fakeSupabase({
  member_alert_settings: [
    { user_id: 1, frequency: 'weekly', send_day: 1, unsubscribe_token_hash: 'h1', consented_at: now, updated_at: now },
    { user_id: 2, frequency: 'weekly', send_day: 2, unsubscribe_token_hash: 'h2', consented_at: now, updated_at: now },
  ],
  member_follows: [
    { id: 11, user_id: 1, kind: 'mp', target_key: '4597', target_label: 'MP one', created_at: now },
    { id: 21, user_id: 2, kind: 'mp', target_key: '172', target_label: 'MP two', created_at: now },
    { id: 22, user_id: 2, kind: 'bill', target_key: '3090', target_label: 'Bill two', created_at: now },
  ],
  saved_searches: [
    { id: 31, user_id: 1, label: 'nhs', query: 'nhs', filters: {}, alert: false, created_at: now },
    { id: 41, user_id: 2, label: 'knife crime', query: 'knife crime', filters: {}, alert: false, created_at: now },
  ],
}, { unique: { member_follows: [['user_id', 'kind', 'target_key']], member_alert_settings: [['user_id']] } });
const db = fake.client;
const rowsOf = (t: string, uid: number) => fake.tables[t].filter((r) => r.user_id === uid);

(async () => {
  // Reads return only member 1's rows.
  const f = await m.listFollows(db, 1);
  check(f.ok && f.value.length === 1 && f.value.every((r) => r.target_key === '4597'), 'listFollows: member 1 sees only their follow');
  const s = await m.listSavedSearches(db, 1);
  check(s.ok && s.value.length === 1 && s.value[0].id === 31, 'listSavedSearches: member 1 sees only their search');
  const st = await m.isFollowing(db, 1, 'mp', '172');
  check(st.ok && !st.value.following, 'isFollowing: member 2\'s follow does not show for member 1');
  const set = await m.getSettings(db, 1);
  check(set.ok && set.value?.send_day === 1, 'getSettings: member 1 gets their own settings');

  // Changes aimed at member 2's rows by member 1 change nothing.
  await m.removeFollow(db, 1, 'mp', '172');
  check(rowsOf('member_follows', 2).length === 2, 'removeFollow: member 1 cannot remove member 2\'s follow');
  const a = await m.setSavedSearchAlert(db, 1, 41, true);
  check(!a.ok && a.reason === 'not_found' && rowsOf('saved_searches', 2)[0].alert === false, 'setSavedSearchAlert: member 1 cannot change member 2\'s search');
  await m.removeSavedSearch(db, 1, 41);
  check(rowsOf('saved_searches', 2).length === 1, 'removeSavedSearch: member 1 cannot delete member 2\'s search');
  await m.setFrequency(db, 1, 'off');
  check(rowsOf('member_alert_settings', 2)[0].frequency === 'weekly' && rowsOf('member_alert_settings', 1)[0].frequency === 'off', 'setFrequency: changes member 1 only');
  await m.deleteAllFollowData(db, 1);
  check(rowsOf('member_follows', 1).length === 0 && rowsOf('saved_searches', 1).length === 0 && rowsOf('member_alert_settings', 1).length === 0, 'deleteAllFollowData: member 1\'s rows and consent removed');
  check(rowsOf('member_follows', 2).length === 2 && rowsOf('saved_searches', 2).length === 1 && rowsOf('member_alert_settings', 2).length === 1, 'deleteAllFollowData: member 2 untouched');

  // Consent: nothing is stored before the box is ticked.
  const before = fake.tables.member_follows.length;
  const noConsent = await m.addFollow(db, 3, 'mp', '4597', 'MP one', {}, false);
  check(!noConsent.ok && noConsent.reason === 'needs_consent' && fake.tables.member_follows.length === before && rowsOf('member_alert_settings', 3).length === 0, 'addFollow without consent: refused, nothing stored');
  const withConsent = await m.addFollow(db, 3, 'mp', '4597', 'MP one', {}, true);
  check(withConsent.ok && rowsOf('member_follows', 3).length === 1 && !!rowsOf('member_alert_settings', 3)[0]?.consented_at, 'addFollow with consent: follow and consent time stored for member 3 only');
  const again = await m.addSavedSearch(db, 3, 'small boats', {}, false);
  check(again.ok, 'addSavedSearch after consent: no second consent asked');
  for (let i = 0; i < 25; i++) await m.addSavedSearch(db, 4, `search ${i}`, {}, true);
  check(rowsOf('saved_searches', 4).length === m.MAX_SAVED_SEARCHES, `saved searches capped at ${m.MAX_SAVED_SEARCHES} a member`);

  // Every query on a member table is limited to one member (the unsubscribe link alone goes by its token hash).
  const memberTables = new Set(['member_alert_settings', 'member_follows', 'saved_searches']);
  const unscoped = fake.log.filter((q) => memberTables.has(q.table) && q.action !== 'insert' && !q.filters.some((x) => x.col === 'user_id' && x.op === 'eq'));
  check(unscoped.length === 0, `every read, update and delete on a member table filters by user_id (${fake.log.length} queries)`);
  const inserts = fake.log.filter((q) => memberTables.has(q.table) && q.action === 'insert').length;
  check(fake.tables.member_follows.concat(fake.tables.saved_searches).every((r) => typeof r.user_id === 'number'), `inserts carry the member's id (${inserts} inserts)`);

  // Unsubscribe by token: only the matching member, and a malformed token does nothing.
  const tok = m.unsubscribeToken(2)!;
  const { hashToken } = await import('@/lib/auth-tokens');
  fake.tables.member_alert_settings.find((r) => r.user_id === 2)!.unsubscribe_token_hash = hashToken(tok);
  check(await m.unsubscribeByToken(db, 'x'.repeat(10)) === 'invalid', 'unsubscribe: malformed token refused');
  check(await m.unsubscribeByToken(db, m.unsubscribeToken(5)!) === 'invalid', 'unsubscribe: another member\'s token does not match');
  check(await m.unsubscribeByToken(db, tok) === 'unsubscribed' && rowsOf('member_alert_settings', 2)[0].frequency === 'off', 'unsubscribe: the right member turned off');

  // Routes: no session, no data. Identity comes only from the signed cookie, never from the request.
  type Handlers = Record<string, ((r: NextRequest) => Promise<Response>) | undefined>;
  const routes: [string, Handlers][] = [
    ['/api/follows', (await import('../../app/api/follows/route')) as unknown as Handlers],
    ['/api/saved-searches', (await import('../../app/api/saved-searches/route')) as unknown as Handlers],
    ['/api/preferences', (await import('../../app/api/preferences/route')) as unknown as Handlers],
  ];
  for (const [path, mod] of routes) {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      const h = mod[method];
      if (typeof h !== 'function') continue;
      const body = method === 'GET' ? undefined : JSON.stringify({ kind: 'mp', key: '4597', userId: 2, user_id: 2, consent: true, q: 'nhs', id: 41, alert: true, frequency: 'off' });
      for (const cookie of [undefined, 'og_session=2.1.9999999999.forged']) {
        const req = new NextRequest(`http://localhost${path}`, { method, body, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) } });
        const res = await h(req);
        check(res.status === 401, `${method} ${path} ${cookie ? 'with a forged cookie' : 'signed out'}, user id in the body: 401`);
      }
    }
  }
  console.log(failures ? `${failures} FAILED` : 'all isolation checks passed');
  process.exit(failures ? 1 : 0);
})();
