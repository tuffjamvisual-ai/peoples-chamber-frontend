// Reports that name an MP (owner's approval, 24 Oct 2026): every published piece whose relatedMemberIds include the
// MP, newest first, from the editorial registry at build time (no database query). The profile shows the first
// MP_REPORTS_SHOWN; /mps/<id>/reports lists them all.
import { editorials } from '@/lib/editorials';
import { listSummary } from '@/lib/editorials/list-summary';

export const MP_REPORTS_SHOWN = 10;

export type MpReportItem = { href: string; headline: string; date: string; summary: string };

export function mpReportItems(memberId: number): MpReportItem[] {
  return Object.values(editorials)
    .filter((e) => (e.relatedMemberIds ?? []).includes(memberId))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0))
    .map((e) => ({
      href: `/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`,
      headline: e.headline,
      date: new Date(e.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
      summary: listSummary(e),
    }));
}
