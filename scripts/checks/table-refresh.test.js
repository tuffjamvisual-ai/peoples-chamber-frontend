// Mock test of scripts/lib/table-refresh.js (A16, ENTRY 139 item 4): no network, no database. node scripts/checks/table-refresh.test.js
const path = require('path').resolve(__dirname, '../..');
const rs = require(path + '/scripts/lib/refresh-site.js');
const calls = []; rs.refreshTableTags = async (t) => { calls.push(t); return { sent: t.length, status: 200 }; };
const { trackTables, _setPrimaryKeys } = require(path + '/scripts/lib/table-refresh.js');
_setPrimaryKeys({ a: ['id'], b: ['id'] });
const store = { a: [{ id: 1, v: 1, updated_at: 'x' }], b: [{ id: 1, v: 1 }] };
class B { constructor(t, op, arg) { this.t = t; this.op = op; this.arg = arg; this.r = null; }
  select() { return this; } order() { return this; } range(f, to) { this.r = [f, to]; return this; } eq() { return this; }
  then(ok, err) { try { let res;
    if (this.op === 'read') res = { data: JSON.parse(JSON.stringify(store[this.t].slice(this.r ? this.r[0] : 0, this.r ? this.r[1] + 1 : undefined))), error: null };
    else if (this.op === 'upsert') { for (const row of this.arg) { const i = store[this.t].findIndex((x) => x.id === row.id); if (i >= 0) store[this.t][i] = row; else store[this.t].push(row); } res = { data: null, error: null }; }
    return Promise.resolve(res).then(ok, err); } catch (e) { return Promise.reject(e).then(ok, err); } } }
const db = { from: (t) => ({ select: () => new B(t, 'read'), upsert: (rows) => new B(t, 'upsert', rows) }) };
(async () => {
  const s = trackTables(db, () => {});
  await s.from('a').upsert([{ id: 1, v: 1, updated_at: 'y' }]);          // only updated_at differs: unchanged
  await s.from('b').upsert([{ id: 2, v: 5 }]).select();                   // new row: changed
  const { data } = await s.from('a').select('*').range(0, 10);            // reads pass through
  const r = await s.finishRefresh();
  const ok = JSON.stringify(r.changed) === '["b"]' && calls.length === 1 && calls[0][0] === 'b' && data.length === 1 && store.b.length === 2;
  const s2 = trackTables(db, () => {}); const r2 = await s2.finishRefresh();  // dry run: nothing written
  console.log(ok && r2.changed.length === 0 && calls.length === 1 ? 'PASS' : 'FAIL ' + JSON.stringify({ r, calls, r2 }));
})();
