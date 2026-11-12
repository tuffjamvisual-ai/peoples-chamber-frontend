// The 'Checked GOV.UK at' line's wording (T1-PR); kept apart from lib/press-sync-checked.ts so it can be tested without the server.
// 'Checked GOV.UK at 09:17, 12 November', UK time.
export function checkedLine(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
  const day = d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long' });
  return `Checked GOV.UK at ${time}, ${day}`;
}
