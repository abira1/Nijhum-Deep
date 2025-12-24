import firebaseService from './firebaseService';
import { Unsubscribe } from 'firebase/database';
import syncManager from './syncManager';
import offlineStorageService from './offlineStorageService';

export interface Expense {
  id: string;
  memberId: string;
  itemName: string;
  quantity: string;
  price: number;
  date: string;
  timestamp?: number;
}

export class ExpenseService {
  private basePath = 'expenses';

  // Admin email configuration
  private readonly ADMIN_EMAIL = 'abirsabirhossain@gmail.com';

  // Helper function to check if user is admin
  private isAdmin(userEmail: string | null): boolean {
    return userEmail === this.ADMIN_EMAIL;
  }

  // Validate expense editing permissions
  private validateExpenseEditPermission(isAdmin: boolean): void {
    if (!isAdmin) {
      throw new Error('Access denied. Only administrators can edit or delete expense records.');
    }
  }

  // Validate expense deletion permissions
  private validateExpenseDeletePermission(isAdmin: boolean): void {
    if (!isAdmin) {
      throw new Error('Access denied. Only administrators can delete expense records.');
    }
  }

  // Public method to check if user can edit expenses
  public canEditExpense(userEmail: string | null): boolean {
    return this.isAdmin(userEmail);
  }

  // Public method to check if user can delete expenses
  public canDeleteExpense(userEmail: string | null): boolean {
    return this.isAdmin(userEmail);
  }

  // Add a new expense (offline-capable)
  async addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
    try {
      const expenseData = {
        ...expense,
        timestamp: firebaseService.getTimestamp()
      };

      // Check if we're online
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Use Firebase directly
        const expenseId = await firebaseService.pushData(this.basePath, expenseData);
        // Store in offline storage for caching
        await offlineStorageService.storeData('expenses', expenseId, { id: expenseId, ...expenseData }, false);
        return expenseId;
      } else {
        // Offline: Generate temporary ID and store locally
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await offlineStorageService.storeData('expenses', tempId, { id: tempId, ...expenseData }, true);
        // Queue create operation for sync
        await syncManager.queueOperation('CREATE', 'expenses', expenseData);
        return tempId;
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }

