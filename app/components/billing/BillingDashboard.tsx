'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCreditCard, 
  FiTrendingUp, 
  FiCalendar,
  FiAlertCircle,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { useAuth } from '@/app/contexts/AuthContext';
import { getPlanById } from '@/app/config/plans';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BillingDashboard() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<any[]>([]);
  
  const currentPlan = getPlanById(userProfile?.subscription || 'free');
  
  useEffect(() => {
    loadUsageData();
  }, [user]);
  
  const loadUsageData = async () => {
    if (!user) return;
    
    try {
      // Load usage data from Firebase
      // This would be implemented with your usage tracking
      setUsage([
        { day: 'Mon', credits: 5 },
        { day: 'Tue', credits: 3 },
        { day: 'Wed', credits: 7 },
        { day: 'Thu', credits: 2 },
        { day: 'Fri', credits: 8 },
        { day: 'Sat', credits: 4 },
        { day: 'Sun', credits: 6 },
      ]);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
  };
  
  const openBillingPortal = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to open billing portal');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="glass-morphism rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Current Plan</h3>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-3xl font-bold text-white">{currentPlan?.name}</p>
            <p className="text-gray-400">
              ${currentPlan?.price}/month
            </p>
          </div>
          
          <button
            onClick={openBillingPortal}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Manage Billing'}
          </button>
        </div>
        
        {/* Credits */}
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Credits Remaining</span>
            <span className="text-2xl font-bold text-white">
              {userProfile?.credits === -1 ? '∞' : userProfile?.credits || 0}
            </span>
          </div>
          
          {userProfile?.credits !== -1 && (
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                style={{ 
                  width: `${((userProfile?.credits || 0) / (currentPlan?.credits || 1)) * 100}%` 
                }}
              />
            </div>
          )}
        </div>
        
        {/* Next billing date */}
        {userProfile?.currentPeriodEnd && (
          <div className="mt-4 flex items-center text-gray-400">
            <FiCalendar className="w-4 h-4 mr-2" />
            <span>
              Next billing date: {format(userProfile.currentPeriodEnd.toDate(), 'MMM dd, yyyy')}
            </span>
          </div>
        )}
      </div>
      
      {/* Usage Chart */}
      <div className="glass-morphism rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Usage This Week</h3>
        
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={usage}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="day" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.2)' 
              }}
            />
            <Bar dataKey="credits" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Plan Features */}
      <div className="glass-morphism rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Plan Features</h3>
        
        <ul className="space-y-3">
          {currentPlan?.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <FiCheck className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}