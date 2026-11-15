// One cache tag per data source (A16, owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129). A source is a table (or an rpc's
// table). Every page read carries the tags of the tables it reads (lib/tagged-read.ts); the sync that writes a table calls
// refreshTables(<table>, ...) only after it really changed rows (inserted, deleted, or updated with a different value).
import { revalidateTag } from '@/lib/refresh-count';

// Tables that already had a tag in use keep it, so the syncs and pages that use it now stay right.
const EXISTING: Record<string, string> = {
  political_donations: 'political-donations',
  // Views and stored copies made from bill, refreshed in the same runs that change bills (refresh_bill_stores).
  bill_current: 'table:bill', bill_in_session_stored: 'table:bill', parliament_session_bill_counts_stored: 'table:bill',
  historic_commons_divisions: 'historic-archive', historic_commons_votes: 'historic-archive',
  register_archive_entries: 'historic-archive', register_archive_entry_editions: 'historic-archive',
};
export const tableTag = (table: string) => EXISTING[table] ?? `table:${table}`;
export const tableTags = (...tables: string[]) => [...new Set(tables.map(tableTag))];

// After a real change: refresh every page that read these tables (counted through lib/refresh-count).
export function refreshTables(...tables: string[]) {
  for (const t of tableTags(...tables)) revalidateTag(t, 'max');
}

export const DIVISION_TABLES = ['mp_division_votes', 'commons_division_totals', 'commons_divisions_fts'];
export const SI_TABLES = ['statutory_instrument', 'statutory_instruments', 'treaties'];
