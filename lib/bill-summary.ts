// The summary shown for a bill. Parliament's own text only: the bill's summary from the Bills
// API (bill.description), then its formal long title. The older AI-written plain_summary is
// no longer shown anywhere: the audit of 16 Oct 2026 (P9) found errors and guesses in it
// (e.g. the Tobacco and Vapes summary said "no one under 14"; another said "the specific
// amendments aren't detailed").
export function billSummary(b: { title?: string | null; description?: string | null; long_title?: string | null }): string {
  const title = (b.title || '').trim();
  for (const t of [b.description, b.long_title]) {
    const s = String(t ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (s && s.toLowerCase() !== 'no description available' && s !== title) return s;
  }
  return '';
}

// The summary as a bill card shows it, cut on the server so list pages don't ship whole long titles: at most `max`
// characters, ending at a word with "…". Same text as billSummary().
export const CARD_SUMMARY_MAX = 360;
export function cardSummary(b: { title?: string | null; description?: string | null; long_title?: string | null }, max = CARD_SUMMARY_MAX): string {
  const s = billSummary(b);
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const atWord = cut.lastIndexOf(' ');
  return (atWord > max * 0.6 ? cut.slice(0, atWord) : cut).replace(/[\s,;:.]+$/, '') + '…';
}

// Shown where a bill has no summary: Parliament publishes neither a summary nor a long title for some bills (checked
// against the Bills API on 20 Oct 2026 for the 61 such bills still before Parliament).
export const NO_SUMMARY_TEXT = 'Parliament has not published a summary for this bill.';

// "Committee stage, 1 September 2026": the bill's current stage and its date, as on the bill cards and the bill page.
// Either part alone if the other is missing; '' if both are. Dates in UTC so server and browser print the same day.
export function billStageLine(b: { current_stage?: string | null; stage_date?: string | null }): string {
  let date = '';
  if (b.stage_date) {
    const t = new Date(b.stage_date);
    if (!Number.isNaN(t.getTime())) date = t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return [b.current_stage?.trim(), date].filter(Boolean).join(', ');
}
