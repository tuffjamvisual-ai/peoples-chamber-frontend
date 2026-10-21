import { revalidatePath } from 'next/cache';

// After a bill sync writes: rebuild /bills, its later pages and the session archive on their next visit instead of
// waiting for their revalidate times (owner's approval, 21 Oct 2026). Called by the Vercel bill crons and, for the
// nightly GitHub sync, by /api/revalidate-bills.
export function revalidateBillPages(): string[] {
  revalidatePath('/bills');
  revalidatePath('/bills/page/[page]', 'page');
  revalidatePath('/bills/sessions');
  revalidatePath('/bills/sessions/[id]', 'page');
  return ['/bills', '/bills/page/[page]', '/bills/sessions', '/bills/sessions/[id]'];
}
