// Replace one group of rows (for example one department's ministers) without ever leaving the group empty
// (Fable review finding 5, owner approved 14 Nov 2026 under COWORK-TO-T1 ENTRY 51 and 57).
//
// The syncs used to delete the group and then insert the new rows, reading neither error: a failed insert left a
// department with no ministers until the next good run. Now: the old rows' ids are read, the new rows are inserted
// (every batch's error read), and only then are the old rows deleted by id. If an insert fails, the rows already
// inserted are removed again and the old rows stay; if the delete fails, the error is raised (the group briefly holds
// both sets, never none). Every failure throws a ReplaceRowsError, so the caller can answer 500.
import type { SupabaseClient } from '@supabase/supabase-js';

export class ReplaceRowsError extends Error {}

const BATCH = 100;
const DELETE_CHUNK = 200;

async function oldIds(db: SupabaseClient, table: string, col: string, val: string): Promise<number[]> {
  const ids: number[] = [];
  for (let last = 0; ; ) {
    const { data, error } = await db.from(table).select('id').eq(col, val).gt('id', last).order('id', { ascending: true }).limit(1000);
    if (error) throw new ReplaceRowsError(`${table} read ${col}=${val}: ${error.message}`);
    const rows = (data ?? []) as { id: number }[];
    ids.push(...rows.map((r) => r.id));
    if (rows.length < 1000) return ids;
    last = rows[rows.length - 1].id;
  }
}

async function deleteIds(db: SupabaseClient, table: string, ids: number[]): Promise<string | null> {
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const { error } = await db.from(table).delete().in('id', ids.slice(i, i + DELETE_CHUNK));
    if (error) return error.message;
  }
  return null;
}

export async function replaceRows(
  db: SupabaseClient,
  table: string,
  match: { col: string; val: string },
  rows: Record<string, unknown>[],
): Promise<{ inserted: number; deleted: number }> {
  const before = await oldIds(db, table, match.col, match.val);
  const added: number[] = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const { data, error } = await db.from(table).insert(rows.slice(i, i + BATCH)).select('id');
    if (error) {
      const undo = await deleteIds(db, table, added);
      throw new ReplaceRowsError(`${table} insert ${match.col}=${match.val}: ${error.message}; old rows kept${undo ? `; removing the ${added.length} rows already inserted also failed: ${undo}` : ''}`);
    }
    added.push(...((data ?? []) as { id: number }[]).map((r) => r.id));
  }
  const failed = await deleteIds(db, table, before);
  if (failed) throw new ReplaceRowsError(`${table} delete old rows ${match.col}=${match.val}: ${failed}; new rows written, old rows not all removed`);
  return { inserted: added.length, deleted: before.length };
}
