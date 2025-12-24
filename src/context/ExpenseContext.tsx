import React, { useEffect, useState, createContext, useContext } from 'react';
import expenseService, { Expense } from '../services/expenseService';
import { Unsubscribe } from 'firebase/database';
import { useAuth } from './AuthContext';

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => Promise<void>;
  getTotalExpenseByMember: (memberId: string, month: number, year: number) => number;
  getTotalExpense: (month: number, year: number) => number;
  canEditExpense: boolean;
  canDeleteExpense: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const { isAuthenticated, loading: authLoading, user, isAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const initializeExpenses = async () => {
      // Don't initialize expenses if user is not authenticated
      if (!isAuthenticated) {
        setExpenses([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if there are expenses in localStorage to migrate
        const savedExpenses = localStorage.getItem('expenses');
        if (savedExpenses) {
          const localExpenses = JSON.parse(savedExpenses);
          if (localExpenses.length > 0) {
            console.log('Migrating expenses from localStorage to Firebase...');
            await expenseService.importExpenses(localExpenses);
            localStorage.removeItem('expenses'); // Remove after successful migration
            console.log('Expenses migrated successfully');
          }
        }

        // Subscribe to real-time updates
        unsubscribe = expenseService.subscribeToExpenses(
          (updatedExpenses) => {
            setExpenses(updatedExpenses);
            setLoading(false);
          },
          (error) => {
            console.error('Error subscribing to expenses:', error);
            setError('Failed to load expenses. Please check your connection.');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error initializing expenses:', error);
        setError('Failed to initialize expenses. Please refresh the page.');
        setLoading(false);
      }
    };

    // Only initialize expenses after auth loading is complete
    if (!authLoading) {
      initializeExpenses();
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, authLoading]);
  const addExpense = async (expense: Omit<Expense, 'id'>): Promise<void> => {
    try {
      setError(null);
      await expenseService.addExpense(expense);
    } catch (error) {
      console.error('Error adding expense:', error);
      setError('Failed to add expense. Please try again.');
      throw error;
    }
  };

  const removeExpense = async (id: string): Promise<void> => {
    try {
      setError(null);
      await expenseService.removeExpense(id, isAdmin);
    } catch (error) {
      console.error('Error removing expense:', error);
      setError('Failed to remove expense. Please try again.');
      throw error;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Omit<Expense, 'id'>>): Promise<void> => {
    try {
      setError(null);
      await expenseService.updateExpense(id, updates, isAdmin);
    } catch (error) {
      console.error('Error updating expense:', error);
      setError('Failed to update expense. Please try again.');
      throw error;
    }
  };

  const getTotalExpenseByMember = (memberId: string, month: number, year: number): number => {
    return expenseService.getTotalExpenseByMember(expenses, memberId, month, year);
  };

  const getTotalExpense = (month: number, year: number): number => {
    return expenseService.getTotalExpense(expenses, month, year);
  };

  // Check permissions
  const canEditExpense = expenseService.canEditExpense(user?.email || null);
  const canDeleteExpense = expenseService.canDeleteExpense(user?.email || null);

  return <ExpenseContext.Provider value={{
    expenses,
    loading,
    error,
    addExpense,
    removeExpense,
    updateExpense,
    getTotalExpenseByMember,
    getTotalExpense,
    canEditExpense,
    canDeleteExpense
  }}>
      {children}
    </ExpenseContext.Provider>;
};
export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};