// NFC Check-in Service Worker
const CACHE_NAME = 'nfc-checkin-v1';
const STATIC_ASSETS = [
  '/app',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Background Sync - sync location when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-location') {
    event.waitUntil(syncLocation());
  }
});

// Periodic Background Sync - update location periodically
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);
  
  if (event.tag === 'update-location') {
    event.waitUntil(syncLocation());
  }
});

// Function to get current location and send to server
async function syncLocation() {
  try {
    // Get stored user data
    const userData = await getStoredUserData();
    if (!userData || !userData.tagUid) {
      console.log('[SW] No user data stored, skipping sync');
      return;
    }

    // Get current position
    const position = await getCurrentPosition();
    if (!position) {
      console.log('[SW] Could not get position');
      return;
    }

    // Send to server
    const response = await fetch('/api/trpc/userLocation.update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          tagUid: userData.tagUid,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracy: Math.round(position.coords.accuracy),
          deviceInfo: userData.deviceInfo || 'PWA Background Sync',
        }
      }),
    });

    if (response.ok) {
      console.log('[SW] Location synced successfully');
      // Notify the app
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'LOCATION_SYNCED',
            timestamp: new Date().toISOString(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        });
      });
    } else {
      console.error('[SW] Failed to sync location:', response.status);
    }
  } catch (error) {
    console.error('[SW] Error syncing location:', error);
  }
}

// Get current position as a promise
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!self.navigator || !self.navigator.geolocation) {
      reject(new Error('Geolocation not available'));
      return;
    }
    
    self.navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000, // Accept cached position up to 1 minute old
      }
    );
  });
}

// Get stored user data from IndexedDB
async function getStoredUserData() {
  return new Promise((resolve) => {
    const request = indexedDB.open('nfc-checkin-db', 1);
    
    request.onerror = () => resolve(null);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('userData')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['userData'], 'readonly');
      const store = transaction.objectStore('userData');
      const getRequest = store.get('current');
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => resolve(null);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData');
      }
    };
  });
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'STORE_USER_DATA') {
    storeUserData(event.data.userData);
  }
  
  if (event.data.type === 'TRIGGER_SYNC') {
    syncLocation();
  }
});

// Store user data in IndexedDB
async function storeUserData(userData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nfc-checkin-db', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['userData'], 'readwrite');
      const store = transaction.objectStore('userData');
      store.put(userData, 'current');
      
      transaction.oncomplete = () => {
        console.log('[SW] User data stored');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData');
      }
    };
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NFC Check-in';
  const options = {
    body: data.body || 'Atualize sua localização para o check-in automático',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: data,
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes('/app') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/app');
    })
  );
});

console.log('[SW] Service worker loaded');
