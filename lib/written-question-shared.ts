// Written question constants, types and the record link, for server and browser code alike (split from
// lib/mp-written-questions.ts, 15 Nov 2026: that file's cached reads use server-only next/cache code).
export const QUESTIONS_PER_PAGE = 25;
export const QUESTION_COLUMNS = 'id, uin, date_tabled, date_answered, answering_body, heading, url, is_withdrawn';

export type WrittenQuestion = {
  id: number;
  uin: string;
  date_tabled: string | null;
  date_answered: string | null;
  answering_body: string | null;
  heading: string | null;
  url: string | null;
  is_withdrawn: boolean | null;
};
export type QuestionsSummary = { total: number; firstDate: string | null; recent: WrittenQuestion[] };
export type House = 'Commons' | 'Lords';


// The official record: the stored URL, or the Parliament written question page built from the date and UIN.
export function questionUrl(q: Pick<WrittenQuestion, 'url' | 'date_tabled' | 'uin'>): string | null {
  if (q.url) return q.url;
  return q.date_tabled && q.uin ? `https://questions-statements.parliament.uk/written-questions/detail/${q.date_tabled}/${q.uin}` : null;
}
