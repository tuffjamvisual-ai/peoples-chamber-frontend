import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// One-off donation checkout. Creates a Stripe Checkout Session (mode: payment)
// and returns the hosted-checkout URL. No recurring billing, no accounts.
// The amount is validated server-side in case the client payload is tampered with.

const MIN_PENCE = 100; // £1 floor
const MAX_PENCE = 1_000_000; // £10,000 ceiling
// Fixed return addresses: never built from the request's Origin header, which any site posting here could set.
const SUCCESS_URL = 'https://www.opengovt.uk/donate/thank-you?session_id={CHECKOUT_SESSION_ID}';
const CANCEL_URL = 'https://www.opengovt.uk/donate';

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: 'Donations are not configured yet.' }, { status: 500 });

  let amountPence: number;
  try {
    const body = await req.json();
    amountPence = Math.round(Number(body?.amount)); // client sends pence
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!Number.isFinite(amountPence) || amountPence < MIN_PENCE || amountPence > MAX_PENCE) {
    return NextResponse.json({ error: 'Please choose an amount between £1 and £10,000.' }, { status: 400 });
  }

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amountPence,
            product_data: { name: "Donation to opengovt" },
          },
        },
      ],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Checkout failed.' }, { status: 502 });
  }
}
