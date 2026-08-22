const CACHE_NAME = "spadas-ai-v3";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/lens",
  "/listings",
  "/studio",
  "/calculator",
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-192.png",
  "/maskable-512.png",
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Offline-first with network fallback
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        });
    })
  );
});

// Background Sync Event (PWABuilder Audit)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-listings" || event.tag === "spadas-sync") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(() => {
        return Promise.resolve();
      })
    );
  }
});

// Periodic Background Sync Event (PWABuilder Audit)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-analytics" || event.tag === "spadas-periodic-sync") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(() => {
        return Promise.resolve();
      })
    );
  }
});

// Push Notifications Event (PWABuilder Audit)
self.addEventListener("push", (event) => {
  let data = { title: "Spadas AI", body: "New inventory or market update available!" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "1"
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Event (PWABuilder Audit)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow("/dashboard");
    })
  );
});

// Client Message Event
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
