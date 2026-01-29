/**
 * Service Worker for Golf Ryder Cup PWA
 *
 * Implements offline-first caching strategy for the app shell
 * and API responses. Critical for golf course usage without signal.
 *
 * iOS Safari Hardening:
 * - iOS Safari can evict caches after 7 days of inactivity
 * - This SW implements cache refresh on every visit to keep caches alive
 * - Periodic ping messages help keep the SW active
 *
 * Cache Versioning:
 * - BUILD_HASH is injected during build process
 * - Falls back to timestamp-based versioning for dev
 */

// Build hash is injected by build process, fallback to timestamp for dev
const BUILD_HASH = self.__BUILD_HASH__ || Date.now().toString(36);
const CACHE_VERSION = 2;
const CACHE_NAME = `golf-ryder-cup-v${CACHE_VERSION}-${BUILD_HASH}`;
const STATIC_CACHE = `golf-ryder-cup-static-v${CACHE_VERSION}-${BUILD_HASH}`;

// Track last cache refresh time
let lastCacheRefresh = Date.now();

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
  '/offline.html', // Offline fallback page
];

// Files that should always be served from network first
const NETWORK_FIRST = ['/api/'];

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
  if (NETWORK_FIRST.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Always prefer network for document navigations to avoid stale HTML/chunk mismatches
  if (request.mode === 'navigate' || request.destination === 'document') {
    if (url.pathname.startsWith('/score/')) {
      // Cache match pages so recently viewed matches work offline
      event.respondWith(networkFirst(request));
      return;
    }
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
    if (response.ok) {
      // Clone response BEFORE caching - body can only be consumed once
      const responseToCache = response.clone();
      putInCache(STATIC_CACHE, request, responseToCache);
    }
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

  const fetchPromise = fetch(request)
    .then((response) => {
      // Clone before caching since body can only be consumed once
      if (response.ok) {
        putInCache(CACHE_NAME, request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.log('[SW] Revalidation failed:', error);
      return null;
    });

  // Return cached response immediately if available
  if (cached) {
    // Update cache in background (don't wait)
    fetchPromise.catch(() => {});
    return cached;
  }

  // Otherwise wait for network
  const response = await fetchPromise;
  if (response) {
    return response;
  }

  // Final fallback - offline page
  return await serveOfflinePage();
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
    return await serveOfflinePage();
  }
}

/**
 * Serve the offline fallback page
 */
async function serveOfflinePage() {
  // Try to get the cached offline page
  const offlinePage = await caches.match('/offline.html');
  if (offlinePage) {
    return offlinePage;
  }

  // Fallback to inline HTML if offline page not cached
  return new Response(
    `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="theme-color" content="#006644">
            <title>Offline - Golf Ryder Cup</title>
            <style>
                body {
                    font-family: -apple-system, system-ui, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: #fdfcfa;
                    color: #1c1917;
                    text-align: center;
                    padding: 24px;
                }
                h1 { font-size: 24px; margin: 0 0 12px; color: #006644; }
                p { color: #57534e; margin: 0 0 24px; }
                button {
                    background: #006644;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <h1>You're Offline</h1>
            <p>Your scores are saved locally and will sync when you're back online.</p>
            <button onclick="location.reload()">Try Again</button>
        </body>
        </html>
    `,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    }
  );
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
    return;
  }

  // iOS Safari keep-alive ping
  // Client should send this periodically to prevent SW from going idle
  if (event.data?.type === 'KEEP_ALIVE') {
    event.ports?.[0]?.postMessage({ status: 'alive', timestamp: Date.now() });
    return;
  }

  // Cache refresh request - used to keep iOS Safari caches fresh
  if (event.data?.type === 'REFRESH_CACHE') {
    event.waitUntil(refreshAppShellCache());
    return;
  }

  // Get cache status for debugging
  if (event.data?.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      getCacheStatus().then((status) => {
        event.ports?.[0]?.postMessage(status);
      })
    );
    return;
  }
});

/**
 * Refresh the app shell cache
 * Critical for iOS Safari which may evict caches after 7 days
 */
