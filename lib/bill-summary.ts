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
