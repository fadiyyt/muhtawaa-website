// Service Worker for Muhtawaa Website
// Version 1.0

const CACHE_NAME = 'muhtawaa-v1.0';
const OFFLINE_URL = '/offline.html';

// Resources to cache
const STATIC_CACHE_RESOURCES = [
    '/',
    '/index.html',
    '/style.css',
    '/styles-enhanced.css',
    '/script.js',
    '/articles.json',
    '/offline.html',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap'
];

// Articles to cache
const ARTICLES_TO_CACHE = [
    '/articles/ai-future-work.html',
    '/articles/water-benefits.html',
    '/articles/arab-heritage.html',
    '/articles/time-management.html',
    '/articles/climate-change.html',
    '/articles/cybersecurity.html',
    '/articles/healthy-cooking.html',
    '/articles/sports-mental-health.html',
    '/articles/investment-beginners.html'
];

// Install Event
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        (async () => {
            try {
                // Cache static resources
                const cache = await caches.open(CACHE_NAME);
                
                console.log('Service Worker: Caching static files');
                await cache.addAll(STATIC_CACHE_RESOURCES);
                
                console.log('Service Worker: Caching articles');
                await cache.addAll(ARTICLES_TO_CACHE);
                
                console.log('Service Worker: Installation complete');
                
                // Skip waiting to activate immediately
                self.skipWaiting();
            } catch (error) {
                console.error('Service Worker: Installation failed', error);
            }
        })()
    );
});

// Activate Event
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        (async () => {
            try {
                // Clean up old caches
                const cacheNames = await caches.keys();
                const deletePromises = cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name));
                
                await Promise.all(deletePromises);
                
                console.log('Service Worker: Old caches cleaned');
                
                // Claim all clients
                await self.clients.claim();
                
                console.log('Service Worker: Activation complete');
            } catch (error) {
                console.error('Service Worker: Activation failed', error);
            }
        })()
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension requests
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    event.respondWith(handleFetch(event.request));
});

// Handle fetch requests
async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // Strategy 1: Network first for API calls and dynamic content
        if (url.pathname.includes('/api/') || url.searchParams.has('timestamp')) {
            return await networkFirst(request);
        }
        
        // Strategy 2: Cache first for static assets
        if (isStaticAsset(url.pathname)) {
            return await cacheFirst(request);
        }
        
        // Strategy 3: Stale while revalidate for articles and main pages
        if (url.pathname.includes('/articles/') || url.pathname === '/') {
            return await staleWhileRevalidate(request);
        }
        
        // Default: Network first with cache fallback
        return await networkFirst(request);
        
    } catch (error) {
        console.error('Service Worker: Fetch error', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return await cache.match(OFFLINE_URL) || new Response('Offline');
        }
        
        // Return generic error response
        return new Response('Network error', { status: 503 });
    }
}

// Network First Strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Update cache with fresh response
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache');
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Cache First Strategy
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // If not in cache, fetch from network and cache
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Failed to fetch', request.url);
        throw error;
    }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Fetch fresh version in background
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.log('Service Worker: Background fetch failed', error);
    });
    
    // Return cached version immediately if available, otherwise wait for network
    return cachedResponse || await fetchPromise;
}

// Check if request is for static asset
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Background Sync for offline actions
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'contact-form') {
        event.waitUntil(syncContactForm());
    }
    
    if (event.tag === 'article-interaction') {
        event.waitUntil(syncArticleInteractions());
    }
});

// Sync contact form submissions
async function syncContactForm() {
    try {
        const db = await openDB();
        const tx = db.transaction(['outbox'], 'readonly');
        const store = tx.objectStore('outbox');
        const requests = await store.getAll();
        
        for (const request of requests) {
            if (request.type === 'contact-form') {
                try {
                    await fetch('/api/contact', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(request.data)
                    });
                    
                    // Remove from outbox after successful sync
                    const deleteTx = db.transaction(['outbox'], 'readwrite');
                    await deleteTx.objectStore('outbox').delete(request.id);
                    
                    console.log('Service Worker: Contact form synced');
                } catch (error) {
                    console.error('Service Worker: Failed to sync contact form', error);
                }
            }
        }
    } catch (error) {
        console.error('Service Worker: Sync error', error);
    }
}

// Sync article interactions (likes, bookmarks)
async function syncArticleInteractions() {
    try {
        const db = await openDB();
        const tx = db.transaction(['outbox'], 'readonly');
        const store = tx.objectStore('outbox');
        const requests = await store.getAll();
        
        for (const request of requests) {
            if (request.type === 'article-interaction') {
                try {
                    await fetch('/api/articles/interaction', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(request.data)
                    });
                    
                    // Remove from outbox after successful sync
                    const deleteTx = db.transaction(['outbox'], 'readwrite');
                    await deleteTx.objectStore('outbox').delete(request.id);
                    
                    console.log('Service Worker: Article interaction synced');
                } catch (error) {
                    console.error('Service Worker: Failed to sync article interaction', error);
                }
            }
        }
    } catch (error) {
        console.error('Service Worker: Sync error', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'مقال جديد متوفر على محتوى!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'new-article',
        data: {
            url: '/'
        },
        actions: [
            {
                action: 'open',
                title: 'قراءة المقال',
                icon: '/action-read-icon.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/action-close-icon.png'
            }
        ],
        requireInteraction: false,
        silent: false
    };
    
    event.waitUntil(
        self.registration.showNotification('محتوى - مقال جديد', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'open') {
        const urlToOpen = event.notification.data.url || '/';
        
        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(clientList => {
                // Check if there's already a window/tab open with the target URL
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // If not, open a new window/tab
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// IndexedDB helper function
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('muhtawaa-db', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            
            // Create outbox store for offline actions
            if (!db.objectStoreNames.contains('outbox')) {
                const outboxStore = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
                outboxStore.createIndex('type', 'type', { unique: false });
                outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            // Create preferences store
            if (!db.objectStoreNames.contains('preferences')) {
                db.createObjectStore('preferences', { keyPath: 'key' });
            }
        };
    });
}

// Clean up old data periodically
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEANUP') {
        event.waitUntil(cleanupOldData());
    }
});

async function cleanupOldData() {
    try {
        const db = await openDB();
        const tx = db.transaction(['outbox'], 'readwrite');
        const store = tx.objectStore('outbox');
        
        // Remove items older than 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const oldItems = await store.index('timestamp').getAllKeys(IDBKeyRange.upperBound(sevenDaysAgo));
        
        for (const key of oldItems) {
            await store.delete(key);
        }
        
        console.log('Service Worker: Cleaned up old data');
    } catch (error) {
        console.error('Service Worker: Cleanup failed', error);
    }
}

// Update notification
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('Service Worker: Script loaded successfully');