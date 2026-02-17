import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', success: false },
        { status: 400 }
      );
    }

    // Get the payment intent ID
    const paymentIntentId = session.payment_intent;

    return NextResponse.json({
      success: true,
      paymentIntentId,
      amountPaid: session.amount_total / 100,
      customerEmail: session.customer_details?.email,
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment', success: false },
      { status: 500 }
    );
  }
}
