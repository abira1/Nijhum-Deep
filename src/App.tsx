import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen';
import LockScreen from './components/LockScreen';
import ScrollbarStyles from './components/ui/ScrollbarStyles';
import { AuthProvider } from './context/AuthContext';
import AppWrapper from './components/AppWrapper';
import { register } from './utils/serviceWorkerRegistration';
import offlineStorageService from './services/offlineStorageService';
import syncManager from './services/syncManager';
import backgroundMonitoringService from './services/backgroundMonitoringService';
import edgeCaseHandler from './services/edgeCaseHandler';

export function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    // Check if database is already unlocked
    const unlocked = localStorage.getItem('nijhum_dip_unlocked');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }

    // Initialize PWA capabilities
    initializePWA();
  }, []);

  const initializePWA = async () => {
    try {
      console.log('[App] Initializing PWA capabilities...');

      // Initialize offline storage
      await offlineStorageService.init();
      console.log('[App] Offline storage initialized');

      // Register service worker
      register({
        onSuccess: (registration) => {
          console.log('[App] Service worker registered successfully');
          setIsOfflineReady(true);
        },
        onUpdate: (registration) => {
          console.log('[App] New content available, please refresh');
          // You can show a notification to user here
        },
        onOfflineReady: () => {
          console.log('[App] App is ready for offline use');
          setIsOfflineReady(true);
        },
        onNeedRefresh: () => {
          console.log('[App] New version available');
          // You can show an update notification here
        }
      });

      // Register background sync if supported
      await syncManager.registerBackgroundSync();

      // Initialize background monitoring service
      await backgroundMonitoringService.initialize({
        enableVisibilityAPI: true,
        enablePageFocusAPI: true,
        enableServiceWorkerSync: true,
        checkIntervalMs: 60000, // 1 minute when active
        reducedIntervalMs: 300000 // 5 minutes when in background
      });

      // Background monitoring initialized without notifications

      // Initialize edge case handler
      edgeCaseHandler.initialize();

      console.log('[App] PWA initialization completed');
    } catch (error) {
      console.error('[App] Error initializing PWA:', error);
      // Continue without PWA features
      setIsOfflineReady(true);
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return <>
      <ScrollbarStyles />
      <LoadingScreen onLoadingComplete={handleLoadingComplete} />
      {!isLoading && <BrowserRouter>
          <AuthProvider>
            <AppWrapper />
          </AuthProvider>
        </BrowserRouter>}
    </>;
}