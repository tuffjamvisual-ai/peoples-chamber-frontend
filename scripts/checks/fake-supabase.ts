// An in-memory stand-in for the parts of the Supabase client the member features use (job 74), for the checks in
// scripts/checks/member-*.ts: they run the real code against rows held in memory, so nothing is read from or written
// to the database and no email is sent. Supports select (with count/head), eq, neq, in, gt, gte, lt, order, limit,
// maybeSingle, single, insert, update, upsert (onConflict) and delete, and records every query for inspection.
type Row = Record<string, unknown>;
type Filter = { op: 'eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt'; col: string; val: unknown };
export type QueryLog = { table: string; action: string; filters: Filter[] };

export function fakeSupabase(tables: Record<string, Row[]>, opts: { unique?: Record<string, string[][]> } = {}) {
  const log: QueryLog[] = [];
  const seq: Record<string, number> = {};
  const cmp = (a: unknown, b: unknown) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
  const num = (v: unknown) => (typeof v === 'number' ? v : v != null && /^-?\d+(\.\d+)?$/.test(String(v)) ? Number(v) : v);
  const match = (r: Row, f: Filter) => {
    const v = r[f.col];
    switch (f.op) {
      case 'eq': return num(v) === num(f.val) || v === f.val;
      case 'neq': return !(num(v) === num(f.val) || v === f.val);
      case 'in': return (f.val as unknown[]).some((x) => num(x) === num(v) || x === v);
      case 'gt': return v != null && cmp(v, f.val) > 0;
      case 'gte': return v != null && cmp(v, f.val) >= 0;
      case 'lt': return v != null && cmp(v, f.val) < 0;
    }
  };
  const uniqueClash = (table: string, row: Row, except?: Row) => {
    for (const cols of opts.unique?.[table] ?? []) {
      if ((tables[table] ?? []).some((r) => r !== except && cols.every((c) => num(r[c]) === num(row[c])))) return true;
    }
    return false;
  };

  function from(table: string) {
    tables[table] ??= [];
    const filters: Filter[] = [];
    let action = 'select';
    let payload: Row | Row[] | null = null;
    let onConflict: string | null = null;
    let wantCount = false, head = false, returnRows = false, single: 'one' | 'maybe' | null = null;
    let orderBy: { col: string; asc: boolean } | null = null;
    let limitN: number | null = null;

    const q: Record<string, unknown> = {};
    const chain = (fn: (...a: never[]) => void) => (...a: never[]) => { fn(...a); return q; };
    Object.assign(q, {
      select: chain(((_cols?: string, o?: { count?: string; head?: boolean }) => { if (action === 'select') { wantCount = !!o?.count; head = !!o?.head; } else returnRows = true; }) as never),
      eq: chain(((col: string, val: unknown) => filters.push({ op: 'eq', col, val })) as never),
      neq: chain(((col: string, val: unknown) => filters.push({ op: 'neq', col, val })) as never),
      in: chain(((col: string, val: unknown[]) => filters.push({ op: 'in', col, val })) as never),
      gt: chain(((col: string, val: unknown) => filters.push({ op: 'gt', col, val })) as never),
      gte: chain(((col: string, val: unknown) => filters.push({ op: 'gte', col, val })) as never),
      lt: chain(((col: string, val: unknown) => filters.push({ op: 'lt', col, val })) as never),
      order: chain(((col: string, o?: { ascending?: boolean }) => { orderBy = { col, asc: o?.ascending !== false }; }) as never),
      limit: chain(((n: number) => { limitN = n; }) as never),
      maybeSingle: chain((() => { single = 'maybe'; }) as never),
      single: chain((() => { single = 'one'; }) as never),
      insert: chain(((p: Row | Row[]) => { action = 'insert'; payload = p; }) as never),
      update: chain(((p: Row) => { action = 'update'; payload = p; }) as never),
      upsert: chain(((p: Row | Row[], o?: { onConflict?: string }) => { action = 'upsert'; payload = p; onConflict = o?.onConflict ?? null; }) as never),
      delete: chain((() => { action = 'delete'; }) as never),
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => { try { resolve(run()); } catch (e) { reject(e); } },
    });

    function run() {
      log.push({ table, action, filters: [...filters] });
      const rows = tables[table];
      const hit = rows.filter((r) => filters.every((f) => match(r, f)));
      if (action === 'select') {
        let out = [...hit];
        if (orderBy) { const { col, asc } = orderBy; out.sort((a, b) => (asc ? 1 : -1) * cmp(a[col], b[col])); }
        if (limitN != null) out = out.slice(0, limitN);
        if (single) {
          if (single === 'one' && out.length !== 1) return { data: null, error: { message: 'not one row', code: 'PGRST116' } };
          return { data: out[0] ?? null, error: null };
        }
        return { data: head ? null : out, error: null, count: wantCount ? hit.length : null };
      }
      if (action === 'insert') {
        const list = Array.isArray(payload) ? payload : [payload!];
        const made: Row[] = [];
        for (const p of list) {
          const row: Row = { id: (seq[table] = (seq[table] ?? 1000) + 1), created_at: new Date().toISOString(), ...p };
          if (uniqueClash(table, row)) return { data: null, error: { message: 'duplicate key', code: '23505' } };
          rows.push(row); made.push(row);
        }
        return { data: single ? made[0] : made, error: null };
      }
      if (action === 'upsert') {
        const list = Array.isArray(payload) ? payload : [payload!];
        const keys = (onConflict ?? 'id').split(',');
        for (const p of list) {
          const existing = rows.find((r) => keys.every((k) => num(r[k]) === num(p[k])));
          if (existing) Object.assign(existing, p);
          else rows.push({ id: (seq[table] = (seq[table] ?? 1000) + 1), created_at: new Date().toISOString(), ...p });
        }
        return { data: null, error: null };
      }
      if (action === 'update') {
        for (const r of hit) Object.assign(r, payload);
        return { data: returnRows ? hit.map((r) => ({ ...r })) : null, error: null };
      }
      // delete
      tables[table] = rows.filter((r) => !hit.includes(r));
      return { data: null, error: null };
    }
    return q;
  }
  return { client: { from } as unknown as import('@supabase/supabase-js').SupabaseClient, log, tables };
}
