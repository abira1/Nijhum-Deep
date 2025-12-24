import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import mealService, { Meal } from '../services/mealService';
import { Unsubscribe } from 'firebase/database';
import { useAuth } from './AuthContext';
import useDayTransition from '../hooks/useDayTransition';
import dayFinalizationService, { FinalizationEvent } from '../services/dayFinalizationService';
import { DayTransitionEvent } from '../services/timeService';

interface MealContextType {
  meals: Meal[];
  loading: boolean;
  error: string | null;
  toggleMeal: (memberId: string, date: string, type: 'lunch' | 'dinner', isAdmin?: boolean) => Promise<void>;
  getMealStatus: (memberId: string, date: string, type: 'lunch' | 'dinner') => boolean;
  getMealCountByMember: (memberId: string, month: number, year: number) => number;
  canEditMeal: (date: string) => boolean;
  getMealsForDate: (date: string) => Meal[];
  // Day transition related
  currentDate: string;
  isToday: (date: string) => boolean;
  isPastDate: (date: string) => boolean;
  isFutureDate: (date: string) => boolean;
  getRelativeDateDescription: (date: string) => string;
  formatDateForDisplay: (date: string) => string;
  isDayFinalized: (date: string) => Promise<boolean>;
  isNearMidnight: (withinMinutes?: number) => boolean;
  timeUntilMidnight: number;
  refreshCurrentDate: () => void;
}

const MealContext = createContext<MealContextType | undefined>(undefined);

export const MealProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Day transition handling
  const handleDayTransition = useCallback(async (event: DayTransitionEvent) => {
    console.log('[MealProvider] Day transition detected:', event);

    try {
      // Refresh meals data to ensure we have the latest state
      // The meal subscription should automatically update, but we can force a refresh if needed
      console.log('[MealProvider] Day transitioned from', event.previousDate, 'to', event.currentDate);
    } catch (error) {
      console.error('[MealProvider] Error handling day transition:', error);
      setError('Error during day transition. Please refresh the page.');
    }
  }, []);

  const handleFinalization = useCallback((event: FinalizationEvent) => {
    console.log('[MealProvider] Day finalized:', event);
    // Could show a notification to the user about day finalization
  }, []);

  // Use day transition hook
  const dayTransition = useDayTransition({
    onDayTransition: handleDayTransition,
    enableMonitoring: isAuthenticated, // Only monitor when authenticated
    checkIntervalMs: 60000 // Check every minute
  });

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const initializeMeals = async () => {
      // Don't initialize meals if user is not authenticated
      if (!isAuthenticated) {
        setMeals([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if there are meals in localStorage to migrate
        const savedMeals = localStorage.getItem('meals');
        if (savedMeals) {
          const localMeals = JSON.parse(savedMeals);
          if (localMeals.length > 0) {
            console.log('Migrating meals from localStorage to Firebase...');
            await mealService.importMeals(localMeals);
            localStorage.removeItem('meals'); // Remove after successful migration
            console.log('Meals migrated successfully');
          }
        }

        // Subscribe to real-time updates
        unsubscribe = mealService.subscribeToMeals(
          (updatedMeals) => {
            setMeals(updatedMeals);
            setLoading(false);
          },
          (error) => {
            console.error('Error subscribing to meals:', error);
            setError('Failed to load meals. Please check your connection.');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error initializing meals:', error);
        setError('Failed to initialize meals. Please refresh the page.');
        setLoading(false);
      }
    };

    // Only initialize meals after auth loading is complete
    if (!authLoading) {
      initializeMeals();
    }

    // Initialize day finalization service when authenticated
    if (isAuthenticated && !authLoading) {
      dayFinalizationService.initialize();

      // Register for finalization events
      const unsubscribeFinalization = dayFinalizationService.onFinalization(handleFinalization);

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        unsubscribeFinalization();
      };
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, authLoading, handleFinalization]);
  const toggleMeal = async (
    memberId: string,
    date: string,
    type: 'lunch' | 'dinner',
    adminOverride: boolean = false
  ): Promise<void> => {
    try {
      setError(null);
      const useAdminPrivileges = adminOverride || isAdmin;
      await mealService.toggleMeal(memberId, date, type, useAdminPrivileges);
    } catch (error) {
      console.error('Error toggling meal:', error);
      setError(error instanceof Error ? error.message : 'Failed to update meal. Please try again.');
      throw error;
    }
  };

  // Helper function to check if a meal can be edited
  const canEditMeal = (date: string): boolean => {
    if (isAdmin) {
      return true; // Admin can edit any date
    }

    // Regular users can only edit today's meals
    return dayTransition.isToday(date);
  };

  // Helper function to check if a day is finalized
  const isDayFinalized = useCallback(async (date: string): Promise<boolean> => {
    return await dayFinalizationService.isDayFinalized(date);
  }, []);

  const getMealStatus = (memberId: string, date: string, type: 'lunch' | 'dinner'): boolean => {
    // Find matching meal for the specific member, date, and type
    const matchingMeal = meals.find(meal =>
      meal.memberId === memberId &&
      meal.date === date &&
      meal.type === type
    );

    return !!matchingMeal;
  };

  const getMealCountByMember = (memberId: string, month: number, year: number): number => {
    return mealService.getMealCountByMember(meals, memberId, month, year);
  };

  const getMealsForDate = (date: string): Meal[] => {
    return meals.filter(meal => meal.date === date);
  };

  return <MealContext.Provider value={{
    meals,
    loading,
    error,
    toggleMeal,
    getMealStatus,
    getMealCountByMember,
    canEditMeal,
    getMealsForDate,
    // Day transition related properties
    currentDate: dayTransition.currentDate,
    isToday: dayTransition.isToday,
    isPastDate: dayTransition.isPastDate,
    isFutureDate: dayTransition.isFutureDate,
    getRelativeDateDescription: dayTransition.getRelativeDateDescription,
    formatDateForDisplay: dayTransition.formatDateForDisplay,
    isDayFinalized,
    isNearMidnight: dayTransition.isNearMidnight,
    timeUntilMidnight: dayTransition.timeUntilMidnight,
    refreshCurrentDate: dayTransition.refreshCurrentDate
  }}>
      {children}
    </MealContext.Provider>;
};
export const useMeals = () => {
  const context = useContext(MealContext);
  if (context === undefined) {
    throw new Error('useMeals must be used within a MealProvider');
  }
  return context;
};