// The period an MP's attendance figure covers (Search Console, Cowork ENTRY 364 item 4, owner approved 19 Nov 2026).
// mp_activity_metrics counts each MP's eligible divisions from the later of 4 July 2024 and the start of their current
// spell (migration 2026-10-24a), so an MP who took their seat after the general election is labelled with that date
// ('Votes attended since taking their seat on 18 June 2026'), not 'since July 2024'.
export const PARLIAMENT_START = '2024-07-04';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function attendanceSince(startDate: string | null | undefined): string {
  const d = (startDate ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= PARLIAMENT_START) return 'since July 2024';
  return `since taking their seat on ${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
}
