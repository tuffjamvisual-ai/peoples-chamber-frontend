// Reader-facing data freshness line. Reads the newest row timestamp for a
// configured source (lib/data-freshness) and prints when the data was last
// updated, plus its plain-text source. For a transparency site, publishing the
// freshness of our own data turns a silent stall into something the reader sees.
//
// Small text stays full-black (#14100d, opacity 1) per house rule; the source is
// plain text, never an offsite link.

import { dataSource, newestTimestamp } from '@/lib/data-freshness';

// `at`: a page's own date for the line instead of the table wide newest row (owner, 30 Oct 2026: a bill's Lords line
// uses that bill's newest division, so a week long page does not read a table wide time that changes daily).
export default async function LastUpdated({ sourceKey, at }: { sourceKey: string; at?: string | null }) {
  const src = dataSource(sourceKey);
  if (!src) return null;
  const newest = at !== undefined ? (at ? new Date(at) : null) : await newestTimestamp(src);
  if (!newest) return null;

  const when = newest.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <p
      style={{
        fontFamily: 'var(--font-special-elite), monospace',
        fontSize: '15px',
        color: '#14100d',
        opacity: 1,
        margin: '18px 0 0',
      }}
    >
      {src.label} last updated {when}. Source: {src.source}.
    </p>
  );
}
