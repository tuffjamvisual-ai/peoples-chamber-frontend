// Pages to refresh when the archive sync writes a new or changed written answer (owner, 6 Nov 2026). Only the member who
// asked: the pages list questions by asking member. An MP has /mps/<id> and /mps/<id>/questions, a peer /lords/<id> and /lords/<id>/questions.
export type AnswerRow = { id: number; house: string | null; asking_member_id: number | null };

export function answerPaths(rows: AnswerRow[]): { members: number; paths: string[] } {
  const paths = new Set<string>();
  const members = new Set<string>();
  for (const r of rows) {
    const id = r.asking_member_id;
    if (!id || !Number.isInteger(id) || id <= 0) continue;
    if (r.house === 'Commons') { paths.add(`/mps/${id}`); paths.add(`/mps/${id}/questions`); }
    else if (r.house === 'Lords') { paths.add(`/lords/${id}`); paths.add(`/lords/${id}/questions`); }
    else continue;
    members.add(`${r.house}:${id}`);
  }
  // Each question's own page too (/questions/<id>).
  for (const r of rows) paths.add(`/questions/${r.id}`);
  return { members: members.size, paths: [...paths] };
}

type Stored = { date_answered: string | null; answer_html: string | null; is_withdrawn: boolean | null; heading: string | null; answering_body: string | null; date_holding_answer: string | null; date_answer_corrected: string | null };

// Whether a question just read holds an answer we did not have. A new question with no answer yet is not one.
export function answerChanged(next: Record<string, unknown>, held: Stored | undefined): boolean {
  if (!held) return !!(next.date_answered || next.answer_html);
  return (['date_answered', 'answer_html', 'is_withdrawn', 'heading', 'answering_body', 'date_holding_answer', 'date_answer_corrected'] as const).some((k) => (held[k] ?? null) !== (next[k] ?? null));
}
