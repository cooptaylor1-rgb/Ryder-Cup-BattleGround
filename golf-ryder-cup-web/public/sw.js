/**
 * Service Worker for Golf Ryder Cup PWA
 *
 * Implements offline-first caching strategy for the app shell
 * and API responses. Critical for golf course usage without signal.
 */

const CACHE_NAME = 'golf-ryder-cup-v1';
const STATIC_CACHE = 'golf-ryder-cup-static-v1';

// App shell - always cache these for offline
const APP_SHELL = [
    '/',
    '/score',
    '/standings',
    '/matchups',
    '/more',
    '/players',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Files that should always be served from network first
const NETWORK_FIRST = [
    '/api/',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching app shell...');
            return cache.addAll(APP_SHELL);
        })
    );

    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );

    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Network first for API calls
    if (NETWORK_FIRST.some(path => url.pathname.startsWith(path))) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Always prefer network for document navigations to avoid stale HTML/chunk mismatches
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(networkFirstNoCache(request));
        return;
    }

    // Cache first for static assets
    if (
        url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/) ||
        url.pathname.startsWith('/_next/static/')
    ) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Stale-while-revalidate for pages
    event.respondWith(staleWhileRevalidate(request));
});

/**
 * Cache-first strategy
 * Best for static assets that rarely change
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        await putInCache(STATIC_CACHE, request, response);
        return response;
    } catch (error) {
        console.error('[SW] Cache-first fetch failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy
 * Best for API calls where fresh data is important
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        // Clone before caching since body can only be consumed once
        if (response.ok) {
            putInCache(CACHE_NAME, request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[SW] Network failed, trying cache...');
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

/**
 * Stale-while-revalidate strategy
 * Best for pages - show cached version immediately, update in background
 */
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const fetchPromise = fetch(request).then((response) => {
        // Clone before caching since body can only be consumed once
        if (response.ok) {
            putInCache(CACHE_NAME, request, response.clone());
        }
        return response;
    }).catch((error) => {
        console.log('[SW] Revalidation failed:', error);
        return null;
    });

    // Return cached response immediately if available
    if (cached) {
        // Update cache in background (don't wait)
        fetchPromise.catch(() => { });
        return cached;
    }

    // Otherwise wait for network
    const response = await fetchPromise;
    if (response) {
        return response;
    }

    // Final fallback - offline page
    return new Response('Offline - Golf Ryder Cup App', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
    });
}

/**
 * Network-first for navigations without caching HTML
 */
async function networkFirstNoCache(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        return new Response('Offline - Golf Ryder Cup App', {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
        });
    }
}

/**
 * Safely cache responses
 */
async function putInCache(cacheName, request, response) {
    // Response should already be cloned before calling this function
    if (!response || !response.ok) {
        return;
    }

    try {
        const cache = await caches.open(cacheName);
        // Response passed in should already be a clone
        await cache.put(request, response);
    } catch (error) {
        console.warn('[SW] Cache put failed:', error);
    }
}

// Handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background sync for score uploads when back online
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-scores') {
        console.log('[SW] Background sync: uploading scores...');
        // Phase 2: Implement score sync with server
    }
});

console.log('[SW] Service worker loaded');
