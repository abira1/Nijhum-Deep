// Day Finalization Service
// Handles automatic finalization of previous day's meal records at midnight

import firebaseService from './firebaseService';
import offlineStorageService from './offlineStorageService';
import syncManager from './syncManager';
import timeService, { DayTransitionEvent } from './timeService';
import { Meal } from './mealService';

export interface DayFinalizationRecord {
  date: string;
  finalizedAt: number;
  mealCount: number;
  memberIds: string[];
  timeZone: string;
  isFinalized: boolean;
}

export interface FinalizationEvent {
  date: string;
  meals: Meal[];
  finalizationRecord: DayFinalizationRecord;
  timestamp: number;
}

export type FinalizationCallback = (event: FinalizationEvent) => void;

export class DayFinalizationService {
  private static instance: DayFinalizationService;
  private basePath = 'day_finalizations';
  private finalizationCallbacks: FinalizationCallback[] = [];
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DayFinalizationService {
    if (!DayFinalizationService.instance) {
      DayFinalizationService.instance = new DayFinalizationService();
    }
    return DayFinalizationService.instance;
  }

  // Initialize the service and start listening for day transitions
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[DayFinalizationService] Already initialized');
      return;
    }

    console.log('[DayFinalizationService] Initializing day finalization service');
    this.isInitialized = true;

    // Register for day transition events
    timeService.onDayTransition(this.handleDayTransition.bind(this));

    // Check if we need to finalize any missed days (e.g., if app was closed during transition)
    await this.checkForMissedFinalizations();
  }

  // Handle day transition event
  private async handleDayTransition(event: DayTransitionEvent): Promise<void> {
    console.log('[DayFinalizationService] Handling day transition:', event);

    try {
      // Finalize the previous day
      await this.finalizeDayMeals(event.previousDate);
    } catch (error) {
      console.error('[DayFinalizationService] Error finalizing day meals:', error);
    }
  }

  // Check for missed finalizations (days that should have been finalized but weren't)
  private async checkForMissedFinalizations(): Promise<void> {
    try {
      console.log('[DayFinalizationService] Checking for missed finalizations');
      
      const today = timeService.getCurrentDateString();
      const yesterday = timeService.getYesterdayString();
      
      // Check if yesterday was finalized
      const yesterdayFinalization = await this.getFinalizationRecord(yesterday);
      
      if (!yesterdayFinalization || !yesterdayFinalization.isFinalized) {
        console.log(`[DayFinalizationService] Finalizing missed day: ${yesterday}`);
        await this.finalizeDayMeals(yesterday);
      }

      // Check for any other missed days in the past week
      for (let i = 2; i <= 7; i++) {
        const pastDate = timeService.getDateStringFromToday(-i);
        const finalization = await this.getFinalizationRecord(pastDate);
        
        if (!finalization || !finalization.isFinalized) {
          console.log(`[DayFinalizationService] Finalizing missed day: ${pastDate}`);
          await this.finalizeDayMeals(pastDate);
        }
      }
    } catch (error) {
      console.error('[DayFinalizationService] Error checking missed finalizations:', error);
    }
  }

  // Finalize meals for a specific day
  public async finalizeDayMeals(date: string): Promise<void> {
    try {
      console.log(`[DayFinalizationService] Finalizing meals for date: ${date}`);

      // Check if already finalized
      const existingFinalization = await this.getFinalizationRecord(date);
      if (existingFinalization && existingFinalization.isFinalized) {
        console.log(`[DayFinalizationService] Day ${date} is already finalized`);
        return;
      }

      // Get all meals for the date
      const meals = await this.getMealsForDate(date);
      
      // Create finalization record
      const finalizationRecord: DayFinalizationRecord = {
        date,
        finalizedAt: Date.now(),
        mealCount: meals.length,
        memberIds: [...new Set(meals.map(meal => meal.memberId))],
        timeZone: timeService.getTimeZoneInfo().timeZone,
        isFinalized: true
      };

      // Save finalization record
      await this.saveFinalizationRecord(finalizationRecord);

      // Create finalization event
      const event: FinalizationEvent = {
        date,
        meals,
        finalizationRecord,
        timestamp: Date.now()
      };

      // Notify callbacks
      this.notifyFinalizationCallbacks(event);

      console.log(`[DayFinalizationService] Successfully finalized ${meals.length} meals for ${date}`);
    } catch (error) {
      console.error(`[DayFinalizationService] Error finalizing day ${date}:`, error);
      throw error;
    }
  }

  // Get meals for a specific date
  private async getMealsForDate(date: string): Promise<Meal[]> {
    try {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        // Online: Get from Firebase
        const mealsData = await firebaseService.getData('meals');
        if (!mealsData) return [];

        return Object.keys(mealsData)
          .map(key => ({ id: key, ...mealsData[key] }))
          .filter(meal => meal.date === date);
      } else {
        // Offline: Get from offline storage
        const offlineMeals = await syncManager.getOfflineData('meals');
        return offlineMeals
          .filter(item => item.date === date)
          .map(item => ({
            id: item.id,
            memberId: item.memberId,
            date: item.date,
            type: item.type,
            timestamp: item.timestamp,
            _isOffline: item._isOffline
          }));
      }
    } catch (error) {
      console.error(`[DayFinalizationService] Error getting meals for date ${date}:`, error);
      return [];
    }
  }

  // Save finalization record
  private async saveFinalizationRecord(record: DayFinalizationRecord): Promise<void> {
    try {
      const recordPath = `${this.basePath}/${record.date}`;
      
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        // Online: Save to Firebase
        await firebaseService.setData(recordPath, record);
        // Also cache offline
        await offlineStorageService.storeData('day_finalizations', record.date, record, false);
      } else {
        // Offline: Save locally and queue for sync
        await offlineStorageService.storeData('day_finalizations', record.date, record, true);
        await syncManager.queueOperation('CREATE', 'day_finalizations', record);
      }
    } catch (error) {
      console.error('[DayFinalizationService] Error saving finalization record:', error);
      throw error;
    }
  }

  // Get finalization record for a date
  public async getFinalizationRecord(date: string): Promise<DayFinalizationRecord | null> {
    try {
      const recordPath = `${this.basePath}/${date}`;
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        // Online: Try Firebase first, fallback to offline
        try {
          const record = await firebaseService.getData(recordPath);
          return record;
        } catch (error) {
          console.warn('[DayFinalizationService] Firebase failed, checking offline storage:', error);
          return await offlineStorageService.getData('day_finalizations', date);
        }
      } else {
        // Offline: Check offline storage only
        return await offlineStorageService.getData('day_finalizations', date);
      }
    } catch (error) {
      console.error(`[DayFinalizationService] Error getting finalization record for ${date}:`, error);
      return null;
    }
  }

  // Check if a day is finalized
  public async isDayFinalized(date: string): Promise<boolean> {
    try {
      const record = await this.getFinalizationRecord(date);
      return record ? record.isFinalized : false;
    } catch (error) {
      console.error(`[DayFinalizationService] Error checking if day ${date} is finalized:`, error);
      return false;
    }
  }

  // Get all finalization records
  public async getAllFinalizationRecords(): Promise<DayFinalizationRecord[]> {
    try {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        // Online: Get from Firebase
        const recordsData = await firebaseService.getData(this.basePath);
        if (!recordsData) return [];

        return Object.keys(recordsData).map(key => ({
          ...recordsData[key]
        }));
      } else {
        // Offline: Get from offline storage
        const offlineRecords = await syncManager.getOfflineData('day_finalizations');
        return offlineRecords.map(item => ({
          date: item.date,
          finalizedAt: item.finalizedAt,
          mealCount: item.mealCount,
          memberIds: item.memberIds,
          timeZone: item.timeZone,
          isFinalized: item.isFinalized
        }));
      }
    } catch (error) {
      console.error('[DayFinalizationService] Error getting all finalization records:', error);
      return [];
    }
  }

  // Register callback for finalization events
  public onFinalization(callback: FinalizationCallback): () => void {
    this.finalizationCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.finalizationCallbacks.indexOf(callback);
      if (index > -1) {
        this.finalizationCallbacks.splice(index, 1);
      }
    };
  }

  // Notify finalization callbacks
  private notifyFinalizationCallbacks(event: FinalizationEvent): void {
    this.finalizationCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[DayFinalizationService] Error in finalization callback:', error);
      }
    });
  }

  // Cleanup resources
  public cleanup(): void {
    this.finalizationCallbacks = [];
    this.isInitialized = false;
  }

  // Manual finalization (for admin use)
  public async manuallyFinalizeDayMeals(date: string, force: boolean = false): Promise<void> {
    if (!force) {
      const isFinalized = await this.isDayFinalized(date);
      if (isFinalized) {
        throw new Error(`Day ${date} is already finalized. Use force=true to re-finalize.`);
      }
    }

    await this.finalizeDayMeals(date);
  }
}

// Create singleton instance
const dayFinalizationService = DayFinalizationService.getInstance();
export default dayFinalizationService;
