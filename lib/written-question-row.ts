// One written question from Parliament's API as a row of parliament_written_questions. Shared by /api/sync-parliament-archive and
// scripts/backfill-written-question-fields.ts. The withdrawn flag comes through as is; Parliament publishes no date for a withdrawal.
// Plain text from Hansard and answer HTML: paragraphs kept as blank lines, tags dropped, entities decoded.
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', pound: '£' };
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type WQ = { id: number; uin: string; house: string; dateTabled: string | null; dateAnswered: string | null; askingMemberId: number | null; answeringMemberId: number | null; answeringBodyId: number | null; answeringBodyName: string | null; heading: string | null; questionText: string | null; answerText: string | null; isWithdrawn: boolean | null; dateHoldingAnswer?: string | null; dateAnswerCorrected?: string | null; originalAnswerText?: string | null; attachments?: unknown[] | null };

// The question's page on Parliament's site, from the day it was tabled and its uin. Also used by the details only table
// (lib/written-questions-details.ts, WQ1), so both build it the same way.
export function writtenQuestionUrl(tabled: string | null, uin: string | null | undefined): string | null {
  return tabled && uin ? `https://questions-statements.parliament.uk/written-questions/detail/${tabled}/${uin}` : null;
}

export function questionRow(q: WQ): Record<string, unknown> {
  const tabled = q.dateTabled ? q.dateTabled.slice(0, 10) : null;
  return {
    id: q.id, uin: q.uin, house: q.house, date_tabled: tabled, date_answered: q.dateAnswered ? q.dateAnswered.slice(0, 10) : null,
    asking_member_id: q.askingMemberId, answering_member_id: q.answeringMemberId, answering_body_id: q.answeringBodyId,
    answering_body: q.answeringBodyName, heading: q.heading, question_text: htmlToText(q.questionText),
    answer_text: q.answerText ? htmlToText(q.answerText) : null, answer_html: q.answerText, is_withdrawn: q.isWithdrawn,
    url: tabled ? writtenQuestionUrl(tabled, q.uin) : null,
    date_holding_answer: q.dateHoldingAnswer ? q.dateHoldingAnswer.slice(0, 10) : null,
    date_answer_corrected: q.dateAnswerCorrected ? q.dateAnswerCorrected.slice(0, 10) : null,
    original_answer_html: q.originalAnswerText || null,
    attachments: q.attachments?.length ? q.attachments : null,
    fetched_at: new Date().toISOString(),
  };
}

