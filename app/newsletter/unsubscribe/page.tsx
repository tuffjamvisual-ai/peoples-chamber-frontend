// The page an unsubscribe link opens (security review L6, ENTRY 58 item 2): one button that unsubscribes. Opening the
// link changes nothing, so mail services' link checkers cannot unsubscribe anyone; the reader's click does.
import type { Metadata } from 'next';
import OpenGovShell from '../../components/OpenGovShell';
import { TOKEN_RE } from '@/lib/unsubscribe-request';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const ok = TOKEN_RE.test(token);
  return (
    <OpenGovShell pageStamp="Newsletter">
      <article style={{ fontFamily: FONT, color: INK, padding: 'clamp(15px, 2vw, 24px) 0', maxWidth: '46em' }}>
        <h1 style={{ fontFamily: FONT, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 'bold', margin: '0 0 12px' }}>Unsubscribe from opengovt Weekly</h1>
        {ok ? (
          <>
            <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 20px' }}>Press the button to stop receiving opengovt Weekly. You can sign up again at any time.</p>
            <form method="post" action={`/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`}>
              <input type="hidden" name="confirm" value="1" />
              <button type="submit" style={{ fontFamily: FONT, fontSize: '16px', minHeight: '44px', padding: '10px 20px', background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer' }}>Unsubscribe</button>
            </form>
          </>
        ) : (
          <p style={{ fontSize: '16px', lineHeight: 1.7, margin: 0 }}>That link did not work. It may have been copied incompletely. <a href="/newsletter" style={{ color: ACCENT }}>Go to the newsletter page</a>.</p>
        )}
      </article>
    </OpenGovShell>
  );
}
