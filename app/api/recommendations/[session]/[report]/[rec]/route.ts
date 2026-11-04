import { NextResponse } from 'next/server';
import { RECOMMENDATIONS_PUBLIC, recommendationDetail, wording, effectiveStatus, documentWords, asPublished, targetPassed } from '@/lib/pac';

// One recommendation's history (owner, 4 Nov 2026), loaded when its card is opened on a phone: its status and the
// government's statements in date order, as on its own page. Cached for a day like that page; a failed read throws.
export const dynamic = 'force-static';
export const revalidate = 86400;

const RESPONSE: Record<string, string> = { agree: 'Agreed', partly: 'Partly agreed', disagree: 'Disagreed', notes: 'Noted' };
const target = (label: string, text: string | null, month: string | null) => (text ? `${label}: “${text}”${targetPassed(month) ? '. Target passed' : ''}` : null);
const paragraphs = (t: string | null) => asPublished(t).split('\n').map((x) => x.trim()).filter(Boolean);

export async function GET(_request: Request, { params }: { params: Promise<{ session: string; report: string; rec: string }> }) {
  const { session, report, rec } = await params;
  if (!RECOMMENDATIONS_PUBLIC || !/^\d{4}(-\d{2})?$/.test(session) || !/^\d{1,3}$/.test(report) || !/^\d{1,2}[a-z]?$/.test(rec)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const d = await recommendationDetail(session, Number(report), rec);
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const w = await wording([d.row, ...d.parts]);
  const status = w.words({ ...d.row, status: effectiveStatus(d.row) }).map((s) => s.text).join('');
  return NextResponse.json({
    status,
    events: d.events.map((e) => ({
      id: e.id,
      document: documentWords(e.document),
      href: `${e.document.url}${e.page ? `#page=${e.page}` : ''}`,
      page: e.page,
      response: e.response ? RESPONSE[e.response] ?? e.response : null,
      lines: [
        target('Target', e.target_text, e.target_month),
        target('Original target', e.original_target_text, e.original_target_month),
        target('Revised target', e.revised_target_text, e.revised_target_month),
        e.implemented_text ? (e.implemented_text === 'Recommendation implemented' ? 'Recommendation implemented' : `Recommendation implemented: “${e.implemented_text}”`) : null,
      ].filter(Boolean),
      words: [...paragraphs(e.response_text), ...paragraphs(e.progress_text)],
    })),
  });
}
