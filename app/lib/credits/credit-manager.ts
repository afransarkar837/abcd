import { db } from '@/app/lib/firebase.config';
import { 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { CREDIT_COSTS } from '@/app/config/plans';

export class CreditManager {
  async checkCredits(userId: string, model: keyof typeof CREDIT_COSTS): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      if (!userData) return false;
      
      // Unlimited credits for enterprise
      if (userData.credits === -1) return true;
      
      const cost = CREDIT_COSTS[model] || 1;
      return userData.credits >= cost;
    } catch (error) {
      console.error('Error checking credits:', error);
      return false;
    }
  }
  
  async deductCredits(userId: string, model: keyof typeof CREDIT_COSTS): Promise<void> {
    try {
      const cost = CREDIT_COSTS[model] || 1;
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Don't deduct for unlimited plans
      if (userData?.credits === -1) return;
      
      await updateDoc(userRef, {
        credits: increment(-cost),
        totalGenerations: increment(1),
        lastGeneration: new Date(),
      });
      
      // Log usage
      await this.logUsage(userId, model, cost);
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }
  
  private async logUsage(userId: string, model: string, credits: number): Promise<void> {
    try {
      const dateKey = new Date().toISOString().split('T')[0];
      const usageRef = doc(db, 'usage', `${userId}_${dateKey}`);
      
      // Try to update existing document
      await updateDoc(usageRef, {
        [model]: increment(1),
        totalCredits: increment(credits),
        updatedAt: new Date(),
      }).catch(async () => {
        // Create if doesn't exist
        await setDoc(usageRef, {
          userId,
          date: dateKey,
          [model]: 1,
          totalCredits: credits,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    } catch (error) {
      console.error('Error logging usage:', error);
    }
  }
  
  async getUsageStats(userId: string, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const usageQuery = query(
        collection(db, 'usage'),
        where('userId', '==', userId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(usageQuery);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return [];
    }
  }
}