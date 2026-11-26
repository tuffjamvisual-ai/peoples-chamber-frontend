// "Updated <date>" and "Period <period>" lines under data sections on MP, peer and council pages (owner, 4 Nov 2026):
// the newest sync stamp, or latest period, of the table a section reads. A failed read gives no line.
// A16 (owner rule 15 Nov 2026; F04 batch 1, T2's audit/t2-prep/f04-32-routes.md 2.1): each answer is kept in the shared
// data cache under its table's tag, plus the tags the calling section's own reads carry (council pages: council-data), with
// no timer (it was 6 hours, which made 6 hours the pages' own rebuild interval). It is read again only after the sync that
// writes the table refreshes one of those tags (refreshTables, refreshCouncilRoutes, apply-sql.js), or a deploy. The
// extra tags are in the key too, so callers with different tag sets never share an entry.
import 'server-only';
import { supabase } from '@/lib/supabase';
import { tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

// key: [column, codes] reads only those rows (the council's own, or for a county its districts'), so a date line is this
// council's, not the newest anywhere in the table (Cowork ENTRY 755 item 3 (d), T2-718 point (e)).
export type RowKey = [string, string[]];
const newestValue = (table: string, column: string, extraTags: string[] = [], key?: RowKey) =>
  tagged(['record-date-v3', table, column, ...(key ? [key[0], ...[...key[1]].sort()] : []), ...extraTags], [...tableTags(table), ...extraTags], async (): Promise<string | null> => {
    if (key && key[1].length === 0) return null;
    let q = supabase.from(table).select(column).not(column, 'is', null);
    if (key) q = key[1].length === 1 ? q.eq(key[0], key[1][0]) : q.in(key[0], key[1]);
    const { data, error } = await q.order(column, { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`${table}.${column}: ${error.message}`);
    const value = (data as Record<string, unknown> | null)?.[column];
    return value == null ? null : String(value);
  });

export const longDay = (value: string | Date) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

/** "3 November 2026" from the newest stamp in table.column, or null if there is none or it cannot be read. */
export async function updatedDate(table: string, column: string, extraTags: string[] = [], key?: RowKey): Promise<string | null> {
  try {
    const value = await newestValue(table, column, extraTags, key);
    return value ? longDay(value) : null;
  } catch (e) {
    console.error('record date:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** The newest period in table.column as readers write it ("2024/25"), or null. */
export async function latestPeriod(table: string, column: string, extraTags: string[] = [], key?: RowKey): Promise<string | null> {
  try {
    const value = await newestValue(table, column, extraTags, key);
    return value ? value.replace(/^(\d{4})-(\d{2})$/, '$1/$2') : null;
  } catch (e) {
    console.error('record date:', e instanceof Error ? e.message : e);
    return null;
  }
}
