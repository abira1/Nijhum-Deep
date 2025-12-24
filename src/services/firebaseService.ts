import { 
  ref, 
  push, 
  set, 
  get, 
  remove, 
  onValue, 
  off, 
  DatabaseReference,
  DataSnapshot,
  Unsubscribe
} from 'firebase/database';
import database from '../config/firebase';

// Generic Firebase service class
export class FirebaseService {
  private database = database;

  // Create a reference to a specific path
  createRef(path: string): DatabaseReference {
    return ref(this.database, path);
  }

  // Add data with auto-generated key
  async pushData(path: string, data: any): Promise<string> {
    try {
      const dbRef = ref(this.database, path);
      const newRef = push(dbRef);
      await set(newRef, data);
      return newRef.key!;
    } catch (error) {
      console.error(`Error pushing data to ${path}:`, error);
      throw error;
    }
  }

  // Set data at specific path
  async setData(path: string, data: any): Promise<void> {
    try {
      const dbRef = ref(this.database, path);
      await set(dbRef, data);
    } catch (error) {
      console.error(`Error setting data at ${path}:`, error);
      throw error;
    }
  }

  // Get data once
  async getData(path: string): Promise<any> {
    try {
      const dbRef = ref(this.database, path);
      const snapshot = await get(dbRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`Error getting data from ${path}:`, error);
      throw error;
    }
  }

  // Remove data
  async removeData(path: string): Promise<void> {
    try {
      const dbRef = ref(this.database, path);
      await remove(dbRef);
    } catch (error) {
      console.error(`Error removing data from ${path}:`, error);
      throw error;
    }
  }

  // Listen to data changes
  subscribeToData(
    path: string, 
    callback: (data: any) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    const dbRef = ref(this.database, path);
    
    const unsubscribe = onValue(
      dbRef, 
      (snapshot: DataSnapshot) => {
        const data = snapshot.exists() ? snapshot.val() : null;
        callback(data);
      },
      (error) => {
        console.error(`Error listening to ${path}:`, error);
        if (errorCallback) {
          errorCallback(error);
        }
      }
    );

    return unsubscribe;
  }

  // Unsubscribe from data changes
  unsubscribeFromData(dbRef: DatabaseReference, callback?: (snapshot: DataSnapshot) => void): void {
    off(dbRef, 'value', callback);
  }

  // Convert Firebase object to array with keys
  objectToArray(firebaseObject: any): any[] {
    if (!firebaseObject) return [];
    
    return Object.keys(firebaseObject).map(key => ({
      id: key,
      ...firebaseObject[key]
    }));
  }

  // Convert array to Firebase object format
  arrayToObject(array: any[], keyField: string = 'id'): any {
    const obj: any = {};
    array.forEach(item => {
      const { [keyField]: key, ...data } = item;
      if (key) {
        obj[key] = data;
      }
    });
    return obj;
  }

  // Check if user is online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Get current timestamp
  getTimestamp(): number {
    return Date.now();
  }

  // Format date for Firebase storage
  formatDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  // Generate unique ID
  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

// Create singleton instance
const firebaseService = new FirebaseService();
export default firebaseService;
