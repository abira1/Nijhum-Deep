import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { clearSelectedMemberId } from '../utils/memberPersistence';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin email configuration
const ADMIN_EMAIL = 'abirsabirhossain@gmail.com';

// Helper function to check if user is admin
const checkIsAdmin = (email: string | null): boolean => {
  return email === ADMIN_EMAIL;
};

// Helper function to convert Firebase User to AuthUser
const convertToAuthUser = (firebaseUser: User): AuthUser => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    isAdmin: checkIsAdmin(firebaseUser.email)
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      try {
        setError(null);
        if (firebaseUser) {
          const authUser = convertToAuthUser(firebaseUser);
          setUser(authUser);
          console.log('User authenticated:', authUser.email, 'Admin:', authUser.isAdmin);
        } else {
          setUser(null);
          // Clear stored member selection when user signs out
          clearSelectedMemberId();
          console.log('User signed out');
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setError('Authentication error occurred');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      
      const result: UserCredential = await signInWithPopup(auth, googleProvider);
      const authUser = convertToAuthUser(result.user);
      
      console.log('Google sign-in successful:', authUser.email, 'Admin:', authUser.isAdmin);
      
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      // Clear stored member selection before signing out
      clearSelectedMemberId();
      await signOut(auth);
      console.log('User signed out successfully');
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error('Sign-out error:', error);
      setError('Failed to sign out. Please try again.');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hook for admin-only functionality
export const useAdminOnly = (): { isAdmin: boolean; requireAdmin: () => void } => {
  const { isAdmin, user } = useAuth();
  
  const requireAdmin = () => {
    if (!isAdmin) {
      throw new Error('Admin access required. This action is only available to administrators.');
    }
  };
  
  return { isAdmin, requireAdmin };
};

// Helper function to check if a date is today
export const isToday = (date: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return date === today;
};

// Helper function to check if a date is in the past
export const isPastDate = (date: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return date < today;
};

// Helper function to validate meal editing permissions
export const canEditMeal = (date: string, isAdmin: boolean): boolean => {
  // Admin can edit any date
  if (isAdmin) {
    return true;
  }
  
  // Regular users can only edit today's meals
  return isToday(date);
};

export default AuthContext;
