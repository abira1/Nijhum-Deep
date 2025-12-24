// Background Monitoring Service
// Handles background processes for day transitions and monitoring even when app is not in focus

import timeService from './timeService';
import dayFinalizationService from './dayFinalizationService';

export interface BackgroundMonitoringOptions {
  enableVisibilityAPI?: boolean;
  enablePageFocusAPI?: boolean;
  enableServiceWorkerSync?: boolean;
  checkIntervalMs?: number;
  reducedIntervalMs?: number; // Interval when page is not visible
}

export class BackgroundMonitoringService {
  private static instance: BackgroundMonitoringService;
  private isInitialized = false;
  private isMonitoring = false;
  private options: BackgroundMonitoringOptions;
  
  // Monitoring intervals
  private activeInterval: NodeJS.Timeout | null = null;
  private backgroundInterval: NodeJS.Timeout | null = null;
  
  // State tracking
  private isPageVisible = true;
  private isPageFocused = true;
  private lastCheckTime = Date.now();

  private constructor() {
    this.options = {
      enableVisibilityAPI: true,
      enablePageFocusAPI: true,
      enableServiceWorkerSync: true,
      checkIntervalMs: 60000, // 1 minute when active
      reducedIntervalMs: 300000 // 5 minutes when in background
    };
  }

  public static getInstance(): BackgroundMonitoringService {
    if (!BackgroundMonitoringService.instance) {
      BackgroundMonitoringService.instance = new BackgroundMonitoringService();
    }
    return BackgroundMonitoringService.instance;
  }

  // Initialize background monitoring
  public async initialize(options: Partial<BackgroundMonitoringOptions> = {}): Promise<void> {
    if (this.isInitialized) {
      console.warn('[BackgroundMonitoringService] Already initialized');
      return;
    }

    this.options = { ...this.options, ...options };
    this.isInitialized = true;

    console.log('[BackgroundMonitoringService] Initializing background monitoring');

    // Set up visibility API listeners
    if (this.options.enableVisibilityAPI && typeof document !== 'undefined') {
      this.setupVisibilityAPI();
    }

    // Set up focus API listeners
    if (this.options.enablePageFocusAPI && typeof window !== 'undefined') {
      this.setupPageFocusAPI();
    }

    // Set up service worker background sync
    if (this.options.enableServiceWorkerSync) {
      await this.setupServiceWorkerSync();
    }

    // Start monitoring
    this.startMonitoring();
  }

  // Set up Page Visibility API
  private setupVisibilityAPI(): void {
    if (!document.hidden !== undefined) {
      console.warn('[BackgroundMonitoringService] Page Visibility API not supported');
      return;
    }

    const handleVisibilityChange = () => {
      this.isPageVisible = !document.hidden;
      console.log(`[BackgroundMonitoringService] Page visibility changed: ${this.isPageVisible ? 'visible' : 'hidden'}`);
      
      this.adjustMonitoringInterval();
      
      // If page becomes visible, check for missed day transitions
      if (this.isPageVisible) {
        this.checkForMissedTransitions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.isPageVisible = !document.hidden;
  }

  // Set up Page Focus API
  private setupPageFocusAPI(): void {
    const handleFocus = () => {
      this.isPageFocused = true;
      console.log('[BackgroundMonitoringService] Page focused');
      this.adjustMonitoringInterval();
      this.checkForMissedTransitions();
    };

    const handleBlur = () => {
      this.isPageFocused = false;
      console.log('[BackgroundMonitoringService] Page blurred');
      this.adjustMonitoringInterval();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    this.isPageFocused = document.hasFocus();
  }

  // Set up Service Worker background sync
  private async setupServiceWorkerSync(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('[BackgroundMonitoringService] Service Worker background sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Register background sync for day transitions
      await registration.sync.register('day-transition-check');
      console.log('[BackgroundMonitoringService] Background sync registered');
      
      // Listen for sync events
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'day-transition-detected') {
          console.log('[BackgroundMonitoringService] Day transition detected via service worker');
          this.handleBackgroundDayTransition(event.data);
        }
      });
    } catch (error) {
      console.error('[BackgroundMonitoringService] Error setting up service worker sync:', error);
    }
  }

