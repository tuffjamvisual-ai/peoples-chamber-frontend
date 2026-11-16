// A16 (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 139 item 4): a script that writes tables the site shows refreshes their
// tags itself, and only when rows really changed, so nobody has to remember scripts/revalidate.js.
//
//   const supabase = trackTables(createClient(...));   every table the script writes through this client is noted
//   ...
//   await supabase.finishRefresh();                      at the end: refresh the tags of the tables that changed
//
// "Really changed": before the first write to a table, the whole table is fingerprinted (every row in primary key
// order, refresh-time columns left out); finishRefresh() fingerprints it again and refreshes only the tables whose
// fingerprint differs. A dry run writes nothing, so it reads nothing extra and refreshes nothing. The primary key is
// read once from the database's own API description (PostgREST), so no table list has to be kept by hand.
const crypto = require('crypto');
const { refreshTableTags } = require('./refresh-site');

const WRITES = new Set(['insert', 'upsert', 'update', 'delete']);
const LEAVE_OUT = new Set(['updated_at', 'refreshed_at', 'fetched_at', 'synced_at', 'last_seen_date', 'checked_at']);
const PAGE = 1000;

let pkCache = null;
async function primaryKeys() {
  if (pkCache) return pkCache;
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  const key = process.env.SUPABASE_SECRET_KEY;
  const r = await fetch(url, { headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/openapi+json' } });
  if (!r.ok) throw new Error(`table-refresh: API description HTTP ${r.status}`);
  const spec = await r.json();
  pkCache = {};
  for (const [name, def] of Object.entries(spec.definitions || {})) {
    pkCache[name] = Object.entries(def.properties || {})
      .filter(([, p]) => /<pk\/>/.test(p.description || ''))
      .map(([col]) => col);
  }
  return pkCache;
}

async function fingerprint(db, table) {
  const pks = (await primaryKeys())[table] || [];
  if (!pks.length) throw new Error(`table-refresh: no primary key found for ${table}`);
  const hash = crypto.createHash('sha256');
  let rows = 0;
  for (let from = 0; ; from += PAGE) {
    let q = db.from(table).select('*');
    for (const c of pks) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(`table-refresh fingerprint ${table}: ${error.message}`);
    for (const row of data || []) {
      for (const c of LEAVE_OUT) delete row[c];
      hash.update(JSON.stringify(row)); hash.update('\n');
    }
    rows += (data || []).length;
    if (!data || data.length < PAGE) break;
  }
  return `${rows}:${hash.digest('hex')}`;
}

function trackTables(db, log = console.log) {
  const before = new Map(); // table -> Promise<fingerprint>
  const raw = db.from.bind(db);
  const wrapBuilder = (builder, table) => new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        return (onOk, onErr) => before.get(table).then(() => target.then(onOk, onErr), onErr);
      }
      const v = Reflect.get(target, prop, target);
      if (typeof v !== 'function') return v;
      return (...args) => {
        const out = v.apply(target, args);
        if (out === target) return receiver; // a chained call on the same builder stays wrapped
        return out && typeof out.then === 'function' ? wrapBuilder(out, table) : out;
      };
    },
  });
  const from = (table) => {
    const q = raw(table);
    return new Proxy(q, {
      get(target, prop) {
        const v = Reflect.get(target, prop, target);
        if (typeof v !== 'function' || !WRITES.has(prop)) return typeof v === 'function' ? v.bind(target) : v;
        return (...args) => {
          if (!before.has(table)) before.set(table, fingerprint(db, table).catch((e) => { log(`Could not fingerprint ${table} before writing (${e.message}); it will be refreshed.`); return `unknown:${Math.random()}`; }));
          return wrapBuilder(v.apply(target, args), table);
        };
      },
    });
  };
  async function finishRefresh() {
    const changed = [];
    for (const [table, was] of before) {
      try {
        if ((await was) !== (await fingerprint(db, table))) changed.push(table);
      } catch (e) {
        log(`Could not compare ${table} (${e.message}); refreshing it to be safe.`);
        changed.push(table);
      }
    }
    if (!before.size) return { written: [], changed: [] };
    if (!changed.length) { log(`Tables written (${[...before.keys()].join(', ')}) are unchanged: no site refresh needed.`); return { written: [...before.keys()], changed }; }
    await refreshTableTags(changed, log);
    return { written: [...before.keys()], changed };
  }
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'from') return from;
      if (prop === 'finishRefresh') return finishRefresh;
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

module.exports = { trackTables, fingerprint, _setPrimaryKeys: (m) => { pkCache = m; } };
