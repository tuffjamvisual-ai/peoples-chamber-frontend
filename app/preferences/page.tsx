// One preferences page for members and newsletter subscribers (owner's decision 8, job 74).
// - Members (signed in): the weekly digest on or off, what they follow (one click unfollow), their saved searches
//   (rerun, alert on or off, delete), the newsletter, and "delete everything I follow".
// - Newsletter subscribers without an account: the link in their newsletter email (?nl=<token>) shows their
//   subscription and a one click unsubscribe.
// The digest's "Stop these emails" link lands here with ?digest=unsubscribed.
import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { supabaseAdmin } from '@/lib/supabase-admin';
import MemberPreferences from './MemberPreferences';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your preferences',
  description: 'Your weekly email, what you follow, your saved searches and the newsletter.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/preferences' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DIGEST_MESSAGES: Record<string, string> = {
  unsubscribed: 'The weekly email is off. Your follows are kept; turn the email back on below at any time.',
  invalid: 'That link did not work. Sign in to change your weekly email here.',
  error: 'Something went wrong. Please try the link again in a few minutes.',
};

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ digest?: string; nl?: string }> }) {
  const { digest, nl } = await searchParams;
  let subscriber: { status: string; token: string } | null = null;
  if (nl && UUID_RE.test(nl)) {
    const { data } = await supabaseAdmin.from('newsletter_subscribers').select('status, token').eq('token', nl).maybeSingle();
    if (data) subscriber = { status: String(data.status), token: String(data.token) };
  }
  const note = digest ? DIGEST_MESSAGES[digest] : undefined;

  return (
    <OpenGovShell pageStamp="Preferences">
      <BackLink
        fallbackHref="/account"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 16px', transform: 'rotate(-0.3deg)' }}>
        Your preferences
      </h1>
      {note && (
        <div role="status" style={{ margin: '0 0 24px', padding: '12px 14px', border: `1.5px solid ${ACCENT}`, borderLeft: `5px solid ${ACCENT}`, background: 'rgba(122,22,18,0.05)', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, maxWidth: '640px' }}>
          {note}
        </div>
      )}
      {nl && (
        <section style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, maxWidth: '640px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>opengovt Weekly</h2>
          {!subscriber ? (
            <p style={{ margin: 0 }}>That link did not work. It may have been copied incompletely. <Link href="/newsletter" style={{ color: ACCENT }}>Sign up again</Link>.</p>
          ) : subscriber.status === 'confirmed' ? (
            <p style={{ margin: 0 }}>
              You get the newsletter.{' '}
              <a href={`/api/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.token)}`} style={{ color: ACCENT }}>Unsubscribe in one click</a>.
            </p>
          ) : (
            <p style={{ margin: 0 }}>You do not get the newsletter. <Link href="/newsletter" style={{ color: ACCENT }}>Sign up again</Link>.</p>
          )}
        </section>
      )}
      <MemberPreferences />
    </OpenGovShell>
  );
}
