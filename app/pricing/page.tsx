'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiZap, FiTrendingUp } from 'react-icons/fi';
import { PLANS } from '@/app/config/plans';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import AnimatedBackground from '@/app/components/AnimatedBackground';
import SignInModal from '@/app/components/auth/SignInModal';

export default function PricingPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [showSignIn, setShowSignIn] = useState(false);

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    if (!user) {
      setShowSignIn(true);
      return;
    }

    if (plan.id === 'free') {
      router.push('/dashboard');
      return;
    }

    if (plan.id === 'enterprise') {
      window.open('mailto:enterprise@aicodegen.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    setLoading(plan.id);
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="relative z-10 p-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-bold text-white"
          >
            AI Code Generator
          </button>
          
          {user ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 glass-morphism rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => setShowSignIn(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Sign In
            </button>
          )}
        </nav>
      </header>

      {/* Pricing Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Start free and scale as you grow
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center glass-morphism rounded-lg p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 rounded-lg transition-all ${
                billingInterval === 'month'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 rounded-lg transition-all ${
                billingInterval === 'year'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-green-400 text-sm">Save 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-morphism rounded-2xl p-8 relative ${
                plan.popular ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-white">
                    ${billingInterval === 'year' ? Math.floor(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="text-gray-400 ml-2">/{billingInterval}</span>
                </div>
                <p className="text-gray-400 mt-2">
                  {plan.credits === -1 ? 'Unlimited' : plan.credits} generations
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <FiCheck className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={loading === plan.id || (userProfile?.subscription === plan.id)}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  userProfile?.subscription === plan.id
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : plan.highlighted
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-50`}
              >
                {loading === plan.id ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                  />
                ) : userProfile?.subscription === plan.id ? (
                  'Current Plan'
                ) : (
                  plan.buttonText
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-20"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="glass-morphism rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            
            <div className="glass-morphism rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                What happens if I run out of credits?
              </h3>
              <p className="text-gray-400">
                You can upgrade to a higher plan or wait for your monthly credits to reset on your billing date.
              </p>
            </div>
            
            <div className="glass-morphism rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Do unused credits roll over?
              </h3>
              <p className="text-gray-400">
                Credits reset monthly and don't roll over. We recommend choosing a plan that matches your usage.
              </p>
            </div>
            
            <div className="glass-morphism rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-400">
                Yes! Start with our free plan to test the platform. You can upgrade anytime.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  );
}