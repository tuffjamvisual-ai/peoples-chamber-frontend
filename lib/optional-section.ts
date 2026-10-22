// Optional page sections (owner's approval, 22 Oct 2026): a read next box, a related links list or a side panel
// that cannot be read is left out and its error logged, instead of failing the whole page. Core figures keep the
// existing rule (a failed read throws, so a page built ahead keeps its last good version rather than show wrong or
// missing figures). Sections treated as optional: the read next boxes (lib/read-next.ts: news, editorials, debates),
// RelatedLinks (every variant) and ServiceIndicator (the services panel on topic pages).

export async function optionalSection<T>(label: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (e) {
    console.error(`[optional section hidden] ${label}: ${e instanceof Error ? e.message : String(e)}`);
    return fallback;
  }
}
