// The end of a report (owner, 25 Nov 2026, Cowork ENTRY 667, 669, 670): the newsletter sign up under the Related list, the site's
// own form with its own consent wording (NewsletterSignup: double opt in, 'Email only, no account needed...'). Server component;
// no new data is collected and no cookie is set; nothing is asked until the reader sends the form.
import NewsletterSignup from './NewsletterSignup';

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.18)';

export default function ReportEnd() {
  return (
    <section aria-labelledby="report-newsletter" style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: '16px', margin: '8px 0 24px', color: INK }}>
      <h2 id="report-newsletter" style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 6px' }}>Weekly newsletter</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>opengovt Weekly brings you the most important investigations, overlooked documents, questionable claims and public spending stories from the week. Delivered every Sunday.</p>
      <NewsletterSignup source="article-end-editorials" minFontPx={15} />
    </section>
  );
}
