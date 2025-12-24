import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { networkStatusHandler, pwaInstallPrompt, serviceWorkerUpdateHandler } from '../utils/serviceWorkerRegistration';
import syncManager, { SyncStatus, SyncEvent } from '../services/syncManager';
import { useToast } from '../components/ToastNotification';

interface PWAContextType {
  // Network status
  isOnline: boolean;
  
  // Sync status
  syncStatus: SyncStatus | null;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: Date | null;
  syncErrors: string[];
  
  // PWA features
  canInstall: boolean;
  isInstalled: boolean;
  hasUpdate: boolean;
  
  // Actions
  installApp: () => Promise<boolean>;
  applyUpdate: () => Promise<void>;
  forceSync: () => Promise<void>;
  clearSyncErrors: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  // Network status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  
  // PWA features
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  
  // Toast notifications
  const toast = useToast();
  
  // Track offline toast ID to avoid duplicates
  const [offlineToastId, setOfflineToastId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize PWA status
    initializePWAStatus();
    
    // Set up event listeners
    setupEventListeners();
    
    // Cleanup function
    return () => {
      cleanupEventListeners();
    };
  }, []);

  const initializePWAStatus = async () => {
    try {
      // Get initial sync status
      await updateSyncStatus();
      
      // Check if app is installed
      setIsInstalled(pwaInstallPrompt.isInstalled());
      
      // Check if install prompt is available
      setCanInstall(pwaInstallPrompt.canInstall());
      
      // Check if update is available
      setHasUpdate(serviceWorkerUpdateHandler.hasUpdate());
      
    } catch (error) {
      console.error('[PWAContext] Error initializing PWA status:', error);
    }
  };

  const setupEventListeners = () => {
    // Network status listener
    const handleNetworkChange = (online: boolean) => {
      setIsOnline(online);
      
      if (online) {
        // Connection restored
        if (offlineToastId) {
          toast.removeToast(offlineToastId);
          setOfflineToastId(null);
        }
        toast.showOnlineToast();
      } else {
        // Connection lost
        const toastId = toast.showOfflineToast();
        setOfflineToastId(toastId);
      }
    };

    // Sync event listener
    const handleSyncEvent = (event: SyncEvent) => {
      updateSyncStatus();
      
      switch (event.type) {
        case 'sync_start':
          setIsSyncing(true);
          break;
          
        case 'sync_complete':
          setIsSyncing(false);
          setLastSyncTime(new Date());
          
          if (event.data?.syncErrors?.length > 0) {
            toast.showSyncErrorToast(event.data.syncErrors.length);
          } else if (pendingOperations > 0) {
            toast.showSyncCompleteToast(pendingOperations);
          }
          break;
          
        case 'sync_error':
          setIsSyncing(false);
          toast.showError('Sync Failed', event.error || 'Unknown sync error occurred');
          break;
          
        case 'connection_change':
          // Handled by network status listener
          break;
      }
    };

    // Install prompt listener
    const handleInstallChange = (canInstallApp: boolean) => {
      setCanInstall(canInstallApp);
      
      if (canInstallApp && !isInstalled) {
        // Show install prompt toast
        toast.showInstallPromptToast(installApp);
      }
    };

    // Update listener
    const handleUpdateChange = (hasUpdateAvailable: boolean) => {
      setHasUpdate(hasUpdateAvailable);
      
      if (hasUpdateAvailable) {
        // Show update available toast
        toast.showUpdateAvailableToast(applyUpdate);
      }
    };

    // Add listeners
    networkStatusHandler.addStatusListener(handleNetworkChange);
    syncManager.addSyncListener(handleSyncEvent);
    pwaInstallPrompt.addInstallListener(handleInstallChange);
    serviceWorkerUpdateHandler.addUpdateListener(handleUpdateChange);
  };

  const cleanupEventListeners = () => {
    // Remove listeners would be implemented here
    // For now, the listeners are cleaned up when components unmount
  };

  const updateSyncStatus = async () => {
    try {
      const status = await syncManager.getSyncStatus();
      setSyncStatus(status);
      setIsSyncing(status.isSyncing);
      setPendingOperations(status.pendingOperations);
      setSyncErrors(status.syncErrors);
      
      if (status.lastSyncTime > 0) {
        setLastSyncTime(new Date(status.lastSyncTime));
      }
    } catch (error) {
      console.error('[PWAContext] Error updating sync status:', error);
    }
  };

  const installApp = async (): Promise<boolean> => {
    try {
      const installed = await pwaInstallPrompt.showInstallPrompt();
      if (installed) {
        setIsInstalled(true);
        setCanInstall(false);
        toast.showSuccess('App Installed', 'Nijhum Dip has been installed successfully!');
      }
      return installed;
    } catch (error) {
      console.error('[PWAContext] Error installing app:', error);
      toast.showError('Install Failed', 'Failed to install the app. Please try again.');
      return false;
    }
  };

  const applyUpdate = async (): Promise<void> => {
    try {
      toast.showInfo('Updating App', 'Applying update, please wait...');
      await serviceWorkerUpdateHandler.applyUpdate();
      // Page will reload automatically
    } catch (error) {
      console.error('[PWAContext] Error applying update:', error);
      toast.showError('Update Failed', 'Failed to apply update. Please refresh the page manually.');
    }
  };

  const forceSync = async (): Promise<void> => {
    if (!isOnline) {
      toast.showWarning('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }

    try {
      toast.showInfo('Syncing', 'Forcing data synchronization...');
      await syncManager.forceSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('[PWAContext] Error forcing sync:', error);
      toast.showError('Sync Failed', 'Failed to sync data. Please try again.');
    }
  };

  const clearSyncErrors = () => {
    setSyncErrors([]);
  };

  const contextValue: PWAContextType = {
    // Network status
    isOnline,
    
    // Sync status
    syncStatus,
    isSyncing,
    pendingOperations,
    lastSyncTime,
    syncErrors,
    
    // PWA features
    canInstall,
    isInstalled,
    hasUpdate,
    
    // Actions
    installApp,
    applyUpdate,
    forceSync,
    clearSyncErrors
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAContext;
