// Sync Manager Service
// Handles synchronization between offline storage and Firebase

import offlineStorageService, { OfflineOperation, OfflineData } from './offlineStorageService';
import { FirebaseService } from './firebaseService';
import { Meal } from './mealService';
import { Expense } from './expenseService';
import { Member } from './memberService';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: number;
  syncErrors: string[];
}

export interface SyncEvent {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'connection_change';
  data?: any;
  error?: string;
}

class SyncManager {
  private firebaseService = new FirebaseService();
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private syncListeners: ((event: SyncEvent) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeNetworkListeners();
    this.startPeriodicSync();
  }

  // Initialize network event listeners
  private initializeNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[SyncManager] Connection restored');
      this.isOnline = true;
      this.notifyListeners({ type: 'connection_change', data: { isOnline: true } });
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncManager] Connection lost');
      this.isOnline = false;
      this.notifyListeners({ type: 'connection_change', data: { isOnline: false } });
    });
  }

  // Start periodic sync when online
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingOperations();
      }
    }, 30000); // Sync every 30 seconds
  }

  // Stop periodic sync
  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Add sync event listener
  public addSyncListener(listener: (event: SyncEvent) => void): void {
    this.syncListeners.push(listener);
  }

  // Remove sync event listener
  public removeSyncListener(listener: (event: SyncEvent) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  // Notify all listeners of sync events
  private notifyListeners(event: SyncEvent): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[SyncManager] Error in sync listener:', error);
      }
    });
  }

  // Get current sync status
  public async getSyncStatus(): Promise<SyncStatus> {
    const pendingOps = await offlineStorageService.getPendingOperations();
    const lastSyncTime = await offlineStorageService.getMetadata('lastSyncTime') || 0;
    const syncErrors = await offlineStorageService.getMetadata('syncErrors') || [];

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: pendingOps.length,
      lastSyncTime,
      syncErrors
    };
  }

  // Add operation to sync queue
  public async queueOperation(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    collection: 'meals' | 'expenses' | 'members',
    data: any
  ): Promise<void> {
    try {
      await offlineStorageService.addPendingOperation({
        type,
        collection,
        data,
        timestamp: Date.now()
      });

      console.log(`[SyncManager] Queued ${type} operation for ${collection}`);

      // Try to sync immediately if online
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingOperations();
      }
    } catch (error) {
      console.error('[SyncManager] Error queuing operation:', error);
      throw error;
    }
  }

  // Sync all pending operations
  public async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start' });

    try {
      const pendingOps = await offlineStorageService.getPendingOperations();
      console.log(`[SyncManager] Syncing ${pendingOps.length} pending operations`);

      const syncErrors: string[] = [];

      for (const operation of pendingOps) {
        try {
          await this.executeOperation(operation);
          await offlineStorageService.removePendingOperation(operation.id);
          console.log(`[SyncManager] Successfully synced operation: ${operation.id}`);
        } catch (error) {
          console.error(`[SyncManager] Failed to sync operation ${operation.id}:`, error);
          
          // Update retry count
          await offlineStorageService.updateOperationRetryCount(operation.id);
          
          // Remove operation if max retries exceeded
          if (operation.retryCount >= operation.maxRetries) {
            await offlineStorageService.removePendingOperation(operation.id);
            syncErrors.push(`Operation ${operation.id} failed after ${operation.maxRetries} retries`);
          }
        }
      }

      // Update sync metadata
      await offlineStorageService.setMetadata('lastSyncTime', Date.now());
      await offlineStorageService.setMetadata('syncErrors', syncErrors);

      this.notifyListeners({ type: 'sync_complete', data: { syncErrors } });
      console.log('[SyncManager] Sync completed');

    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      this.notifyListeners({ type: 'sync_error', error: error.message });
    } finally {
      this.isSyncing = false;
    }
  }

  // Execute a single operation
  private async executeOperation(operation: OfflineOperation): Promise<void> {
    const { type, collection, data } = operation;

    switch (collection) {
      case 'meals':
        await this.executeMealOperation(type, data);
        break;
      case 'expenses':
        await this.executeExpenseOperation(type, data);
        break;
      case 'members':
        await this.executeMemberOperation(type, data);
        break;
      default:
        throw new Error(`Unknown collection: ${collection}`);
    }
  }

  // Execute meal operations
  private async executeMealOperation(type: string, data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        const mealKey = `${data.memberId}-${data.date}-${data.type}`;
        await this.firebaseService.setData(`meals/${mealKey}`, data);
        break;
      case 'DELETE':
        await this.firebaseService.removeData(`meals/${data.id}`);
        break;
      default:
        throw new Error(`Unsupported meal operation: ${type}`);
    }
  }

  // Execute expense operations
  private async executeExpenseOperation(type: string, data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        await this.firebaseService.pushData('expenses', data);
        break;
      case 'UPDATE':
        await this.firebaseService.setData(`expenses/${data.id}`, data);
        break;
      case 'DELETE':
        await this.firebaseService.removeData(`expenses/${data.id}`);
        break;
      default:
        throw new Error(`Unsupported expense operation: ${type}`);
    }
  }

  // Execute member operations
  private async executeMemberOperation(type: string, data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        await this.firebaseService.pushData('members', data);
        break;
      case 'UPDATE':
        await this.firebaseService.setData(`members/${data.id}`, data);
        break;
      case 'DELETE':
        await this.firebaseService.removeData(`members/${data.id}`);
        break;
      default:
        throw new Error(`Unsupported member operation: ${type}`);
    }
  }

  // Sync data from Firebase to offline storage
  public async syncFromFirebase(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync from Firebase while offline');
    }

    try {
      console.log('[SyncManager] Syncing data from Firebase to offline storage');

      // Sync meals
      const mealsData = await this.firebaseService.getData('meals');
      if (mealsData) {
        const meals = this.firebaseService.objectToArray(mealsData);
        for (const meal of meals) {
          await offlineStorageService.storeData('meals', meal.id, meal, false);
        }
      }

      // Sync expenses
      const expensesData = await this.firebaseService.getData('expenses');
      if (expensesData) {
        const expenses = this.firebaseService.objectToArray(expensesData);
        for (const expense of expenses) {
          await offlineStorageService.storeData('expenses', expense.id, expense, false);
        }
      }

      // Sync members
      const membersData = await this.firebaseService.getData('members');
      if (membersData) {
        const members = this.firebaseService.objectToArray(membersData);
        for (const member of members) {
          await offlineStorageService.storeData('members', member.id, member, false);
        }
      }

      console.log('[SyncManager] Successfully synced data from Firebase');
    } catch (error) {
      console.error('[SyncManager] Error syncing from Firebase:', error);
      throw error;
    }
  }

  // Get offline data for a collection
  public async getOfflineData(collection: 'meals' | 'expenses' | 'members'): Promise<any[]> {
    try {
      const offlineData = await offlineStorageService.getData(collection) as OfflineData[];
      if (!Array.isArray(offlineData)) {
        return [];
      }

      return offlineData.map(item => ({
        id: item.id,
        ...item.data,
        _isOffline: item.isOffline,
        _lastSync: item.lastSync
      }));
    } catch (error) {
      console.error(`[SyncManager] Error getting offline data for ${collection}:`, error);
      return [];
    }
  }

  // Store data offline
  public async storeOfflineData(
    collection: 'meals' | 'expenses' | 'members',
    id: string,
    data: any,
    isOffline: boolean = true
  ): Promise<void> {
    try {
      await offlineStorageService.storeData(collection, id, data, isOffline);
      console.log(`[SyncManager] Stored offline data for ${collection}:`, id);
    } catch (error) {
      console.error(`[SyncManager] Error storing offline data for ${collection}:`, error);
      throw error;
    }
  }

  // Force sync (manual trigger)
  public async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    console.log('[SyncManager] Force sync triggered');
    await this.syncPendingOperations();
  }

  // Clear all sync data (useful for logout)
  public async clearSyncData(): Promise<void> {
    try {
      await offlineStorageService.clearAllData();
      console.log('[SyncManager] All sync data cleared');
    } catch (error) {
      console.error('[SyncManager] Error clearing sync data:', error);
      throw error;
    }
  }

  // Register for background sync (if supported)
  public async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('firebase-sync');
        console.log('[SyncManager] Background sync registered');
      } catch (error) {
        console.error('[SyncManager] Error registering background sync:', error);
      }
    } else {
      console.log('[SyncManager] Background sync not supported');
    }
  }

  // Cleanup resources
  public cleanup(): void {
    this.stopPeriodicSync();
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.syncListeners = [];
  }
}

// Create singleton instance
const syncManager = new SyncManager();
export default syncManager;
