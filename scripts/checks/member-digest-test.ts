// The weekly digest with captured sends only (job 74 Part 4): no email is sent and nothing is written to the database.
//   Part A: the real runDigests() on an in-memory database (scripts/checks/fake-supabase.ts) with 70 members due on
//           the same day: 60 digests captured, 10 held by the daily cap and sent the next day, none sent twice, an
//           unchanged member gets nothing, and every captured digest has a plain text part, an unsubscribe link and the
//           one click unsubscribe header.
//   Part B (--real): change detection on production data, read only, for one MP, one bill and one donor followed a
//           week ago; prints what the digest would say and writes the rendered email to the capture folder.
// Run: npx tsx scripts/checks/member-digest-test.ts [--real] [--out <dir>]
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fakeSupabase } from './fake-supabase';

dotenv.config({ path: '.env.local', quiet: true });
process.env.SESSION_SECRET = 'test-secret-for-digest-check-0123456789'; // a test secret, never the real one
delete process.env.RESEND_API_KEY; // belt and braces: even a wrong sender could not reach Resend

const outDir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : path.join(process.cwd(), '.digest-capture');
let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

type Captured = { to: string; subject: string; text: string; html: string; unsubscribeUrl: string };

(async () => {
  const { runDigests, followChange, renderDigest, DAILY_CAP } = await import('@/lib/member-digest');
  const day0 = new Date('2026-11-02T07:24:00Z'); // a Monday
  const weekday = 1;
  const old = new Date(day0.getTime() - 3 * 86400_000).toISOString();
  const fresh = new Date(day0.getTime() - 3600_000).toISOString();
  const N = 70;
  const tables: Record<string, Record<string, unknown>[]> = {
    member_alert_settings: [], member_follows: [], saved_searches: [], alert_log: [], users: [],
    mp_division_votes: [], mp_registered_interests: [], mp_expenses_detail: [], bill: [], lords_divisions: [], political_donations: [],
  };
  for (let u = 0; u <= N; u++) {
    tables.users.push({ id: u, email: `member${u}@example.test`, email_verified: true });
    tables.member_alert_settings.push({ user_id: u, frequency: 'weekly', send_day: weekday, unsubscribe_token_hash: 'stale', consented_at: old });
    tables.member_follows.push({ id: 5000 + u, user_id: u, kind: 'mp', target_key: String(u >= 1 ? 4597 : 9999), target_label: 'Test MP', last_state: {}, last_notified_at: null, created_at: old });
  }
  // Member 0 follows an MP with no change (checked first, before the cap); one member is off; one has no confirmed address.
  tables.member_alert_settings.push({ user_id: 900, frequency: 'off', send_day: weekday, unsubscribe_token_hash: 'x', consented_at: old });
  tables.users.push({ id: 900, email: 'off@example.test', email_verified: true }, { id: 901, email: 'unconfirmed@example.test', email_verified: false });
  tables.member_alert_settings.push({ user_id: 901, frequency: 'weekly', send_day: weekday, unsubscribe_token_hash: 'x', consented_at: old });
  tables.member_follows.push({ id: 6900, user_id: 900, kind: 'mp', target_key: '4597', target_label: 'Test MP', last_state: {}, created_at: old }, { id: 6901, user_id: 901, kind: 'mp', target_key: '4597', target_label: 'Test MP', last_state: {}, created_at: old });
  tables.mp_division_votes.push({ member_id: 4597, division_id: 1, division_title: 'Test Bill: Third Reading', vote_type: 'AyeVote', created_at: fresh });
  const fake = fakeSupabase(tables, { unique: { alert_log: [['user_id', 'digest_date']] } });

  const captured: Captured[] = [];
  const send = async (msg: Captured) => { captured.push(msg); return { sent: true as const, id: `captured-${captured.length}` }; };

  const r1 = await runDigests({ db: fake.client, send, now: day0 });
  check(captured.length === DAILY_CAP && r1.sent === DAILY_CAP, `day 1: ${captured.length} digests captured, cap ${DAILY_CAP}`);
  check(r1.budgetReached === N - DAILY_CAP, `day 1: ${r1.budgetReached} held by the cap and logged budget_reached`);
  check(r1.nothingNew === 1, 'day 1: the member with no change gets no email (logged nothing_new)');
  check(!captured.some((c) => c.to.startsWith('off@') || c.to.startsWith('unconfirmed@')), 'day 1: no digest to a member with the email off or an unconfirmed address');
  check(fake.tables.alert_log.filter((r) => r.status === 'sent').length === DAILY_CAP, 'day 1: alert_log holds 60 sent rows');

  const again = await runDigests({ db: fake.client, send, now: new Date(day0.getTime() + 3600_000) });
  check(again.sent === 0 && captured.length === DAILY_CAP, 'day 1, second run: nothing more sent (cap already reached, nobody twice)');

  const day1 = new Date(day0.getTime() + 86400_000);
  const r2 = await runDigests({ db: fake.client, send, now: day1 });
  check(r2.sent === N - DAILY_CAP && captured.length === N, `day 2: the ${N - DAILY_CAP} held members get theirs; total ${captured.length}`);
  check(new Set(captured.map((c) => c.to)).size === captured.length, 'no member received two digests');

  const day7 = new Date(day0.getTime() + 7 * 86400_000);
  fake.tables.mp_division_votes.push({ member_id: 4597, division_id: 2, division_title: 'Another division', vote_type: 'NoVote', created_at: new Date(day7.getTime() - 3600_000).toISOString() });
  const r3 = await runDigests({ db: fake.client, send, now: day7 });
  check(r3.sent === DAILY_CAP - 0 && r3.skippedRecent === N - DAILY_CAP, `a week later: the 60 from day 1 are due again (${r3.sent} sent); the 10 sent on day 2 wait (${r3.skippedRecent} skipped, under 6 days)`);
  const week2 = captured.slice(N);
  check(week2.every((c) => c.text.includes('Another division') && !c.text.includes('Test Bill: Third Reading')), 'a week later: only the new vote is reported, not last week\'s');

  const c = captured[0];
  check(/\/api\/alerts\/unsubscribe\?token=[A-Za-z0-9_-]{43}$/.test(c.unsubscribeUrl), 'unsubscribe URL with a signed token (for the List-Unsubscribe and List-Unsubscribe-Post headers)');
  check(c.text.includes(c.unsubscribeUrl) && c.html.includes(c.unsubscribeUrl.replace(/&/g, '&amp;')), 'unsubscribe link in the plain text and the HTML');
  check(c.text.length > 0 && !/<[a-z]/i.test(c.text), 'plain text version present, no HTML in it');
  check(fake.tables.member_alert_settings.find((s) => s.user_id === 1)!.unsubscribe_token_hash !== 'stale', 'stored token hash brought in step with the link');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'fake-digest.txt'), `To: [member]\nSubject: ${c.subject}\nList-Unsubscribe: <${c.unsubscribeUrl}>\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\n\n${c.text}`);

  // The email path: lib/email.ts sendMemberDigest is only ever called by the digest, and it sets both headers.
  const emailSrc = fs.readFileSync('lib/email.ts', 'utf8');
  const fn = emailSrc.slice(emailSrc.indexOf('export async function sendMemberDigest'));
  check(fn.includes("'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'") && fn.includes("'List-Unsubscribe'"), 'sendMemberDigest sets List-Unsubscribe and List-Unsubscribe-Post');

  if (process.argv.includes('--real')) {
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - Number(process.argv.find((a) => a.startsWith('days='))?.slice(5) ?? 7) * 86400_000).toISOString();
    const args = process.argv.slice(2).filter((a) => /^\w+=/.test(a)).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
    const keys: Record<string, string> = Object.fromEntries(args);
    const follows = [
      { id: 0, user_id: 0, kind: 'mp' as const, target_key: keys.mp ?? '4597', target_label: `MP ${keys.mp ?? '4597'}`, last_state: {}, last_notified_at: null, created_at: weekAgo },
      { id: 0, user_id: 0, kind: 'bill' as const, target_key: keys.bill ?? '3090', target_label: `Bill ${keys.bill ?? '3090'}`, last_state: { stage: keys.stage ?? null }, last_notified_at: null, created_at: weekAgo },
      { id: 0, user_id: 0, kind: 'donor' as const, target_key: keys.donor ?? 'x', target_label: keys.donorName ?? 'Donor', last_state: { names: keys.donorName ? [keys.donorName] : [] }, last_notified_at: null, created_at: weekAgo },
    ];
    const items = [];
    for (const f of follows) {
      const t0 = Date.now();
      const ch = await followChange(supabaseAdmin, f, now); // reads only; ch.save() is never called
      console.log(`\n[real] ${f.kind} ${f.target_key}: ${ch ? ch.item.lines.length + ' lines' : 'nothing new'} (${Date.now() - t0} ms)`);
      if (ch) { for (const l of ch.item.lines) console.log('   ' + l); items.push(ch.item); }
    }
    if (items.length) {
      const msg = renderDigest(items, 'https://www.opengovt.uk/api/alerts/unsubscribe?token=[token]');
      fs.writeFileSync(path.join(outDir, 'real-digest.txt'), `Subject: ${msg.subject}\n\n${msg.text}`);
      fs.writeFileSync(path.join(outDir, 'real-digest.html'), msg.html);
      console.log(`\n[real] rendered digest written to ${outDir}`);
    }
  }
  console.log(failures ? `\n${failures} FAILED` : '\nall digest checks passed');
  process.exit(failures ? 1 : 0);
})();
