import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { networkStatusHandler } from '../utils/serviceWorkerRegistration';
import syncManager, { SyncStatus, SyncEvent } from '../services/syncManager';

interface PWAStatusProps {
  className?: string;
}

const PWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    // Network status listener
    const handleNetworkChange = (online: boolean) => {
      setIsOnline(online);
    };

    // Sync status listener
    const handleSyncEvent = (event: SyncEvent) => {
      updateSyncStatus();

      if (event.type === 'sync_complete') {
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    };

    // Add listeners
    networkStatusHandler.addStatusListener(handleNetworkChange);
    syncManager.addSyncListener(handleSyncEvent);

    // Initial status update
    updateSyncStatus();

    // Cleanup listeners
    return () => {
      networkStatusHandler.removeStatusListener(handleNetworkChange);
      syncManager.removeSyncListener(handleSyncEvent);
    };
  }, []);

  const updateSyncStatus = async () => {
    try {
      const status = await syncManager.getSyncStatus();
      setSyncStatus(status);
      
      if (status.lastSyncTime > 0) {
        setLastSyncTime(new Date(status.lastSyncTime).toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error updating sync status:', error);
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

  const getConnectionIcon = () => {
    if (isOnline) {
      return <Wifi className="w-4 h-4 text-green-600" />;
    } else {
      return <WifiOff className="w-4 h-4 text-red-600" />;
    }
  };

  const getConnectionText = () => {
    return isOnline ? 'Online' : 'Offline';
  };

  const getSyncIcon = () => {
    if (!syncStatus) {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }

    if (syncStatus.isSyncing) {
      return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
    }

    if (syncStatus.pendingOperations > 0) {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }

    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const getSyncText = () => {
    if (!syncStatus) {
      return 'Loading...';
    }

    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }

    if (syncStatus.pendingOperations > 0) {
      return `${syncStatus.pendingOperations} pending`;
    }

    return 'Synced';
  };

  return (
    <div className={`bg-white border-2 border-black ${className}`}>
      {/* Simplified Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-50">
        {/* Left side - Status indicators */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
          {/* Connection Status */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {getConnectionIcon()}
            <span className="text-xs sm:text-sm font-medium">{getConnectionText()}</span>
          </div>

          {/* Sync Status */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {getSyncIcon()}
            <span className="text-xs sm:text-sm">{getSyncText()}</span>
          </div>

          {/* Last Sync Time - Hidden on very small screens */}
          {lastSyncTime && (
            <div className="hidden sm:block text-xs text-gray-500 truncate">
              Last sync: {lastSyncTime}
            </div>
          )}
        </div>

        {/* Right side - Force sync button */}
        <div className="flex items-center flex-shrink-0 ml-2">
          {isOnline && syncStatus && !syncStatus.isSyncing && (
            <button
              onClick={handleForceSync}
              className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors"
              title="Force sync"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile-only last sync time */}
      {lastSyncTime && (
        <div className="sm:hidden px-2 pb-1 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
          Last sync: {lastSyncTime}
        </div>
      )}
    </div>
  );
};

export default PWAStatus;
