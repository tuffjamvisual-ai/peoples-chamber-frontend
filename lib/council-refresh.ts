// Council pages refreshed by their syncs (owner, 30 Oct 2026, cache Stage 2a part 4). /councils/[slug], /schools and
// /sewage keep for a week; no council sync knows which council changed (each loads a national release for every
// council), so on a real new release it sends the council route as one pattern, plus /schools or /sewage where its
// data is shown there. Counted for the refresh record (lib/refresh-count.ts).
import { revalidatePath, revalidateTag, noteChanged } from '@/lib/refresh-count';
import { COUNCIL_DATA_TAG } from '@/lib/page-reads';

export function refreshCouncilRoutes(rowsWritten: number, also: { schools?: boolean; sewage?: boolean } = {}): string[] {
  noteChanged(rowsWritten);
  if (rowsWritten <= 0) return [];
  const paths = ['/councils/[slug]', '/councils/[slug]/panel/[tab]', ...(also.schools ? ['/councils/[slug]/schools'] : []), ...(also.sewage ? ['/councils/[slug]/sewage'] : [])];
  for (const p of paths) revalidatePath(p, 'page');
  revalidateTag(COUNCIL_DATA_TAG, 'max'); // A16: every council page's reads
  return paths;
}
