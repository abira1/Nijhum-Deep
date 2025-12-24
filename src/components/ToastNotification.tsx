import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, WifiOff, Wifi, Download, RefreshCw } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface ToastNotificationProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-close timer
    let autoCloseTimer: NodeJS.Timeout;
    if (!toast.persistent && toast.duration !== 0) {
      autoCloseTimer = setTimeout(() => {
        handleClose();
      }, toast.duration || 5000);
    }

    return () => {
      clearTimeout(timer);
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [toast.duration, toast.persistent]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  }, [toast.id, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      case 'info':
      default:
        return 'border-blue-500';
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'info':
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`
        border-2 border-black shadow-lg
        ${getBorderColor()} ${getBackgroundColor()}
        p-4 font-mono
      `}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-black mb-1">
              {toast.title}
            </div>
            <div className="text-sm text-gray-700">
              {toast.message}
            </div>
            
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className="px-3 py-1 bg-black text-white text-xs font-bold border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-black hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Manager Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, ...toast };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, message, ...options });
  }, [addToast]);

  const showError = useCallback((title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', title, message, ...options });
  }, [addToast]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, message, ...options });
  }, [addToast]);

  // PWA-specific toast methods
  const showOfflineToast = useCallback(() => {
    return addToast({
      type: 'warning',
      title: 'You\'re Offline',
      message: 'Your changes will be saved locally and synced when you\'re back online.',
      duration: 0,
      persistent: true
    });
  }, [addToast]);

  const showOnlineToast = useCallback(() => {
    return addToast({
      type: 'success',
      title: 'Back Online',
      message: 'Connection restored. Syncing your data...',
      duration: 3000
    });
  }, [addToast]);

  const showSyncCompleteToast = useCallback((pendingCount: number) => {
    return addToast({
      type: 'success',
      title: 'Sync Complete',
      message: `Successfully synced ${pendingCount} pending changes.`,
      duration: 3000
    });
  }, [addToast]);

  const showSyncErrorToast = useCallback((errorCount: number) => {
    return addToast({
      type: 'error',
      title: 'Sync Failed',
      message: `${errorCount} operations failed to sync. They will be retried automatically.`,
      duration: 5000
    });
  }, [addToast]);

  const showInstallPromptToast = useCallback((onInstall: () => void) => {
    return addToast({
      type: 'info',
      title: 'Install App',
      message: 'Install Nijhum Dip for a better experience with offline access.',
      action: {
        label: 'Install',
        onClick: onInstall
      },
      duration: 0,
      persistent: true
    });
  }, [addToast]);

  const showUpdateAvailableToast = useCallback((onUpdate: () => void) => {
    return addToast({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of the app is available.',
      action: {
        label: 'Update',
        onClick: onUpdate
      },
      duration: 0,
      persistent: true
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showOfflineToast,
    showOnlineToast,
    showSyncCompleteToast,
    showSyncErrorToast,
    showInstallPromptToast,
    showUpdateAvailableToast
  };
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onClose={onRemoveToast} />
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;
