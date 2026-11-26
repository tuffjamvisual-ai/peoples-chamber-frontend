// The words for PSAA audit opinion statuses (Cowork ENTRY 755 item 2, wording ENTRY 756), apart from the database read so they
// can be tested. PSAA gives whether, when and how an opinion was signed, and by which firm; it does not give the type of
// opinion, and nothing here names one.
/** '24 February 2026' from a date (YYYY-MM-DD), as the page's other dates. */
export const dayText = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

export type AuditRow = { year: string; status: string; signed_date: string | null; firm: string; source_month: string; source_url: string };

// PSAA's statuses in plain words. The backstop sentence is ENTRY 756's, word for word.
export const AUDIT_STATUS_WORDS: Record<string, string> = {
  'Delivered On Time': 'Opinion signed on time',
  'Late Opinion Delivered': 'Opinion signed late',
  'Delivered by backstop': 'Signed under the national backstop',
  'Post backstop opinion delivered': 'Opinion signed after the backstop date',
  Unsigned: 'No audit opinion signed yet',
};
export const BACKSTOP_NOTE = 'Signed under the national backstop: auditors had to give an opinion by a set date, which was often before the audit could be completed. This status does not show what the auditor found; the auditor’s report does.';

export const yearText = (y: string) => y.replace('-', '/');
export const sourceMonthText = (d: string) => new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Europe/London' });

/** One line for a year: '2024/25 accounts: signed under the national backstop, 24 February 2026 (Azets Audit Services Limited)'. */
export function auditLine(r: AuditRow): string {
  const words = AUDIT_STATUS_WORDS[r.status] ?? r.status;
  if (r.status === 'Unsigned') return `${yearText(r.year)} accounts: no audit opinion signed yet`;
  return `${yearText(r.year)} accounts: ${words.charAt(0).toLowerCase()}${words.slice(1)}${r.signed_date ? `, ${dayText(r.signed_date)}` : ''} (${r.firm})`;
}

/** The latest year, and when it is unsigned the latest year that was signed too. */
export function latestAudit(rows: AuditRow[]): AuditRow[] {
  if (rows.length === 0) return [];
  if (rows[0].status !== 'Unsigned') return [rows[0]];
  const signed = rows.find((r) => r.status !== 'Unsigned');
  return signed ? [rows[0], signed] : [rows[0]];
}
