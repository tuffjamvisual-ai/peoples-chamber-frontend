// One line to the archive search on a few landing pages (owner, 25 Nov 2026, Cowork ENTRY 667), in the homepage box's own
// words (ENTRY 503). Only while the archive is on (ARCHIVE_ENABLED, read when the page is made), so it never leads to a 404.
import Link from 'next/link';

const INK = '#14100d';
const ACCENT = '#7a1612';

export default function ArchiveLink() {
  if (process.env.ARCHIVE_ENABLED !== '1') return null;
  return (
    <p data-archive-link="" style={{ margin: '0 0 24px', padding: '10px 14px', border: `1.5px solid ${ACCENT}`, borderLeft: `5px solid ${ACCENT}`, background: 'rgba(107,36,23,0.05)', maxWidth: '680px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', lineHeight: 1.6, color: INK }}>
      <Link href="/archive" prefetch={false} style={{ color: INK, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Search opengovt archives</Link>
      : Hansard, answers and laws. Free account needed.
    </p>
  );
}
