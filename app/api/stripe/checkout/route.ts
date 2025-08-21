import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/app/lib/stripe/stripe-server';
import { auth } from '@/app/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { priceId } = await request.json();
    
    // Get user from session/token (you'll need to implement this based on your auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`;

    const sessionUrl = await createCheckoutSession(
      userId,
      priceId,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({ url: sessionUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}