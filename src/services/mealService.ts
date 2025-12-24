import firebaseService from './firebaseService';
import { Unsubscribe } from 'firebase/database';
import syncManager from './syncManager';
import offlineStorageService from './offlineStorageService';

export interface Meal {
  id: string;
  memberId: string;
  date: string;
  type: 'lunch' | 'dinner';
  timestamp?: number;
}

export class MealService {
  private basePath = 'meals';

  // Helper function to check if a date is today
  private isToday(date: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  }

  // Helper function to check if a date is in the past
  private isPastDate(date: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date < today;
  }

  // Validate meal editing permissions
  private validateMealEditPermission(date: string, isAdmin: boolean): void {
    if (!isAdmin && this.isPastDate(date)) {
      throw new Error('You can only edit meals for today. Past meal records can only be modified by administrators.');
    }
  }

  // Add or toggle a meal with permission checks (offline-capable)
  async toggleMeal(
    memberId: string,
    date: string,
    type: 'lunch' | 'dinner',
    isAdmin: boolean = false
  ): Promise<void> {
    try {
      // Validate permissions
      this.validateMealEditPermission(date, isAdmin);

      const mealKey = `${memberId}-${date}-${type}`;
      const mealPath = `${this.basePath}/${mealKey}`;

      // Check if we're online
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Use Firebase directly
        const existingMeal = await firebaseService.getData(mealPath);

        if (existingMeal) {
          // Remove the meal if it exists
          await firebaseService.removeData(mealPath);
          // Also remove from offline storage
          await offlineStorageService.deleteData('meals', mealKey);
        } else {
          // Add the meal if it doesn't exist
          const newMeal: Omit<Meal, 'id'> = {
            memberId,
            date,
            type,
            timestamp: firebaseService.getTimestamp()
          };
          await firebaseService.setData(mealPath, newMeal);
          // Store in offline storage for caching
          await offlineStorageService.storeData('meals', mealKey, newMeal, false);
        }
      } else {
        // Offline: Use offline storage and queue for sync
        const offlineData = await offlineStorageService.getData('meals', mealKey);

        if (offlineData) {
          // Remove the meal if it exists offline
          await offlineStorageService.deleteData('meals', mealKey);
          // Queue delete operation for sync
          await syncManager.queueOperation('DELETE', 'meals', { id: mealKey });
        } else {
          // Add the meal offline
          const newMeal: Omit<Meal, 'id'> = {
            memberId,
            date,
            type,
            timestamp: firebaseService.getTimestamp()
          };
          await offlineStorageService.storeData('meals', mealKey, newMeal, true);
          // Queue create operation for sync
          await syncManager.queueOperation('CREATE', 'meals', newMeal);
        }
      }
    } catch (error) {
      console.error('Error toggling meal:', error);
      throw error;
    }
  }

  // Get all meals (offline-capable)
  async getAllMeals(): Promise<Meal[]> {
    try {
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Try Firebase first, fallback to offline storage
        try {
          const mealsData = await firebaseService.getData(this.basePath);
          const meals = mealsData ? Object.keys(mealsData).map(key => ({
            id: key,
            ...mealsData[key]
          })) : [];

          // Update offline storage with fresh data
          for (const meal of meals) {
            await offlineStorageService.storeData('meals', meal.id, meal, false);
          }

          return meals;
        } catch (error) {
          console.warn('Firebase failed, falling back to offline storage:', error);
          return await this.getOfflineMeals();
        }
      } else {
        // Offline: Use offline storage only
        return await this.getOfflineMeals();
      }
    } catch (error) {
      console.error('Error getting all meals:', error);
      throw error;
    }
  }

  // Get meals from offline storage
  private async getOfflineMeals(): Promise<Meal[]> {
    try {
      const offlineMeals = await syncManager.getOfflineData('meals');
      return offlineMeals.map(item => ({
        id: item.id,
        memberId: item.memberId,
        date: item.date,
        type: item.type,
        timestamp: item.timestamp,
        _isOffline: item._isOffline
      }));
    } catch (error) {
      console.error('Error getting offline meals:', error);
      return [];
    }
  }

  // Get meal status for a specific member, date, and type (offline-capable)
  async getMealStatus(memberId: string, date: string, type: 'lunch' | 'dinner'): Promise<boolean> {
    try {
      const mealKey = `${memberId}-${date}-${type}`;
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Check Firebase first, fallback to offline
        try {
          const mealPath = `${this.basePath}/${mealKey}`;
          const meal = await firebaseService.getData(mealPath);
          return meal !== null;
        } catch (error) {
          console.warn('Firebase failed, checking offline storage:', error);
          const offlineData = await offlineStorageService.getData('meals', mealKey);
          return offlineData !== null;
        }
      } else {
        // Offline: Check offline storage only
        const offlineData = await offlineStorageService.getData('meals', mealKey);
        return offlineData !== null;
      }
    } catch (error) {
      console.error('Error getting meal status:', error);
      return false;
    }
  }

  // Get meal count for a member in a specific month/year
  getMealCountByMember(meals: Meal[], memberId: string, month: number, year: number): number {
    return meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return meal.memberId === memberId && 
             mealDate.getMonth() === month && 
             mealDate.getFullYear() === year;
    }).length;
  }

  // Subscribe to real-time meal updates (offline-capable)
  subscribeToMeals(
    callback: (meals: Meal[]) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    let firebaseUnsubscribe: Unsubscribe | null = null;
    let syncUnsubscribe: (() => void) | null = null;

    const handleMealsUpdate = async () => {
      try {
        const meals = await this.getAllMeals();
        callback(meals);
      } catch (error) {
        console.error('Error in meals subscription:', error);
        if (errorCallback) {
          errorCallback(error as Error);
        }
      }
    };

    // Subscribe to Firebase if online
    if (navigator.onLine) {
      firebaseUnsubscribe = firebaseService.subscribeToData(
        this.basePath,
        async (data) => {
          try {
            const meals = data ? firebaseService.objectToArray(data) : [];

            // Update offline storage with fresh data
            for (const meal of meals) {
              await offlineStorageService.storeData('meals', meal.id, meal, false);
            }

            callback(meals);
          } catch (error) {
            console.error('Error processing Firebase meals update:', error);
            // Fallback to offline data
            handleMealsUpdate();
          }
        },
        (error) => {
          console.error('Firebase subscription error, falling back to offline:', error);
          handleMealsUpdate();
        }
      );
    } else {
      // If offline, load from offline storage immediately
      handleMealsUpdate();
    }

    // Subscribe to sync events for offline changes
    const handleSyncEvent = () => {
      handleMealsUpdate();
    };

    syncManager.addSyncListener(handleSyncEvent);
    syncUnsubscribe = () => syncManager.removeSyncListener(handleSyncEvent);

    // Return combined unsubscribe function
    return () => {
      if (firebaseUnsubscribe) {
        firebaseUnsubscribe();
      }
      if (syncUnsubscribe) {
        syncUnsubscribe();
      }
    };
  }

  // Get meals for a specific date
  async getMealsForDate(date: string): Promise<Meal[]> {
    try {
      const allMeals = await this.getAllMeals();
      return allMeals.filter(meal => meal.date === date);
    } catch (error) {
      console.error('Error getting meals for date:', error);
      throw error;
    }
  }

  // Get meals for a specific member
  async getMealsForMember(memberId: string): Promise<Meal[]> {
    try {
      const allMeals = await this.getAllMeals();
      return allMeals.filter(meal => meal.memberId === memberId);
    } catch (error) {
      console.error('Error getting meals for member:', error);
      throw error;
    }
  }

  // Remove all meals for a member (useful when removing a member)
  async removeMealsForMember(memberId: string): Promise<void> {
    try {
      const memberMeals = await this.getMealsForMember(memberId);
      const removePromises = memberMeals.map(meal => 
        firebaseService.removeData(`${this.basePath}/${meal.id}`)
      );
      await Promise.all(removePromises);
    } catch (error) {
      console.error('Error removing meals for member:', error);
      throw error;
    }
  }

  // Bulk import meals (useful for migration from localStorage)
  async importMeals(meals: Meal[]): Promise<void> {
    try {
      const importPromises = meals.map(meal => {
        const mealKey = `${meal.memberId}-${meal.date}-${meal.type}`;
        const mealData = {
          memberId: meal.memberId,
          date: meal.date,
          type: meal.type,
          timestamp: meal.timestamp || firebaseService.getTimestamp()
        };
        return firebaseService.setData(`${this.basePath}/${mealKey}`, mealData);
      });
      
      await Promise.all(importPromises);
    } catch (error) {
      console.error('Error importing meals:', error);
      throw error;
    }
  }
}

// Create singleton instance
const mealService = new MealService();
export default mealService;
