// Day Transition Hook
// React hook for monitoring day changes and handling day transitions

import { useEffect, useState, useCallback, useRef } from 'react';
import timeService, { DayTransitionEvent } from '../services/timeService';

export interface DayTransitionState {
  currentDate: string;
  isToday: (date: string) => boolean;
  isPastDate: (date: string) => boolean;
  isFutureDate: (date: string) => boolean;
  getRelativeDateDescription: (date: string) => string;
  formatDateForDisplay: (date: string) => string;
  isNearMidnight: (withinMinutes?: number) => boolean;
  timeUntilMidnight: number;
  timeSinceMidnight: number;
}

export interface DayTransitionOptions {
  onDayTransition?: (event: DayTransitionEvent) => void;
  onBeforeDayTransition?: (event: DayTransitionEvent) => Promise<void> | void;
  enableMonitoring?: boolean;
  checkIntervalMs?: number;
  nearMidnightThresholdMinutes?: number;
}

export interface DayTransitionHookReturn extends DayTransitionState {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  isMonitoring: boolean;
  refreshCurrentDate: () => void;
}

export const useDayTransition = (options: DayTransitionOptions = {}): DayTransitionHookReturn => {
  const {
    onDayTransition,
    onBeforeDayTransition,
    enableMonitoring = true,
    checkIntervalMs = 60000, // Check every minute by default
    nearMidnightThresholdMinutes = 5
  } = options;

  // State for current date and monitoring status
  const [currentDate, setCurrentDate] = useState<string>(timeService.getCurrentDateString());
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState<number>(timeService.getTimeUntilMidnight());
  const [timeSinceMidnight, setTimeSinceMidnight] = useState<number>(timeService.getTimeSinceMidnight());

  // Refs to store callback functions to avoid stale closures
  const onDayTransitionRef = useRef(onDayTransition);
  const onBeforeDayTransitionRef = useRef(onBeforeDayTransition);

  // Update refs when callbacks change
  useEffect(() => {
    onDayTransitionRef.current = onDayTransition;
  }, [onDayTransition]);

  useEffect(() => {
    onBeforeDayTransitionRef.current = onBeforeDayTransition;
  }, [onBeforeDayTransition]);

  // Interval for updating time-related states
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update time-related states
  const updateTimeStates = useCallback(() => {
    setTimeUntilMidnight(timeService.getTimeUntilMidnight());
    setTimeSinceMidnight(timeService.getTimeSinceMidnight());
  }, []);

  // Start time updates
  const startTimeUpdates = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }
    
    timeUpdateIntervalRef.current = setInterval(updateTimeStates, 30000); // Update every 30 seconds
    updateTimeStates(); // Update immediately
  }, [updateTimeStates]);

  // Stop time updates
  const stopTimeUpdates = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  // Handle day transition event
  const handleDayTransition = useCallback(async (event: DayTransitionEvent) => {
    console.log('[useDayTransition] Day transition detected:', event);

    try {
      // Call before transition callback if provided
      if (onBeforeDayTransitionRef.current) {
        await onBeforeDayTransitionRef.current(event);
      }

      // Update current date state
      setCurrentDate(event.currentDate);

      // Update time states
      updateTimeStates();

      // Call after transition callback if provided
      if (onDayTransitionRef.current) {
        onDayTransitionRef.current(event);
      }
    } catch (error) {
      console.error('[useDayTransition] Error handling day transition:', error);
    }
  }, [updateTimeStates]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) {
      console.warn('[useDayTransition] Monitoring is already active');
      return;
    }

    console.log('[useDayTransition] Starting day transition monitoring');
    setIsMonitoring(true);
    
    // Start time service monitoring
    timeService.startDayMonitoring(checkIntervalMs);
    
    // Start time updates
    startTimeUpdates();
    
    // Register for day transition events
    const unsubscribe = timeService.onDayTransition(handleDayTransition);
    
    // Store unsubscribe function for cleanup
    return unsubscribe;
  }, [isMonitoring, checkIntervalMs, handleDayTransition, startTimeUpdates]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) {
      return;
    }

    console.log('[useDayTransition] Stopping day transition monitoring');
    setIsMonitoring(false);
    
    // Stop time service monitoring
    timeService.stopDayMonitoring();
    
    // Stop time updates
    stopTimeUpdates();
  }, [isMonitoring, stopTimeUpdates]);

  // Refresh current date
  const refreshCurrentDate = useCallback(() => {
    const newDate = timeService.getCurrentDateString();
    if (newDate !== currentDate) {
      setCurrentDate(newDate);
      updateTimeStates();
    }
  }, [currentDate, updateTimeStates]);

  // Utility functions that use timeService
  const isToday = useCallback((date: string) => timeService.isToday(date), []);
  const isPastDate = useCallback((date: string) => timeService.isPastDate(date), []);
  const isFutureDate = useCallback((date: string) => timeService.isFutureDate(date), []);
  const getRelativeDateDescription = useCallback((date: string) => timeService.getRelativeDateDescription(date), []);
  const formatDateForDisplay = useCallback((date: string) => timeService.formatDateForDisplay(date), []);
  const isNearMidnight = useCallback((withinMinutes?: number) => 
    timeService.isNearMidnight(withinMinutes || nearMidnightThresholdMinutes), [nearMidnightThresholdMinutes]);

  // Auto-start monitoring if enabled
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (enableMonitoring && !isMonitoring) {
      unsubscribe = startMonitoring();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      stopMonitoring();
      stopTimeUpdates();
    };
  }, [enableMonitoring]); // Only depend on enableMonitoring to avoid infinite loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
      stopTimeUpdates();
    };
  }, []);

  return {
    currentDate,
    isToday,
    isPastDate,
    isFutureDate,
    getRelativeDateDescription,
    formatDateForDisplay,
    isNearMidnight,
    timeUntilMidnight,
    timeSinceMidnight,
    startMonitoring,
    stopMonitoring,
    isMonitoring,
    refreshCurrentDate
  };
};

export default useDayTransition;