  // Remove an expense (admin-only with offline support)
  async removeExpense(id: string, isAdmin: boolean = false): Promise<void> {
    try {
      // Validate permissions
      this.validateExpenseDeletePermission(isAdmin);

      // Check if we're online
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Use Firebase directly
        await firebaseService.removeData(`${this.basePath}/${id}`);
        // Also remove from offline storage
        await offlineStorageService.deleteData('expenses', id);
      } else {
        // Offline: Remove from offline storage and queue for sync
        await offlineStorageService.deleteData('expenses', id);
        // Queue delete operation for sync
        await syncManager.queueOperation('DELETE', 'expenses', { id });
      }
    } catch (error) {
      console.error('Error removing expense:', error);
      throw error;
    }
  }

  // Get all expenses (offline-capable)
  async getAllExpenses(): Promise<Expense[]> {
    try {
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Try Firebase first, fallback to offline storage
        try {
          const expensesData = await firebaseService.getData(this.basePath);
          const expenses = expensesData ? Object.keys(expensesData).map(key => ({
            id: key,
            ...expensesData[key]
          })) : [];

          // Update offline storage with fresh data
          for (const expense of expenses) {
            await offlineStorageService.storeData('expenses', expense.id, expense, false);
          }

          return expenses;
        } catch (error) {
          console.warn('Firebase failed, falling back to offline storage:', error);
          return await this.getOfflineExpenses();
        }
      } else {
        // Offline: Use offline storage only
        return await this.getOfflineExpenses();
      }
    } catch (error) {
      console.error('Error getting all expenses:', error);
      throw error;
    }
  }

  // Get expenses from offline storage
  private async getOfflineExpenses(): Promise<Expense[]> {
    try {
      const offlineExpenses = await syncManager.getOfflineData('expenses');
      return offlineExpenses.map(item => ({
        id: item.id,
        memberId: item.memberId,
        itemName: item.itemName,
        quantity: item.quantity,
        price: item.price,
        date: item.date,
        timestamp: item.timestamp,
        _isOffline: item._isOffline
      }));
    } catch (error) {
      console.error('Error getting offline expenses:', error);
      return [];
    }
  }

  // Get total expense by member for a specific month/year
  getTotalExpenseByMember(expenses: Expense[], memberId: string, month: number, year: number): number {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expense.memberId === memberId && 
             expenseDate.getMonth() === month && 
             expenseDate.getFullYear() === year;
    }).reduce((total, expense) => total + expense.price, 0);
  }

  // Get total expense for a specific month/year
  getTotalExpense(expenses: Expense[], month: number, year: number): number {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === month && 
             expenseDate.getFullYear() === year;
    }).reduce((total, expense) => total + expense.price, 0);
  }

  // Subscribe to real-time expense updates
  subscribeToExpenses(
    callback: (expenses: Expense[]) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    return firebaseService.subscribeToData(
      this.basePath,
      (data) => {
        const expenses = data ? firebaseService.objectToArray(data) : [];
        callback(expenses);
      },
      errorCallback
    );
  }

  // Get expenses for a specific member
  async getExpensesForMember(memberId: string): Promise<Expense[]> {
    try {
      const allExpenses = await this.getAllExpenses();
      return allExpenses.filter(expense => expense.memberId === memberId);
    } catch (error) {
      console.error('Error getting expenses for member:', error);
      throw error;
    }
  }

  // Get expenses for a specific date range
  getExpensesForDateRange(expenses: Expense[], startDate: string, endDate: string): Expense[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= start && expenseDate <= end;
    });
  }

  // Remove all expenses for a member (useful when removing a member)
  async removeExpensesForMember(memberId: string): Promise<void> {
    try {
      const memberExpenses = await this.getExpensesForMember(memberId);
      const removePromises = memberExpenses.map(expense => 
        this.removeExpense(expense.id)
      );
      await Promise.all(removePromises);
    } catch (error) {
      console.error('Error removing expenses for member:', error);
      throw error;
    }
  }

  // Bulk import expenses (useful for migration from localStorage)
  async importExpenses(expenses: Expense[]): Promise<void> {
    try {
      const importPromises = expenses.map(expense => {
        const expenseData = {
          memberId: expense.memberId,
          itemName: expense.itemName,
          quantity: expense.quantity,
          price: expense.price,
          date: expense.date,
          timestamp: expense.timestamp || firebaseService.getTimestamp()
        };
        return firebaseService.pushData(this.basePath, expenseData);
      });
      
      await Promise.all(importPromises);
    } catch (error) {
      console.error('Error importing expenses:', error);
      throw error;
    }
  }

  // Update an expense (admin-only with offline support)
  async updateExpense(id: string, updates: Partial<Omit<Expense, 'id'>>, isAdmin: boolean = false): Promise<void> {
    try {
      // Validate permissions
      this.validateExpenseEditPermission(isAdmin);

      const updatedData = {
        ...updates,
        timestamp: firebaseService.getTimestamp()
      };

      // Check if we're online
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Use Firebase directly
        await firebaseService.setData(`${this.basePath}/${id}`, updatedData);
        // Update offline storage
        const existingData = await offlineStorageService.getData('expenses', id);
        if (existingData) {
          await offlineStorageService.storeData('expenses', id, { ...existingData.data, ...updatedData }, false);
        }
      } else {
        // Offline: Update offline storage and queue for sync
        const existingData = await offlineStorageService.getData('expenses', id);
        if (existingData) {
          await offlineStorageService.storeData('expenses', id, { ...existingData.data, ...updatedData }, true);
          // Queue update operation for sync
          await syncManager.queueOperation('UPDATE', 'expenses', { id, ...updatedData });
        }
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  // Get expenses summary for a month
  getMonthlyExpenseSummary(expenses: Expense[], month: number, year: number) {
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
    });

    const totalAmount = monthlyExpenses.reduce((sum, expense) => sum + expense.price, 0);
    const expensesByMember = monthlyExpenses.reduce((acc, expense) => {
      if (!acc[expense.memberId]) {
        acc[expense.memberId] = 0;
      }
      acc[expense.memberId] += expense.price;
      return acc;
    }, {} as Record<string, number>);

    const expensesByCategory = monthlyExpenses.reduce((acc, expense) => {
      if (!acc[expense.itemName]) {
        acc[expense.itemName] = 0;
      }
      acc[expense.itemName] += expense.price;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAmount,
      totalCount: monthlyExpenses.length,
      expensesByMember,
      expensesByCategory,
      expenses: monthlyExpenses
    };
  }
}

// Create singleton instance
const expenseService = new ExpenseService();
export default expenseService;
