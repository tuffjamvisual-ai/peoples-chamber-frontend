// The end of a report (owner, 25 Nov 2026, Cowork ENTRY 667): Read next (three more reports) and the newsletter sign up, the
// site's own form with its own consent wording (NewsletterSignup; double opt in). Server component; no data of its own is
// collected and no cookie is set. Read next is chosen when the page is made.
import type { EditorialEntry } from '@/lib/editorials/types';
import { readNextReports } from '@/lib/read-next-reports';
import { relatedLinks } from './ExploreNext';
import NewsletterSignup from './NewsletterSignup';
import ReadNext from './ReadNext';

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.18)';

export default async function ReportEnd({ piece, lead = [] }: { piece: EditorialEntry; lead?: { href: string; label: string }[] }) {
  const shown = new Set((await relatedLinks(piece, lead)).map((l) => l.href));
  const links = await readNextReports(piece, shown);
  return (
    <>
      <ReadNext links={links} />
      <section aria-labelledby="report-newsletter" style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: '16px', margin: '8px 0 24px', maxWidth: '680px', color: INK }}>
        <h2 id="report-newsletter" style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 6px' }}>Weekly newsletter</h2>
        <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>opengovt Weekly brings you the most important investigations, overlooked documents, questionable claims and public spending stories from the week. Delivered every Sunday.</p>
        <NewsletterSignup source="article-end" minFontPx={15} />
      </section>
    </>
  );
}
