// ============================================================
// Quickie Service Worker
// Bump CACHE_VERSION whenever you change cached assets
// ============================================================
const CACHE_VERSION = 'quickie-v2';

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icons/android-chrome-192x192.png',
    '/icons/android-chrome-512x512.png',
    '/icons/apple-touch-icon.png',
    '/icons/favicon-32x32.png',
    '/icons/favicon-16x16.png'
];

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('SW install cache error:', err))
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch strategy:
// - Socket.IO / API calls  → network only (never cache)
// - Static files           → cache first, then network
// - Everything else        → network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Never cache Socket.IO or API calls
    if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/pin') || url.pathname.startsWith('/health')) {
        return; // default browser fetch (network)
    }

    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Serve from cache, refresh in background
                fetch(event.request)
                    .then((res) => {
                        if (res && res.status === 200) {
                            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, res));
                        }
                    })
                    .catch(() => { }); // ignore network errors
                return cached;
            }
            // Not cached → fetch from network
            return fetch(event.request).catch(() => caches.match('/index.html'));
        })
    );
});