import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import MealSection from './MealSection';
import BazarSection from './BazarSection';
import CalculateSection from './CalculateSection';
import SettingsSection from './SettingsSection';
import AuthScreen from './AuthScreen';
import { MemberProvider } from '../context/MemberContext';
import { MealProvider } from '../context/MealContext';
import { ExpenseProvider } from '../context/ExpenseContext';
import { PWAProvider } from '../context/PWAContext';
import { useToast, ToastContainer } from './ToastNotification';

const AppWrapper: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const toast = useToast();

  // Show loading screen while checking authentication
  if (loading) {
    return <AuthScreen />;
  }

  // Show authentication screen if not logged in
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show main application if authenticated
  return (
    <PWAProvider>
      <MemberProvider>
        <MealProvider>
          <ExpenseProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/meal" replace />} />
                <Route path="/meal" element={<MealSection />} />
                <Route path="/bazar" element={<BazarSection />} />
                <Route path="/calculate" element={<CalculateSection />} />
                <Route path="/settings" element={<SettingsSection />} />
              </Route>
            </Routes>

            {/* Toast Notifications */}
            <ToastContainer
              toasts={toast.toasts}
              onRemoveToast={toast.removeToast}
            />
          </ExpenseProvider>
        </MealProvider>
      </MemberProvider>
    </PWAProvider>
  );
};

export default AppWrapper;
