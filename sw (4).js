/**
 * EIHA Field Trial Manager — Service Worker
 * Cache-first strategy: app shell served offline, Google Fonts network-first.
 */

const CACHE_NAME = 'eiha-trials-v7.0';
const OFFLINE_URL = './index.html';

// Files to pre-cache on install (app shell)
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: cache-first for app shell, network-first for fonts ─────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Google Fonts — network first, fall through to cache
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        try {
          const networkResponse = await fetch(request);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          return cache.match(request);
        }
      })
    );
    return;
  }

  // App shell and all same-origin assets — cache first, network fallback
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then(networkResponse => {
          // Cache successful same-origin responses
          if (networkResponse.ok && url.origin === self.location.origin) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If navigation fails and we have no cache, serve offline page
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
