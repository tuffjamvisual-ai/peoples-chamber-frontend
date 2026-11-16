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

const newestValue = (table: string, column: string, extraTags: string[] = []) =>
  tagged(['record-date-v2', table, column, ...extraTags], [...tableTags(table), ...extraTags], async (): Promise<string | null> => {
    const { data, error } = await supabase.from(table).select(column).not(column, 'is', null).order(column, { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`${table}.${column}: ${error.message}`);
    const value = (data as Record<string, unknown> | null)?.[column];
    return value == null ? null : String(value);
  });

export const longDay = (value: string | Date) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

/** "3 November 2026" from the newest stamp in table.column, or null if there is none or it cannot be read. */
export async function updatedDate(table: string, column: string, extraTags: string[] = []): Promise<string | null> {
  try {
    const value = await newestValue(table, column, extraTags);
    return value ? longDay(value) : null;
  } catch (e) {
    console.error('record date:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** The newest period in table.column as readers write it ("2024/25"), or null. */
export async function latestPeriod(table: string, column: string, extraTags: string[] = []): Promise<string | null> {
  try {
    const value = await newestValue(table, column, extraTags);
    return value ? value.replace(/^(\d{4})-(\d{2})$/, '$1/$2') : null;
  } catch (e) {
    console.error('record date:', e instanceof Error ? e.message : e);
    return null;
  }
}
