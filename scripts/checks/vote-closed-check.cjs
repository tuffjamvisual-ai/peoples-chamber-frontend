// Closed bills check (owner, 4 Nov 2026): runs the real POST handler of /api/vote against a stand in database, so no vote
// or last seen time is written anywhere. It records each write the handler tries to make.
//   npx tsx scripts/checks/vote-closed-check.cjs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('module');

let world;
function table(name) {
  let write = null;
  const b = {
    select() { return b; }, eq() { return b; },
    insert(row) { write = 'insert'; world.writes.push(`${name} insert`); void row; return b; },
    update(row) { write = 'update'; world.writes.push(`${name} update`); void row; return b; },
    single() { return b.answer(); }, maybeSingle() { return b.answer(); },
    answer() {
      if (name === 'users') return Promise.resolve({ data: { id: 1, email_verified: true }, error: null });
      if (name === 'bill') return Promise.resolve({ data: world.bill, error: null });
      if (name === 'vote') return Promise.resolve({ data: world.vote, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(ok) { return ok({ data: null, error: write ? null : null }); },
  };
  return b;
}
const fake = {
  from: table,
  rpc(fn) {
    world.writes.push(`rpc ${fn}`);
    const closed = world.bill.is_act || world.bill.bill_withdrawn != null || world.bill.is_defeated;
    return Promise.resolve({ data: closed ? { status: 'closed', choice: world.vote.choice } : { status: 'changed', to: 'no', votes: { yes: 0, no: 1, abstain: 0 } }, error: null });
  },
};
const stubs = {
  '@/lib/supabase-admin': { supabaseAdmin: fake },
  '@/lib/session': { getSessionUserId: async () => 1 },
  '@/lib/touch-last-seen': { touchLastSeen: async () => {} },
  'next/cache': { revalidatePath() {} },
};
const load = Module._load;
Module._load = function (request, ...rest) { return stubs[request] ?? load.call(this, request, ...rest); };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../../app/api/vote/route.ts');
const open = { id: 9, hidden_reason: null, is_act: false, bill_withdrawn: null, is_defeated: false, vote_count_yes: 0, vote_count_no: 0, vote_count_abstain: 0 };
const CASES = [
  ['Act, first vote',              { is_act: true },                 null,              400, 'Voting has closed on this bill', []],
  ['withdrawn, first vote',        { bill_withdrawn: '2026-01-01' }, null,              400, 'Voting has closed on this bill', []],
  ['defeated, first vote',         { is_defeated: true },            null,              400, 'Voting has closed on this bill', []],
  ['Act, vote kept, same choice',  { is_act: true },                 { id: 1, choice: 'yes' }, 200, undefined, []],
  ['Act, vote kept, other choice', { is_act: true },                 { id: 1, choice: 'no' },  400, 'Voting has closed on this bill', ['rpc change_bill_vote']],
  ['hidden, first vote',           { hidden_reason: 'duplicate' },   null,              404, 'Bill not found', []],
  ['open, first vote',             {},                               null,              200, undefined, ['vote insert', 'bill update']],
  ['open, change of vote',         {},                               { id: 1, choice: 'no' },  200, undefined, ['rpc change_bill_vote']],
];

(async () => {
  let bad = 0;
  for (const [name, flags, vote, status, error, writes] of CASES) {
    world = { bill: { ...open, ...flags }, vote, writes: [] };
    const res = await POST(new Request('http://local/api/vote', { method: 'POST', body: JSON.stringify({ billId: 9, choice: 'yes' }) }));
    const body = await res.json();
    const ok = res.status === status && body.error === error && JSON.stringify(world.writes) === JSON.stringify(writes);
    if (!ok) bad++;
    console.log(ok ? 'ok ' : 'BAD', name, '->', res.status, body.error ?? 'success', JSON.stringify(world.writes));
  }
  console.log(bad ? `${bad} of ${CASES.length} failed` : `all ${CASES.length} passed`);
  process.exit(bad ? 1 : 0);
})();
