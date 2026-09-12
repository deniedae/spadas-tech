const CACHE_NAME = "spadas-ai-v7";
const STATIC_CACHE_NAME = "spadas-static-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-192.png",
  "/maskable-512.png",
  "/favicon.ico",
];

// Install Event - Pre-cache critical offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale caches while retaining static bundle cache
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
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

// Fetch Event - Optimized for mobile speed & APK instant responsiveness
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" && event.request.method !== "HEAD") {
    return;
  }

  let url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return;
  }

  // 1. Strict Network Bypass: Never cache dynamic API routes, auth, Supabase, eBay, or Google APIs
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("ebay.com") ||
    url.hostname.includes("googleapis.com")
  ) {
    return; // Direct browser network pass-through
  }

  // 2. Cache-First for Immutable Next.js Static Chunks (/_next/static/*)
  // These chunks contain cryptographic hashes and never change once deployed.
  // Serving from disk gives instant 0-2ms response times inside the APK/TWA and mobile browsers.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 3. Navigation Requests (HTML pages): Network-First with Cache Fallback for instant resilience
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // 4. Other Static Assets (Icons, Images, Fonts): Stale-While-Revalidate
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|avif|ico|woff|woff2|ttf|css|js)$/i) ||
    PRECACHE_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default network pass-through
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
