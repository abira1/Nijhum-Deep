// Edge Case Handler Service
// Handles edge cases for time management and day transitions

import timeService from './timeService';
import dayFinalizationService from './dayFinalizationService';
import backgroundMonitoringService from './backgroundMonitoringService';

export interface EdgeCaseEvent {
  type: 'timezone_change' | 'clock_adjustment' | 'midnight_transition_active' | 'network_reconnect' | 'system_resume';
  timestamp: number;
  details: any;
}

export type EdgeCaseCallback = (event: EdgeCaseEvent) => void;

export class EdgeCaseHandler {
  private static instance: EdgeCaseHandler;
  private callbacks: EdgeCaseCallback[] = [];
  private isInitialized = false;
  
  // State tracking
  private lastKnownTimezone: string;
  private lastKnownOffset: number;
  private lastSystemTime: number;
  private isUserActiveAtMidnight = false;
  private midnightTransitionInProgress = false;

  private constructor() {
    const tzInfo = timeService.getTimeZoneInfo();
    this.lastKnownTimezone = tzInfo.timeZone;
    this.lastKnownOffset = tzInfo.offset;
    this.lastSystemTime = Date.now();
  }

  public static getInstance(): EdgeCaseHandler {
    if (!EdgeCaseHandler.instance) {
      EdgeCaseHandler.instance = new EdgeCaseHandler();
    }
    return EdgeCaseHandler.instance;
  }

