// Service Worker for MusicDott PWA
// Version timestamp forces cache invalidation on each build
const CACHE_VERSION = 'v2-' + '20260118';
const CACHE_NAME = 'musicdott-' + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';

// Resources to cache on install
// NOTE: '/' is intentionally excluded to prevent pinning stale HTML
const STATIC_CACHE_RESOURCES = [
  '/offline.html',
  '/generated-icon.png',
  '/manifest.json'
];

// Install event - cache static resources and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_RESOURCES);
    })
  );
  // Skip waiting to activate new SW immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('musicdott-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - network-first for navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Navigation requests: always network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          // Network failed, serve offline page
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  const url = new URL(event.request.url);
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url.pathname);

  if (isStaticAsset) {
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
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Static asset not available offline
            return new Response('', { status: 404 });
          });
      })
    );
    return;
  }

  // API and other requests: network-only (no caching)
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
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
