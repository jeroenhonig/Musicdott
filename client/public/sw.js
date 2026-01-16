// Service Worker for MusicDott PWA
const CACHE_NAME = 'musicdott-v1';
const OFFLINE_URL = '/offline.html';

// Resources to cache on install
const STATIC_CACHE_RESOURCES = [
  '/',
  '/offline.html',
  '/generated-icon.png',
  '/manifest.json'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_RESOURCES);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            // Only cache GET requests for same origin
            if (event.request.method === 'GET') {
              cache.put(event.request, responseToCache);
            }
          });

          return response;
        })
        .catch(() => {
          // If both cache and network fail, show offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

// Background sync for gamification events
self.addEventListener('sync', (event) => {
  if (event.tag === 'gamification-sync') {
    event.waitUntil(syncGamificationEvents());
  }
});

// Push notifications for teacher feedback
self.addEventListener('push', (event) => {
  const options = {
    body: 'Your teacher has responded to your message!',
    icon: '/generated-icon.png',
    badge: '/generated-icon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Message',
        icon: '/generated-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/generated-icon.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'MusicDott';
  }

  event.waitUntil(
    self.registration.showNotification('MusicDott', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/student/ask-teacher')
    );
  }
});

// Sync gamification events when back online
async function syncGamificationEvents() {
  try {
    const db = await openDB();
    const events = await getAllPendingEvents(db);
    
    for (const event of events) {
      try {
        const response = await fetch('/api/gamification/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
        
        if (response.ok) {
          await removePendingEvent(db, event.id);
        }
      } catch (error) {
        console.error('Failed to sync event:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// IndexedDB helpers for offline gamification
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MusicDottDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingEvents')) {
        db.createObjectStore('pendingEvents', { keyPath: 'id' });
      }
    };
  });
}

function getAllPendingEvents(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingEvents'], 'readonly');
    const store = transaction.objectStore('pendingEvents');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingEvent(db, eventId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingEvents'], 'readwrite');
    const store = transaction.objectStore('pendingEvents');
    const request = store.delete(eventId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}