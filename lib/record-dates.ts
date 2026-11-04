// "Updated <date>" and "Period <period>" lines under data sections on MP, peer and council pages (owner, 4 Nov 2026):
// the newest sync stamp, or latest period, of the table a section reads. Each answer is kept for 6 hours and shared by
// every page, so a table is read about four times a day however many pages are rendered. A failed read gives no line.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

const newestValue = unstable_cache(async (table: string, column: string): Promise<string | null> => {
  const { data, error } = await supabase.from(table).select(column).not(column, 'is', null).order(column, { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`${table}.${column}: ${error.message}`);
  const value = (data as Record<string, unknown> | null)?.[column];
  return value == null ? null : String(value);
}, ['record-date'], { revalidate: 21600 });

export const longDay = (value: string | Date) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

/** "3 November 2026" from the newest stamp in table.column, or null if there is none or it cannot be read. */
export async function updatedDate(table: string, column: string): Promise<string | null> {
  try {
    const value = await newestValue(table, column);
    return value ? longDay(value) : null;
  } catch (e) {
    console.error('record date:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** The newest period in table.column as readers write it ("2024/25"), or null. */
export async function latestPeriod(table: string, column: string): Promise<string | null> {
  try {
    const value = await newestValue(table, column);
    return value ? value.replace(/^(\d{4})-(\d{2})$/, '$1/$2') : null;
  } catch (e) {
    console.error('record date:', e instanceof Error ? e.message : e);
    return null;
  }
}
