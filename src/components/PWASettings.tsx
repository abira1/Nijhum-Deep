import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { pwaInstallPrompt, serviceWorkerUpdateHandler } from '../utils/serviceWorkerRegistration';
import syncManager, { SyncStatus, SyncEvent } from '../services/syncManager';
import offlineStorageService from '../services/offlineStorageService';

interface PWASettingsProps {
  className?: string;
}

const PWASettings: React.FC<PWASettingsProps> = ({ className = '' }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    initializePWASettings();
    setupEventListeners();

    return () => {
      // Cleanup listeners
    };
  }, []);

  const initializePWASettings = async () => {
    try {
      // Get sync status (for hidden functionality)
      await updateSyncStatus();

      // Check PWA status
      setCanInstall(pwaInstallPrompt.canInstall());
      setHasUpdate(serviceWorkerUpdateHandler.hasUpdate());
    } catch (error) {
      console.error('Error initializing PWA settings:', error);
    }
  };

  const setupEventListeners = () => {
    // Sync event listener
    const handleSyncEvent = (event: SyncEvent) => {
      updateSyncStatus();
    };

    // Install prompt listener
    const handleInstallChange = (canInstallApp: boolean) => {
      setCanInstall(canInstallApp);
    };

    // Update listener
    const handleUpdateChange = (hasUpdateAvailable: boolean) => {
      setHasUpdate(hasUpdateAvailable);
    };

    // Network status listener
    const handleNetworkChange = (online: boolean) => {
      setIsOnline(online);
    };

    // Add listeners
    syncManager.addSyncListener(handleSyncEvent);
    pwaInstallPrompt.addInstallListener(handleInstallChange);
    serviceWorkerUpdateHandler.addUpdateListener(handleUpdateChange);
  };

  const updateSyncStatus = async () => {
    try {
      const status = await syncManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  };

  const handleInstallApp = async () => {
    try {
      const installed = await pwaInstallPrompt.showInstallPrompt();
      if (installed) {
        setCanInstall(false);
      }
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  const handleApplyUpdate = async () => {
    try {
      await serviceWorkerUpdateHandler.applyUpdate();
    } catch (error) {
      console.error('Error applying update:', error);
    }
  };

  const handleForceSync = async () => {
    if (!isOnline || !syncStatus || syncStatus.isSyncing) {
      return;
    }

    try {
      await syncManager.forceSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('Error forcing sync:', error);
    }
  };

  const handleClearOfflineData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data? This will remove cached meals, expenses, and pending sync operations.')) {
      try {
        await offlineStorageService.clearAllData();
        await updateSyncStatus();
        alert('Offline data cleared successfully.');
      } catch (error) {
        console.error('Error clearing offline data:', error);
        alert('Failed to clear offline data.');
      }
    }
  };

  return (
    <div className={`${className}`}>
      {/* Simple Install App Option */}
      {canInstall && (
        <div className="bg-white border-2 border-black p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2">Install App</h3>
              <p className="text-sm text-gray-600">
                Install Nijhum Dip on your device for a better experience with offline access.
              </p>
            </div>
            <button
              onClick={handleInstallApp}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-medium border-2 border-blue-600 hover:bg-blue-700 transition-colors ml-4"
            >
              <Download className="w-4 h-4" />
              <span>Install</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden functionality - still works but not visible */}
      <div style={{ display: 'none' }}>
        {/* Apply Update */}
        {hasUpdate && (
          <button onClick={handleApplyUpdate}>
            Apply Update
          </button>
        )}

        {/* Force Sync */}
        {isOnline && syncStatus && !syncStatus.isSyncing && (
          <button onClick={handleForceSync}>
            Force Sync
          </button>
        )}

        {/* Clear Offline Data */}
        <button onClick={handleClearOfflineData}>
          Clear Cache
        </button>
      </div>
    </div>
  );
};

export default PWASettings;
