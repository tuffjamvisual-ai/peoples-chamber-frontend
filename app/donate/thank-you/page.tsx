import type { Metadata } from 'next';
import Stripe from 'stripe';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thank you',
  description: 'Thank you for supporting The People’s Chamber.',
  alternates: { canonical: '/donate/thank-you' },
};

const INK = '#14100d';

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let amount: number | null = null;
  let paid = false;

  const key = process.env.STRIPE_SECRET_KEY;
  if (key && session_id) {
    try {
      const session = await new Stripe(key).checkout.sessions.retrieve(session_id);
      paid = session.payment_status === 'paid';
      if (session.amount_total) amount = session.amount_total / 100;
    } catch {
      // fall through to a generic thank-you if the session can't be retrieved
    }
  }

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back to the front page"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)' }}>
          Thank you
        </h1>
        <p style={{ fontSize: '18px', lineHeight: 1.8, maxWidth: '720px' }}>
          {paid
            ? `Your donation${amount ? ` of £${amount.toFixed(2)}` : ''} has gone through. Thank you for supporting The People’s Chamber and helping keep it free and independent.`
            : 'Thank you for supporting The People’s Chamber. If your payment completed, it will appear on your statement shortly.'}
        </p>
      </header>
    </DossierShell>
  );
}
