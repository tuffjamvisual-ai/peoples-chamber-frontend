// A fingerprint of a whole table or materialized view, for a job that rebuilds it in full (A16, owner rule 15 Nov 2026,
// COWORK-TO-T1 ENTRY 129): taken before and after the rebuild, the pages that read it are refreshed only if it differs.
// Rows are read in pages of 1,000 in a stable order, the given columns left out (refresh times), and hashed in order.
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function tableFingerprint(db: SupabaseClient, table: string, orderBy: string, leaveOut: string[] = []): Promise<string> {
  const hash = createHash('sha256');
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').order(orderBy, { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`fingerprint ${table}: ${error.message}`);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      for (const c of leaveOut) delete row[c];
      hash.update(JSON.stringify(row)); hash.update('\n');
    }
    if (!data || data.length < 1000) break;
  }
  return hash.digest('hex');
}
