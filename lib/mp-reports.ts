// Reports that name an MP (owner's approval, 24 Oct 2026): every published piece whose relatedMemberIds include the
// MP, newest first, read on their own under 'editorial-links:mp:<id>' (lib/editorials-source.ts), so the MP pages do
// not carry the 'editorials' tag. The profile shows the first MP_REPORTS_SHOWN; /mps/<id>/reports lists them all.
import { editorialsForMember } from '@/lib/editorials-source';
import { listSummary } from '@/lib/editorials/list-summary';
import { readingLabel } from '@/lib/reading-time';

export const MP_REPORTS_SHOWN = 10;

export type MpReportItem = { href: string; headline: string; date: string; readingLabel: string; summary: string };

export async function mpReportItems(memberId: number): Promise<MpReportItem[]> {
  return [...(await editorialsForMember(memberId))]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0))
    .map((e) => ({
      href: `/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`,
      headline: e.headline,
      date: new Date(e.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
      readingLabel: readingLabel(e),
      summary: listSummary(e),
    }));
}
