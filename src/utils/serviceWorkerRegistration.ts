// Service Worker Registration Utility
// Handles PWA service worker registration and lifecycle

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
};

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service ' +
            'worker. To learn more, visit https://cra.link/PWA'
          );
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW Registration] Service worker registered successfully');
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log(
                '[SW Registration] New content is available and will be used when all ' +
                'tabs for this page are closed. See https://cra.link/PWA.'
              );

              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
              
              if (config && config.onNeedRefresh) {
                config.onNeedRefresh();
              }
            } else {
              console.log('[SW Registration] Content is cached for offline use.');

              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
              
              if (config && config.onOfflineReady) {
                config.onOfflineReady();
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW Registration] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        '[SW Registration] No internet connection found. App is running in offline mode.'
      );
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('[SW Registration] Service worker unregistered');
      })
      .catch((error) => {
        console.error('[SW Registration] Error unregistering service worker:', error);
      });
  }
}

// PWA Install Prompt Handler
export class PWAInstallPrompt {
  private deferredPrompt: any = null;
  private installListeners: ((canInstall: boolean) => void)[] = [];

  constructor() {
    this.initializeInstallPrompt();
  }

  private initializeInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA Install] Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifyListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA Install] App installed successfully');
      this.deferredPrompt = null;
      this.notifyListeners(false);
    });
  }

  public addInstallListener(listener: (canInstall: boolean) => void) {
    this.installListeners.push(listener);
    // Immediately notify if prompt is available
    if (this.deferredPrompt) {
      listener(true);
    }
  }

  public removeInstallListener(listener: (canInstall: boolean) => void) {
    const index = this.installListeners.indexOf(listener);
    if (index > -1) {
      this.installListeners.splice(index, 1);
    }
  }

  private notifyListeners(canInstall: boolean) {
    this.installListeners.forEach(listener => {
      try {
        listener(canInstall);
      } catch (error) {
        console.error('[PWA Install] Error in install listener:', error);
      }
    });
  }

  public async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('[PWA Install] No install prompt available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`[PWA Install] User ${outcome} the install prompt`);
      
      this.deferredPrompt = null;
      this.notifyListeners(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA Install] Error showing install prompt:', error);
      return false;
    }
  }

  public canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  public isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }
}

// Service Worker Update Handler
export class ServiceWorkerUpdateHandler {
  private updateListeners: ((hasUpdate: boolean) => void)[] = [];
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initializeUpdateHandler();
  }

  private initializeUpdateHandler() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        this.registration = registration;
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      });
    }
  }

  public addUpdateListener(listener: (hasUpdate: boolean) => void) {
    this.updateListeners.push(listener);
  }

  public removeUpdateListener(listener: (hasUpdate: boolean) => void) {
    const index = this.updateListeners.indexOf(listener);
    if (index > -1) {
      this.updateListeners.splice(index, 1);
    }
  }

  private notifyListeners(hasUpdate: boolean) {
    this.updateListeners.forEach(listener => {
      try {
        listener(hasUpdate);
      } catch (error) {
        console.error('[SW Update] Error in update listener:', error);
      }
    });
  }

  public async applyUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      console.log('[SW Update] No update available');
      return;
    }

    try {
      // Tell the waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to activate the new service worker
      window.location.reload();
    } catch (error) {
      console.error('[SW Update] Error applying update:', error);
    }
  }

  public hasUpdate(): boolean {
    return this.registration?.waiting !== null;
  }
}

// Network Status Handler
export class NetworkStatusHandler {
  private statusListeners: ((isOnline: boolean) => void)[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    this.initializeNetworkListeners();
  }

  private initializeNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[Network] Connection restored');
      this.isOnline = true;
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      console.log('[Network] Connection lost');
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  public addStatusListener(listener: (isOnline: boolean) => void) {
    this.statusListeners.push(listener);
    // Immediately notify current status
    listener(this.isOnline);
  }

  public removeStatusListener(listener: (isOnline: boolean) => void) {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  private notifyListeners(isOnline: boolean) {
    this.statusListeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('[Network] Error in status listener:', error);
      }
    });
  }

  public getStatus(): boolean {
    return this.isOnline;
  }
}

// Create singleton instances
export const pwaInstallPrompt = new PWAInstallPrompt();
export const serviceWorkerUpdateHandler = new ServiceWorkerUpdateHandler();
export const networkStatusHandler = new NetworkStatusHandler();
