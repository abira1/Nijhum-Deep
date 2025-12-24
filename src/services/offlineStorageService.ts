// Offline Storage Service using IndexedDB
// Provides offline data storage and synchronization capabilities

export interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: 'meals' | 'expenses' | 'members';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  id: string;
  data: any;
  timestamp: number;
  lastSync: number;
  isOffline: boolean;
}

class OfflineStorageService {
  private dbName = 'nijhum-dip-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  // Create object stores for different data types
  private createObjectStores(db: IDBDatabase): void {
    // Store for offline meals data
    if (!db.objectStoreNames.contains('meals')) {
      const mealsStore = db.createObjectStore('meals', { keyPath: 'id' });
      mealsStore.createIndex('memberId', 'data.memberId', { unique: false });
      mealsStore.createIndex('date', 'data.date', { unique: false });
      mealsStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Store for offline expenses data
    if (!db.objectStoreNames.contains('expenses')) {
      const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' });
      expensesStore.createIndex('memberId', 'data.memberId', { unique: false });
      expensesStore.createIndex('date', 'data.date', { unique: false });
      expensesStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Store for offline members data
    if (!db.objectStoreNames.contains('members')) {
      const membersStore = db.createObjectStore('members', { keyPath: 'id' });
      membersStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Store for pending operations (sync queue)
    if (!db.objectStoreNames.contains('pendingOperations')) {
      const operationsStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
      operationsStore.createIndex('collection', 'collection', { unique: false });
      operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Store for app metadata
    if (!db.objectStoreNames.contains('metadata')) {
      db.createObjectStore('metadata', { keyPath: 'key' });
    }

    console.log('IndexedDB object stores created');
  }

  // Generic method to store data
  async storeData(collection: string, id: string, data: any, isOffline: boolean = false): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction([collection], 'readwrite');
    const store = transaction.objectStore(collection);

    const offlineData: OfflineData = {
      id,
      data,
      timestamp: Date.now(),
      lastSync: isOffline ? 0 : Date.now(),
      isOffline
    };

    return new Promise((resolve, reject) => {
      const request = store.put(offlineData);
      
      request.onsuccess = () => {
        console.log(`Data stored in ${collection}:`, id);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`Failed to store data in ${collection}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Generic method to retrieve data
  async getData(collection: string, id?: string): Promise<OfflineData | OfflineData[] | null> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction([collection], 'readonly');
    const store = transaction.objectStore(collection);

    return new Promise((resolve, reject) => {
      if (id) {
        // Get specific item
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      } else {
        // Get all items
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      }
    });
  }

  // Delete data
  async deleteData(collection: string, id: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction([collection], 'readwrite');
    const store = transaction.objectStore(collection);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`Data deleted from ${collection}:`, id);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`Failed to delete data from ${collection}:`, request.error);
        reject(request.error);
      };
    });
  }

  // Add operation to sync queue
  async addPendingOperation(operation: Omit<OfflineOperation, 'id'>): Promise<string> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const operationId = `${operation.collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: OfflineOperation = {
      id: operationId,
      ...operation,
      retryCount: 0,
      maxRetries: 3
    };

    const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');

    return new Promise((resolve, reject) => {
      const request = store.add(fullOperation);
      
      request.onsuccess = () => {
        console.log('Pending operation added:', operationId);
        resolve(operationId);
      };
      
      request.onerror = () => {
        console.error('Failed to add pending operation:', request.error);
        reject(request.error);
      };
    });
  }

  // Get all pending operations
  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction(['pendingOperations'], 'readonly');
    const store = transaction.objectStore('pendingOperations');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Remove pending operation
  async removePendingOperation(operationId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');

    return new Promise((resolve, reject) => {
      const request = store.delete(operationId);
      
      request.onsuccess = () => {
        console.log('Pending operation removed:', operationId);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to remove pending operation:', request.error);
        reject(request.error);
      };
    });
  }

  // Update retry count for failed operation
  async updateOperationRetryCount(operationId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(operationId);
      
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.retryCount += 1;
          
          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Operation not found'));
        }
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Store app metadata
  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, timestamp: Date.now() });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get app metadata
  async getMetadata(key: string): Promise<any> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const transaction = this.db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Clear all offline data (useful for logout or reset)
  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const collections = ['meals', 'expenses', 'members', 'pendingOperations', 'metadata'];
    const promises = collections.map(collection => {
      const transaction = this.db!.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('All offline data cleared');
  }

  // Check if we have offline data for a collection
  async hasOfflineData(collection: string): Promise<boolean> {
    try {
      const data = await this.getData(collection) as OfflineData[];
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      console.error('Error checking offline data:', error);
      return false;
    }
  }

  // Get database size (for debugging/monitoring)
  async getDatabaseSize(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    // This is an approximation - actual implementation would need more complex calculation
    const collections = ['meals', 'expenses', 'members', 'pendingOperations', 'metadata'];
    let totalSize = 0;

    for (const collection of collections) {
      try {
        const data = await this.getData(collection) as OfflineData[];
        if (Array.isArray(data)) {
          totalSize += JSON.stringify(data).length;
        }
      } catch (error) {
        console.error(`Error calculating size for ${collection}:`, error);
      }
    }

    return totalSize;
  }
}

// Create singleton instance
const offlineStorageService = new OfflineStorageService();
export default offlineStorageService;
