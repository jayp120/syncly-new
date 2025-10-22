// sw.js - Service Worker

const CACHE_NAME = 'mittaleod-cache-v3'; // Incremented cache version
const urlsToCache = [
  './',
  './index.html',
  // Add other critical assets you want to cache for offline use
  // e.g., './styles.css', './app.js', './manifest.json', './icons/icon-192x192.png'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate worker immediately
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});

// Fetch event: Stale-While-Revalidate strategy
self.addEventListener('fetch', event => {
  // We only want to cache GET requests and ignore chrome extension requests.
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Return from cache, then fetch and update cache in the background.
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Check if we received a valid response to cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.warn('Service Worker: Fetch failed; will rely on cache or browser default.', error);
        });

        // Return cached response immediately if it exists, otherwise wait for network
        return response || fetchPromise;
      });
    })
  );
});


// Push event: Handle incoming push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push event received.', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Syncly Notification', body: event.data.text() };
    }
  }

  const title = data.title || 'Syncly';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || 'icons/icon-192x192.png',
    badge: data.badge || 'icons/icon-badge-72x72.png',
    tag: data.tag || 'mittaleod-notification',
    renotify: !!data.renotify,
    data: data.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notificationclick event: Handle user clicking on a notification
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked.', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          try {
            return client.focus();
          } catch (e) {
            console.error("Error focusing client:", e);
            return clients.openWindow(targetUrl);
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message event (optional): For communication between window clients and the service worker
self.addEventListener('message', event => {
  console.log('Service Worker: Message received.', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});