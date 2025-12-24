// Time Management Service
// Handles timezone detection, day transitions, and date/time utilities

export interface TimeZoneInfo {
  timeZone: string;
  offset: number; // in minutes
  isDST: boolean;
}

export interface DayTransitionEvent {
  previousDate: string;
  currentDate: string;
  timestamp: number;
  timeZone: string;
}

export type DayTransitionCallback = (event: DayTransitionEvent) => void;

export class TimeService {
  private static instance: TimeService;
  private dayTransitionCallbacks: DayTransitionCallback[] = [];
  private currentDate: string;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  private constructor() {
    this.currentDate = this.getCurrentDateString();
  }

  public static getInstance(): TimeService {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }

  // Get current date in YYYY-MM-DD format using local timezone
  public getCurrentDateString(): string {
    const now = new Date();
    return this.formatDateToString(now);
  }

  // Get current time with timezone info
  public getCurrentTime(): Date {
    return new Date();
  }

  // Format date to YYYY-MM-DD string
  public formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Parse date string to Date object (assumes local timezone)
  public parseDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00');
  }

  // Get timezone information
  public getTimeZoneInfo(): TimeZoneInfo {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -now.getTimezoneOffset(); // Convert to positive offset
    
    // Check if DST is active by comparing January and July offsets
    const january = new Date(now.getFullYear(), 0, 1);
    const july = new Date(now.getFullYear(), 6, 1);
    const isDST = now.getTimezoneOffset() !== Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());

    return {
      timeZone,
      offset,
      isDST
    };
  }

  // Check if a date is today
  public isToday(dateString: string): boolean {
    return dateString === this.getCurrentDateString();
  }

  // Check if a date is in the past
  public isPastDate(dateString: string): boolean {
    return dateString < this.getCurrentDateString();
  }

  // Check if a date is in the future
  public isFutureDate(dateString: string): boolean {
    return dateString > this.getCurrentDateString();
  }

  // Get the number of days between two dates
  public getDaysDifference(date1: string, date2: string): number {
    const d1 = this.parseDate(date1);
    const d2 = this.parseDate(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Get time until next midnight in milliseconds
  public getTimeUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    return midnight.getTime() - now.getTime();
  }

  // Get time since last midnight in milliseconds
  public getTimeSinceMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0); // Today's midnight
    return now.getTime() - midnight.getTime();
  }

  // Check if it's currently near midnight (within specified minutes)
  public isNearMidnight(withinMinutes: number = 5): boolean {
    const timeUntilMidnight = this.getTimeUntilMidnight();
    const timeSinceMidnight = this.getTimeSinceMidnight();
    const threshold = withinMinutes * 60 * 1000; // Convert to milliseconds
    
    return timeUntilMidnight <= threshold || timeSinceMidnight <= threshold;
  }

  // Start monitoring for day transitions
  public startDayMonitoring(checkIntervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.warn('[TimeService] Day monitoring is already active');
      return;
    }

    console.log('[TimeService] Starting day transition monitoring');
    this.isMonitoring = true;
    this.currentDate = this.getCurrentDateString();

    this.monitoringInterval = setInterval(() => {
      this.checkForDayTransition();
    }, checkIntervalMs);

    // Also check immediately
    this.checkForDayTransition();
  }

  // Stop monitoring for day transitions
  public stopDayMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[TimeService] Stopping day transition monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Check for day transition and notify callbacks
  private checkForDayTransition(): void {
    const newDate = this.getCurrentDateString();
    
    if (newDate !== this.currentDate) {
      console.log(`[TimeService] Day transition detected: ${this.currentDate} -> ${newDate}`);
      
      const event: DayTransitionEvent = {
        previousDate: this.currentDate,
        currentDate: newDate,
        timestamp: Date.now(),
        timeZone: this.getTimeZoneInfo().timeZone
      };

      // Update current date
      const previousDate = this.currentDate;
      this.currentDate = newDate;

      // Notify all callbacks
      this.dayTransitionCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('[TimeService] Error in day transition callback:', error);
        }
      });
    }
  }

  // Register callback for day transitions
  public onDayTransition(callback: DayTransitionCallback): () => void {
    this.dayTransitionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.dayTransitionCallbacks.indexOf(callback);
      if (index > -1) {
        this.dayTransitionCallbacks.splice(index, 1);
      }
    };
  }

  // Get current monitoring status
  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  // Cleanup resources
  public cleanup(): void {
    this.stopDayMonitoring();
    this.dayTransitionCallbacks = [];
  }

  // Utility method to get a date string for a specific number of days from today
  public getDateStringFromToday(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return this.formatDateToString(date);
  }

  // Get yesterday's date string
  public getYesterdayString(): string {
    return this.getDateStringFromToday(-1);
  }

  // Get tomorrow's date string
  public getTomorrowString(): string {
    return this.getDateStringFromToday(1);
  }

  // Format date for display (e.g., "Monday, January 15, 2025")
  public formatDateForDisplay(dateString: string): string {
    const date = this.parseDate(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Get relative date description (e.g., "Today", "Yesterday", "Tomorrow", or formatted date)
  public getRelativeDateDescription(dateString: string): string {
    const today = this.getCurrentDateString();
    const yesterday = this.getYesterdayString();
    const tomorrow = this.getTomorrowString();

    if (dateString === today) {
      return 'Today';
    } else if (dateString === yesterday) {
      return 'Yesterday';
    } else if (dateString === tomorrow) {
      return 'Tomorrow';
    } else {
      return this.formatDateForDisplay(dateString);
    }
  }
}

// Create singleton instance
const timeService = TimeService.getInstance();
export default timeService;
