/**
 * EIHA Field Trial Manager — Service Worker
 *
 * Navigation requests are network-first so a new version on GitHub Pages is
 * picked up as soon as there's signal, and fall back to the cached shell when
 * there isn't. Everything else is cache-first. Google Fonts are network-first
 * with a cache fallback.
 */

// Bump this on every release. The activate step deletes any cache whose key
// doesn't match, which is what clears out the previous version's files.
const CACHE_NAME = 'eiha-trials-v14.6';
const OFFLINE_URL = './index.html';

// Must succeed or the app can't run offline at all.
const CRITICAL_URLS = [
  './index.html',
  './manifest.json',
];

// Nice to have. A missing icon should not stop the whole install.
const OPTIONAL_URLS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Pre-caching app shell:', CACHE_NAME);
      // addAll is all-or-nothing, so only the files we genuinely need go here.
      await cache.addAll(CRITICAL_URLS);
      // Icons are added one at a time so a wrong path logs a warning instead of
      // silently killing the install and leaving the app with no offline mode.
      await Promise.all(OPTIONAL_URLS.map(u =>
        cache.add(u).catch(err => console.warn('[SW] Optional asset skipped:', u, err))
      ));
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

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Page loads — network first, so a new version on GitHub Pages actually lands.
  // Falls back to the cached shell when there's no signal at the trial.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(OFFLINE_URL, clone));
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

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

  // Everything else (icons, images) — cache first, network fallback
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
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