  // Initialize edge case handling
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('[EdgeCaseHandler] Already initialized');
      return;
    }

    console.log('[EdgeCaseHandler] Initializing edge case handling');
    this.isInitialized = true;

    // Set up timezone change detection
    this.setupTimezoneChangeDetection();

    // Set up clock adjustment detection
    this.setupClockAdjustmentDetection();

    // Set up midnight transition handling
    this.setupMidnightTransitionHandling();

    // Set up network reconnection handling
    this.setupNetworkReconnectionHandling();

    // Set up system resume detection
    this.setupSystemResumeDetection();

    // Set up user activity tracking
    this.setupUserActivityTracking();
  }

  // Detect timezone changes
  private setupTimezoneChangeDetection(): void {
    setInterval(() => {
      const currentTzInfo = timeService.getTimeZoneInfo();
      
      if (currentTzInfo.timeZone !== this.lastKnownTimezone || 
          currentTzInfo.offset !== this.lastKnownOffset) {
        
        console.log('[EdgeCaseHandler] Timezone change detected:', {
          from: { timezone: this.lastKnownTimezone, offset: this.lastKnownOffset },
          to: { timezone: currentTzInfo.timeZone, offset: currentTzInfo.offset }
        });

        this.handleTimezoneChange(currentTzInfo);
        
        this.lastKnownTimezone = currentTzInfo.timeZone;
        this.lastKnownOffset = currentTzInfo.offset;
      }
    }, 30000); // Check every 30 seconds
  }

  // Detect system clock adjustments
  private setupClockAdjustmentDetection(): void {
    setInterval(() => {
      const currentTime = Date.now();
      const expectedTime = this.lastSystemTime + 30000; // Expected time after 30 seconds
      const timeDifference = Math.abs(currentTime - expectedTime);
      
      // If time difference is more than 5 seconds, consider it a clock adjustment
      if (timeDifference > 5000) {
        console.log('[EdgeCaseHandler] Clock adjustment detected:', {
          expected: expectedTime,
          actual: currentTime,
          difference: timeDifference
        });

        this.handleClockAdjustment(timeDifference);
      }
      
      this.lastSystemTime = currentTime;
    }, 30000); // Check every 30 seconds
  }

  // Handle midnight transitions when user is active
  private setupMidnightTransitionHandling(): void {
    // Register for day transition events
    timeService.onDayTransition(async (event) => {
      if (this.isUserActiveAtMidnight) {
        console.log('[EdgeCaseHandler] User is active during midnight transition');
        await this.handleMidnightTransitionWithActiveUser(event);
      }
    });

    // Check if we're near midnight and user is active
    setInterval(() => {
      const isNearMidnight = timeService.isNearMidnight(5); // Within 5 minutes
      const wasNearMidnight = this.isUserActiveAtMidnight;
      
      if (isNearMidnight && !wasNearMidnight) {
        this.isUserActiveAtMidnight = true;
        console.log('[EdgeCaseHandler] User is active near midnight');
      } else if (!isNearMidnight && wasNearMidnight) {
        this.isUserActiveAtMidnight = false;
        console.log('[EdgeCaseHandler] No longer near midnight');
      }
    }, 60000); // Check every minute
  }

  // Handle network reconnection
  private setupNetworkReconnectionHandling(): void {
    const handleOnline = async () => {
      console.log('[EdgeCaseHandler] Network reconnected');
      
      // Wait a moment for network to stabilize
      setTimeout(async () => {
        await this.handleNetworkReconnection();
      }, 2000);
    };

    window.addEventListener('online', handleOnline);
  }

  // Detect system resume (from sleep/hibernate)
  private setupSystemResumeDetection(): void {
    let lastActiveTime = Date.now();
    
    const checkForResume = () => {
      const currentTime = Date.now();
      const timeSinceLastCheck = currentTime - lastActiveTime;
      
      // If more than 5 minutes have passed, likely system was suspended
      if (timeSinceLastCheck > 300000) {
        console.log('[EdgeCaseHandler] System resume detected:', {
          suspendedFor: timeSinceLastCheck,
          resumedAt: currentTime
        });
        
        this.handleSystemResume(timeSinceLastCheck);
      }
      
      lastActiveTime = currentTime;
    };

    // Check every minute
    setInterval(checkForResume, 60000);
    
    // Also check on focus/visibility events
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkForResume();
      }
    });
    
    window.addEventListener('focus', checkForResume);
  }

  // Track user activity
  private setupUserActivityTracking(): void {
    let lastActivity = Date.now();
    
    const updateActivity = () => {
      lastActivity = Date.now();
    };

    // Track various user interactions
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check if user is active (for midnight transition handling)
    setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      const isActive = timeSinceActivity < 300000; // Active if interaction within 5 minutes
      
      if (timeService.isNearMidnight(10) && isActive) {
        this.isUserActiveAtMidnight = true;
      }
    }, 60000);
  }

  // Handle timezone change
  private async handleTimezoneChange(newTzInfo: any): Promise<void> {
    try {
      this.notifyCallbacks({
        type: 'timezone_change',
        timestamp: Date.now(),
        details: {
          oldTimezone: this.lastKnownTimezone,
          newTimezone: newTzInfo.timeZone,
          oldOffset: this.lastKnownOffset,
          newOffset: newTzInfo.offset
        }
      });

      // Restart time monitoring with new timezone
      timeService.stopDayMonitoring();
      timeService.startDayMonitoring();

      // Check if day has changed due to timezone change
      const currentDate = timeService.getCurrentDateString();
      const storedDate = localStorage.getItem('lastKnownDate');
      
      if (storedDate && storedDate !== currentDate) {
        console.log('[EdgeCaseHandler] Day changed due to timezone change');
        await dayFinalizationService.finalizeDayMeals(storedDate);
        localStorage.setItem('lastKnownDate', currentDate);
      }

    } catch (error) {
      console.error('[EdgeCaseHandler] Error handling timezone change:', error);
    }
  }

  // Handle clock adjustment
  private async handleClockAdjustment(timeDifference: number): Promise<void> {
    try {
      this.notifyCallbacks({
        type: 'clock_adjustment',
        timestamp: Date.now(),
        details: { timeDifference }
      });

      // Restart monitoring services
      timeService.stopDayMonitoring();
      timeService.startDayMonitoring();
      
      // Check for missed day transitions
      await this.checkForMissedDayTransitions();

    } catch (error) {
      console.error('[EdgeCaseHandler] Error handling clock adjustment:', error);
    }
  }

  // Handle midnight transition when user is active
  private async handleMidnightTransitionWithActiveUser(event: any): Promise<void> {
    try {
      this.midnightTransitionInProgress = true;
      
      this.notifyCallbacks({
        type: 'midnight_transition_active',
        timestamp: Date.now(),
        details: { event, userActive: true }
      });

      // Day transition handled silently without notifications

      // Ensure finalization happens
      await dayFinalizationService.finalizeDayMeals(event.previousDate);
      
      this.midnightTransitionInProgress = false;

    } catch (error) {
      console.error('[EdgeCaseHandler] Error handling midnight transition with active user:', error);
      this.midnightTransitionInProgress = false;
    }
  }

  // Handle network reconnection
  private async handleNetworkReconnection(): Promise<void> {
    try {
      this.notifyCallbacks({
        type: 'network_reconnect',
        timestamp: Date.now(),
        details: { reconnectedAt: Date.now() }
      });

      // Check for missed day transitions while offline
      await this.checkForMissedDayTransitions();

      // Restart background monitoring
      await backgroundMonitoringService.initialize();

    } catch (error) {
      console.error('[EdgeCaseHandler] Error handling network reconnection:', error);
    }
  }

  // Handle system resume
  private async handleSystemResume(suspendedFor: number): Promise<void> {
    try {
      this.notifyCallbacks({
        type: 'system_resume',
        timestamp: Date.now(),
        details: { suspendedFor }
      });

      // Check for missed day transitions during suspension
      await this.checkForMissedDayTransitions();

      // Restart all monitoring services
      timeService.stopDayMonitoring();
      timeService.startDayMonitoring();
      
      await backgroundMonitoringService.initialize();

    } catch (error) {
      console.error('[EdgeCaseHandler] Error handling system resume:', error);
    }
  }

  // Check for missed day transitions
  private async checkForMissedDayTransitions(): Promise<void> {
    try {
      const currentDate = timeService.getCurrentDateString();
      const storedDate = localStorage.getItem('lastKnownDate');
      
      if (storedDate && storedDate !== currentDate) {
        const daysDiff = timeService.getDaysDifference(storedDate, currentDate);
        console.log(`[EdgeCaseHandler] Found ${daysDiff} missed day transitions`);
        
        // Finalize all missed days
        for (let i = 0; i < daysDiff; i++) {
          const dateToFinalize = timeService.getDateStringFromToday(-daysDiff + i);
          await dayFinalizationService.finalizeDayMeals(dateToFinalize);
        }
        
        localStorage.setItem('lastKnownDate', currentDate);
      }
    } catch (error) {
      console.error('[EdgeCaseHandler] Error checking for missed day transitions:', error);
    }
  }

  // Register callback for edge case events
  public onEdgeCase(callback: EdgeCaseCallback): () => void {
    this.callbacks.push(callback);
    
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  // Notify callbacks
  private notifyCallbacks(event: EdgeCaseEvent): void {
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[EdgeCaseHandler] Error in edge case callback:', error);
      }
    });
  }

  // Get current state
  public getState() {
    return {
      isInitialized: this.isInitialized,
      lastKnownTimezone: this.lastKnownTimezone,
      lastKnownOffset: this.lastKnownOffset,
      isUserActiveAtMidnight: this.isUserActiveAtMidnight,
      midnightTransitionInProgress: this.midnightTransitionInProgress
    };
  }

  // Cleanup
  public cleanup(): void {
    this.callbacks = [];
    this.isInitialized = false;
  }
}

// Create singleton instance
const edgeCaseHandler = EdgeCaseHandler.getInstance();
export default edgeCaseHandler;
