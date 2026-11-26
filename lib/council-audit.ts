// The council's PSAA audit opinion rows (Cowork ENTRY 755 item 2, ENTRY 756), from public.council_audit_opinions
// (scripts/migrations/2026-11-26a-council-audit-opinions.sql). The words are in lib/council-audit-words.ts.
import { tagDb, COUNCIL_DATA_TAG } from '@/lib/page-reads';
import type { AuditRow } from '@/lib/council-audit-words';
export * from '@/lib/council-audit-words';

/** The council's rows, newest year first; [] when there are none or the table cannot be read (the section is then left out). */
export async function loadAudit(gssCode: string | null): Promise<AuditRow[]> {
  if (!gssCode || !gssCode.startsWith('E')) return [];
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('council_audit_opinions')
    .select('year, status, signed_date, firm, source_month, source_url').eq('gss', gssCode).order('year', { ascending: false });
  if (error) { console.error('council_audit_opinions:', error.message); return []; }
  return (data ?? []) as AuditRow[];
}

