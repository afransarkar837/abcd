export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripePriceId: string;
  credits: number;
  features: string[];
  highlighted?: boolean;
  buttonText: string;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out our platform',
    price: 0,
    currency: 'USD',
    interval: 'month',
    stripePriceId: '',
    credits: 5,
    features: [
      '5 AI generations per month',
      'GPT-3.5 model access',
      'Basic code generation',
      'Community support',
      'Code download',
      'Basic templates'
    ],
    buttonText: 'Start Free'
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Best for professional developers',
    price: 29,
    currency: 'USD',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    credits: 100,
    features: [
      '100 AI generations per month',
      'All AI models (GPT-4, Claude, Gemini)',
      'Advanced code generation',
      'Priority support',
      'GitHub integration',
      'Real-time deployment',
      'Custom templates',
      'Code versioning',
      'Firebase backend integration',
      'Email support'
    ],
    highlighted: true,
    popular: true,
    buttonText: 'Start Pro Trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and large projects',
    price: 99,
    currency: 'USD',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    credits: -1, // Unlimited
    features: [
      'Unlimited AI generations',
      'All AI models + priority access',
      'Advanced features',
      'Dedicated support',
      'GitHub Enterprise integration',
      'Custom deployment options',
      'Team collaboration',
      'API access',
      'Custom AI fine-tuning',
      'SLA guarantee',
      'Phone & video support',
      'Custom integrations'
    ],
    buttonText: 'Contact Sales'
  }
];

export const CREDIT_COSTS = {
  'gpt3.5': 1,
  'gpt4': 3,
  'claude': 3,
  'gemini-flash': 1,
  'gemini-pro': 2
};

export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find(plan => plan.stripePriceId === priceId);
}

export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find(plan => plan.id === planId);
}