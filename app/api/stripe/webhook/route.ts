import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/app/lib/stripe/stripe-server';
import { adminDb } from '@/app/lib/firebase-admin';
import { getPlanByPriceId } from '@/app/config/plans';

// Type guards to safely access properties
function hasSubscriptionId(obj: any): obj is {
  amount_paid: number;
  currency: string;
  id: any; subscription: string | Stripe.Subscription 
} {
  return obj && obj.subscription !== undefined;
}

function hasCurrentPeriodEnd(obj: any): obj is {
  cancel_at_period_end: boolean; current_period_end: number 
} {
  return obj && typeof obj.current_period_end === 'number';
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const eventData = event.data.object as any; // Use any for flexibility

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = eventData;
        const userId = session.metadata?.userId;
        
        if (userId && session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            
            const updateData: any = {
              subscription: 'pro', // Default to pro for any paid subscription
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: session.customer,
              credits: 100, // Default credits
              subscriptionStatus: subscription.status,
              updatedAt: new Date(),
            };
            
            // Safely add current_period_end if it exists
            if (hasCurrentPeriodEnd(subscription)) {
              updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            }
            
            await adminDb.collection('users').doc(userId).update(updateData);
          } catch (subError) {
            console.error('Error processing subscription:', subError);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = eventData;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          const isDeleted = event.type === 'customer.subscription.deleted';
          
          const updateData: any = {
            subscription: isDeleted ? 'free' : 'pro',
            credits: isDeleted ? 5 : 100,
            subscriptionStatus: isDeleted ? 'canceled' : subscription.status,
            updatedAt: new Date(),
          };
          
          if (isDeleted) {
            updateData.stripeSubscriptionId = null;
          }
          
          // Safely add current_period_end if it exists and not deleted
          if (!isDeleted && hasCurrentPeriodEnd(subscription)) {
            updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            updateData.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
          }
          
          await adminDb.collection('users').doc(userId).update(updateData);
        }
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = eventData;
        
        // Safely handle subscription field
        if (hasSubscriptionId(invoice)) {
          try {
            const subscriptionId = typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription?.id;
            
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const userId = subscription.metadata?.userId;
              
              if (userId) {
                if (event.type === 'invoice.payment_succeeded') {
                  await adminDb.collection('users').doc(userId).update({
                    credits: 100, // Reset credits
                    lastPayment: new Date(),
                    subscriptionStatus: 'active',
                    updatedAt: new Date(),
                  });
                  
                  // Log payment
                  await adminDb.collection('payments').add({
                    userId,
                    amount: invoice.amount_paid || 0,
                    currency: invoice.currency || 'usd',
                    status: 'succeeded',
                    invoiceId: invoice.id,
                    createdAt: new Date(),
                  });
                } else {
                  // Payment failed
                  await adminDb.collection('users').doc(userId).update({
                    subscriptionStatus: 'past_due',
                    updatedAt: new Date(),
                  });
                }
              }
            }
          } catch (invError) {
            console.error('Error processing invoice:', invError);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Don't throw error to Stripe, just log it
    return NextResponse.json({ received: true, error: 'Internal processing error' });
  }
}