  // Start monitoring
  private startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    console.log('[BackgroundMonitoringService] Starting background monitoring');
    this.isMonitoring = true;
    this.adjustMonitoringInterval();
  }

  // Stop monitoring
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[BackgroundMonitoringService] Stopping background monitoring');
    this.isMonitoring = false;

    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }

    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
  }

  // Adjust monitoring interval based on page visibility and focus
  private adjustMonitoringInterval(): void {
    if (!this.isMonitoring) {
      return;
    }

    // Clear existing intervals
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }

    const isActive = this.isPageVisible && this.isPageFocused;
    const interval = isActive ? this.options.checkIntervalMs! : this.options.reducedIntervalMs!;

    console.log(`[BackgroundMonitoringService] Setting ${isActive ? 'active' : 'background'} monitoring interval: ${interval}ms`);

    const monitoringFunction = () => {
      this.performBackgroundCheck();
    };

    if (isActive) {
      this.activeInterval = setInterval(monitoringFunction, interval);
    } else {
      this.backgroundInterval = setInterval(monitoringFunction, interval);
    }

    // Perform immediate check
    monitoringFunction();
  }

  // Perform background monitoring check
  private performBackgroundCheck(): void {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheckTime;
    
    console.log(`[BackgroundMonitoringService] Performing background check (${timeSinceLastCheck}ms since last check)`);
    
    try {
      // Check if day has changed
      const currentDate = timeService.getCurrentDateString();
      const storedDate = localStorage.getItem('lastKnownDate');
      
      if (storedDate && storedDate !== currentDate) {
        console.log(`[BackgroundMonitoringService] Day transition detected: ${storedDate} -> ${currentDate}`);
        this.handleBackgroundDayTransition({
          previousDate: storedDate,
          currentDate,
          detectedAt: now,
          timeSinceLastCheck
        });
      }
      
      // Update stored date
      localStorage.setItem('lastKnownDate', currentDate);
      this.lastCheckTime = now;
      
    } catch (error) {
      console.error('[BackgroundMonitoringService] Error during background check:', error);
    }
  }

  // Handle day transition detected in background
  private async handleBackgroundDayTransition(data: any): Promise<void> {
    try {
      console.log('[BackgroundMonitoringService] Handling background day transition:', data);
      
      // Trigger day finalization for the previous day
      if (data.previousDate) {
        await dayFinalizationService.finalizeDayMeals(data.previousDate);
      }
      
      // Notify the main time service about the transition
      // This will trigger all registered callbacks
      timeService.startDayMonitoring(1000); // Brief check to trigger callbacks
      
      // Day transition handled without notifications
      
    } catch (error) {
      console.error('[BackgroundMonitoringService] Error handling background day transition:', error);
    }
  }

  // Check for missed transitions (when page becomes visible again)
  private async checkForMissedTransitions(): Promise<void> {
    try {
      console.log('[BackgroundMonitoringService] Checking for missed transitions');
      
      const currentDate = timeService.getCurrentDateString();
      const storedDate = localStorage.getItem('lastKnownDate');
      
      if (storedDate && storedDate !== currentDate) {
        console.log(`[BackgroundMonitoringService] Missed day transition detected: ${storedDate} -> ${currentDate}`);
        
        // Calculate how many days were missed
        const daysDiff = timeService.getDaysDifference(storedDate, currentDate);
        
        // Finalize all missed days
        for (let i = 0; i < daysDiff; i++) {
          const dateToFinalize = timeService.getDateStringFromToday(-daysDiff + i);
          await dayFinalizationService.finalizeDayMeals(dateToFinalize);
        }
        
        // Update stored date
        localStorage.setItem('lastKnownDate', currentDate);
      }
      
    } catch (error) {
      console.error('[BackgroundMonitoringService] Error checking for missed transitions:', error);
    }
  }

  // Notifications disabled per user preference

  // Get monitoring status
  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      isMonitoring: this.isMonitoring,
      isPageVisible: this.isPageVisible,
      isPageFocused: this.isPageFocused,
      lastCheckTime: this.lastCheckTime,
      options: this.options
    };
  }

  // Cleanup
  public cleanup(): void {
    this.stopMonitoring();
    this.isInitialized = false;
  }
}

// Create singleton instance
const backgroundMonitoringService = BackgroundMonitoringService.getInstance();
export default backgroundMonitoringService;
