// The text an article list shows under a headline: the piece's one sentence summary, or its standfirst when it has
// none. The article page itself always shows the full standfirst.
export function listSummary(e: { summary?: string | null; standfirst?: string | null }): string {
  return e.summary || e.standfirst || '';
}
