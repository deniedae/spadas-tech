const CACHE_NAME = "spadas-ai-v6";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
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

// Activate Event - aggressively wipe ALL legacy caches
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
    }).then(() => self.clients.claim())
  );
});

// Allow client pages to force activation
self.addEventListener("message", (event) => {
  if (event.data && (event.data.type === "SKIP_WAITING" || event.data === "skipWaiting")) {
    self.skipWaiting();
  }
});

// Fetch Event - Network first for all app routes & Next.js chunks, offline fallback only
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" && event.request.method !== "HEAD") {
    return;
  }

  // Never cache API routes, Next.js dynamic assets, or 3rd party providers
  try {
    const url = new URL(event.request.url);
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/auth/") ||
      url.pathname.startsWith("/_next/") ||
      url.hostname.includes("supabase.co") ||
      url.hostname.includes("ebay.com") ||
      url.hostname.includes("googleapis.com")
    ) {
      return; // Direct browser network pass-through
    }
  } catch (e) {}

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Network-first with cache fallback for static shell assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache).catch(() => {});
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
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
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Spadas Lens Alert";
    const options = {
      body: data.body || "New high-margin sold comps detected!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/dashboard",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Spadas Lens", {
        body: text,
        icon: "/icon-192.png",
      })
    );
  }
});

// Notification Click Event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
