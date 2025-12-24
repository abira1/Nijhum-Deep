// Nijhum Dip PWA Service Worker
// Version 1.0.0

const CACHE_NAME = 'nijhum-dip-v1';
const STATIC_CACHE_NAME = 'nijhum-dip-static-v1';
const DYNAMIC_CACHE_NAME = 'nijhum-dip-dynamic-v1';
const FIREBASE_CACHE_NAME = 'nijhum-dip-firebase-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/index.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/manifest.json',
  '/offline.html',
  '/browserconfig.xml',
  // App icons
  '/icons/icon-192.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.ico',
  '/icons/play_store_512.png'
];

// Firebase API endpoints to cache
const FIREBASE_API_PATTERNS = [
  /https:\/\/nijhum-dip-default-rtdb\.asia-southeast1\.firebasedatabase\.app/,
  /https:\/\/identitytoolkit\.googleapis\.com/,
  /https:\/\/securetoken\.googleapis\.com/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== FIREBASE_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isFirebaseAPI(request)) {
    event.respondWith(handleFirebaseAPI(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Check if request is for static assets
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico');
}

// Check if request is for Firebase API
function isFirebaseAPI(request) {
  return FIREBASE_API_PATTERNS.some(pattern => pattern.test(request.url));
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving static asset from cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Fetching static asset from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling static asset:', error);
    
    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Handle Firebase API with network-first strategy
async function handleFirebaseAPI(request) {
  try {
    console.log('[SW] Fetching Firebase API from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(FIREBASE_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cached Firebase API response:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for Firebase API:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving Firebase API from cache:', request.url);
      
      // Add custom header to indicate cached response
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    console.error('[SW] No cache available for Firebase API:', error);
    throw error;
  }
}

// Handle dynamic requests with network-first strategy
async function handleDynamicRequest(request) {
  try {
    console.log('[SW] Fetching dynamic request from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for dynamic request:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Background sync event handler
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'firebase-sync') {
    event.waitUntil(handleFirebaseSync());
  }
});

// Handle Firebase background sync
async function handleFirebaseSync() {
  try {
    console.log('[SW] Starting Firebase background sync...');
    
    // Get pending operations from IndexedDB
    const pendingOps = await getPendingOperations();
    
    for (const operation of pendingOps) {
      try {
        await executeOperation(operation);
        await removePendingOperation(operation.id);
        console.log('[SW] Successfully synced operation:', operation.id);
      } catch (error) {
        console.error('[SW] Failed to sync operation:', operation.id, error);
        // Keep operation in queue for retry
      }
    }
    
    console.log('[SW] Firebase background sync completed');
  } catch (error) {
    console.error('[SW] Error during Firebase background sync:', error);
  }
}

// Placeholder functions for IndexedDB operations
// These will be implemented in the offline storage service
async function getPendingOperations() {
  // TODO: Implement IndexedDB query for pending operations
  return [];
}

async function executeOperation(operation) {
  // TODO: Implement operation execution
  console.log('Executing operation:', operation);
}

async function removePendingOperation(operationId) {
  // TODO: Implement IndexedDB operation removal
  console.log('Removing operation:', operationId);
}

// Message event handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service worker script loaded');