async function refreshAppShellCache() {
  const now = Date.now();
  const hoursSinceLastRefresh = (now - lastCacheRefresh) / (1000 * 60 * 60);

  // Only refresh if more than 1 hour since last refresh
  if (hoursSinceLastRefresh < 1) {
    console.log('[SW] Cache refresh skipped - too recent');
    return;
  }

  console.log('[SW] Refreshing app shell cache for iOS Safari longevity');

  try {
    const cache = await caches.open(STATIC_CACHE);

    // Re-fetch each app shell resource to keep cache fresh
    const refreshPromises = APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) {
          await cache.put(url, response);
          return { url, success: true };
        }
        return { url, success: false, reason: `HTTP ${response.status}` };
      } catch (error) {
        // Keep existing cached version if fetch fails
        return { url, success: false, reason: error.message };
      }
    });

    const results = await Promise.allSettled(refreshPromises);
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    lastCacheRefresh = now;
    console.log(
      `[SW] Cache refresh complete: ${successful}/${APP_SHELL.length} resources refreshed`
    );

    // Notify clients of refresh
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'CACHE_REFRESHED',
        timestamp: now,
        refreshed: successful,
        total: APP_SHELL.length,
      });
    }
  } catch (error) {
    console.error('[SW] Cache refresh failed:', error);
  }
}

/**
 * Get current cache status for debugging
 */
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {
      version: CACHE_VERSION,
      lastRefresh: lastCacheRefresh,
      caches: [],
    };

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      status.caches.push({
        name,
        entries: keys.length,
        urls: keys.slice(0, 10).map((req) => req.url), // Only first 10
      });
    }

    return status;
  } catch (error) {
    return { error: error.message };
  }
}

// Background sync for score uploads when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    console.log('[SW] Background sync: uploading scores...');
    event.waitUntil(syncScoresToServer());
  }
});

/**
 * Sync pending scores to the server
 * Called by Background Sync API when connection is restored
 */
async function syncScoresToServer() {
  try {
    // Open IndexedDB to get pending scores
    const dbRequest = indexedDB.open('GolfRyderCupDB');

    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);
      dbRequest.onsuccess = async () => {
        const idb = dbRequest.result;

        // Check if scoringEvents store exists
        if (!idb.objectStoreNames.contains('scoringEvents')) {
          console.log('[SW] No scoringEvents store found');
          resolve();
          return;
        }

        const tx = idb.transaction('scoringEvents', 'readwrite');
        const store = tx.objectStore('scoringEvents');

        // Get all unsynced events using the synced index
        const index = store.index('synced');
        const request = index.getAll(IDBKeyRange.only(0)); // synced === false (0)

        request.onsuccess = async () => {
          const pendingEvents = request.result || [];

          if (pendingEvents.length === 0) {
            console.log('[SW] No pending scores to sync');
            resolve();
            return;
          }

          console.log(`[SW] Syncing ${pendingEvents.length} pending scoring events`);

          // Group events by match
          const eventsByMatch = new Map();
          for (const event of pendingEvents) {
            const existing = eventsByMatch.get(event.matchId) || [];
            existing.push(event);
            eventsByMatch.set(event.matchId, existing);
          }

          // Sync each match's events
          const results = [];
          for (const [matchId, events] of eventsByMatch) {
            try {
              const response = await fetch('/api/sync/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  matchId,
                  events: events.map((e) => ({
                    id: e.id,
                    type: e.eventType,
                    holeNumber: e.holeNumber,
                    data: e.data,
                    timestamp: e.timestamp,
                  })),
                }),
              });

              if (response.ok) {
                // Mark events as synced
                const updateTx = idb.transaction('scoringEvents', 'readwrite');
                const updateStore = updateTx.objectStore('scoringEvents');
                for (const event of events) {
                  event.synced = true;
                  updateStore.put(event);
                }
                results.push({ matchId, success: true, count: events.length });
                console.log(`[SW] Synced ${events.length} events for match ${matchId}`);
              } else {
                results.push({ matchId, success: false, error: `HTTP ${response.status}` });
              }
            } catch (error) {
              results.push({ matchId, success: false, error: error.message });
              console.error(`[SW] Failed to sync match ${matchId}:`, error);
            }
          }

          // Notify clients of sync completion
          const clients = await self.clients.matchAll();
          for (const client of clients) {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              results,
            });
          }

          resolve();
        };

        request.onerror = () => reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

console.log('[SW] Service worker loaded');
