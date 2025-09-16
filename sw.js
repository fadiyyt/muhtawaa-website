// Service Worker for Muhtawaa Website - Fixed Version
// Version 1.1 - إصلاح مشاكل التحميل

const CACHE_NAME = 'muhtawaa-v1.1';
const OFFLINE_URL = '/offline.html';

// Resources to cache - تم تقليل القائمة لتجنب المشاكل
const ESSENTIAL_CACHE_RESOURCES = [
    '/',
    '/style.css',
    '/styles-enhanced.css',
    '/script.js',
    '/offline.html',
    '/404.html'
];

// Articles to cache - سيتم تخزينها بشكل منفصل
const ARTICLES_TO_CACHE = [
    '/articles/ai-future-work.html',
    '/articles/water-benefits.html',
    '/articles/arab-heritage.html',
    '/articles/time-management.html'
];

// Install Event - تحسين عملية التثبيت
self.addEventListener('install', event => {
    console.log('Service Worker: Installing v1.1...');
    
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                
                console.log('Service Worker: Caching essential files');
                
                // تخزين الملفات الأساسية بشكل منفصل لتجنب فشل التثبيت
                for (const resource of ESSENTIAL_CACHE_RESOURCES) {
                    try {
                        await cache.add(resource);
                        console.log(`✅ Cached: ${resource}`);
                    } catch (error) {
                        console.warn(`⚠️ Failed to cache: ${resource}`, error);
                    }
                }
                
                // تخزين articles.json بشكل خاص
                try {
                    const response = await fetch('/articles.json');
                    if (response.ok) {
                        await cache.put('/articles.json', response);
                        console.log('✅ Cached: articles.json');
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to cache articles.json:', error);
                }
                
                console.log('Service Worker: Installation complete');
                self.skipWaiting();
                
            } catch (error) {
                console.error('Service Worker: Installation failed', error);
            }
        })()
    );
});

// Activate Event - تنظيف الذاكرة المؤقتة القديمة
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating v1.1...');
    
    event.waitUntil(
        (async () => {
            try {
                // إزالة الذاكرة المؤقتة القديمة
                const cacheNames = await caches.keys();
                const deletePromises = cacheNames
                    .filter(name => name !== CACHE_NAME && name.startsWith('muhtawaa-'))
                    .map(name => {
                        console.log(`Deleting old cache: ${name}`);
                        return caches.delete(name);
                    });
                
                await Promise.all(deletePromises);
                
                console.log('Service Worker: Old caches cleaned');
                await self.clients.claim();
                
                console.log('Service Worker: Activation complete');
            } catch (error) {
                console.error('Service Worker: Activation failed', error);
            }
        })()
    );
});

// Fetch Event - استراتيجية تحسين لتجنب مشاكل التحميل
self.addEventListener('fetch', event => {
    // تجاهل الطلبات غير GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // تجاهل طلبات chrome-extension
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    // تجاهل طلبات من نطاقات خارجية (عدا الخطوط)
    const url = new URL(event.request.url);
    const isExternal = url.origin !== location.origin;
    const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
    
    if (isExternal && !isFont) {
        return;
    }
    
    event.respondWith(handleFetch(event.request));
});

// Handle fetch requests - إستراتيجية محسنة
async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // للصفحة الرئيسية - Network first مع fallback سريع
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return await networkFirstWithTimeout(request, 3000);
        }
        
        // لملف articles.json - دائماً من الشبكة مع fallback
        if (url.pathname === '/articles.json') {
            return await networkFirstForData(request);
        }
        
        // للملفات الثابتة - Cache first
        if (isStaticAsset(url.pathname)) {
            return await cacheFirst(request);
        }
        
        // للمقالات - Cache first مع تحديث في الخلفية
        if (url.pathname.startsWith('/articles/')) {
            return await staleWhileRevalidate(request);
        }
        
        // افتراضي - Network first مع timeout
        return await networkFirstWithTimeout(request, 5000);
        
    } catch (error) {
        console.error('Service Worker: Fetch error for', url.pathname, error);
        
        // إرجاع صفحة offline للتنقل
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            const offlinePage = await cache.match(OFFLINE_URL);
            return offlinePage || new Response('الصفحة غير متوفرة', { 
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
        
        // للطلبات الأخرى
        return new Response('غير متوفر', { 
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

// Network First مع Timeout - لتجنب التعليق
async function networkFirstWithTimeout(request, timeout = 3000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const networkResponse = await fetch(request, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (networkResponse.ok) {
            // تحديث الذاكرة المؤقتة
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone()).catch(err => 
                console.warn('Failed to update cache:', err)
            );
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: Network timeout/failed, trying cache');
        
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Network First للبيانات - لضمان الحصول على أحدث البيانات
async function networkFirstForData(request) {
    try {
        const networkResponse = await fetch(request, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (networkResponse.ok) {
            // تحديث الذاكرة المؤقتة فقط إذا كانت الاستجابة صحيحة
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Service Worker: Network failed for data, trying cache');
        
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('Service Worker: Serving cached data');
            return cachedResponse;
        }
        
        // إرجاع بيانات أساسية إذا لم تتوفر في الذاكرة المؤقتة
        return new Response(JSON.stringify({
            articles: [
                {
                    id: 1,
                    title: "مرحباً بك في موقع محتوى",
                    category: "عام",
                    excerpt: "هذا محتوى احتياطي. يتم تحميله عند عدم توفر الاتصال بالإنترنت.",
                    url: "#",
                    author: "فريق محتوى",
                    publishDate: new Date().toISOString().split('T')[0],
                    readTime: "دقيقة واحدة",
                    tags: ["احتياطي"],
                    featured: true,
                    views: 0,
                    likes: 0
                }
            ],
            metadata: {
                totalArticles: 1,
                lastUpdated: new Date().toISOString(),
                version: "fallback"
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
    }
}

// Cache First Strategy
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
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
    
    // تحديث في الخلفية
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.log('Service Worker: Background fetch failed', error);
    });
    
    // إرجاع النسخة المحفوظة فوراً إن وجدت، وإلا انتظار الشبكة
    return cachedResponse || await fetchPromise;
}

// فحص إذا كان الطلب لملف ثابت
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// معالج رسائل من الصفحة الرئيسية
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(clearAllCaches());
    }
    
    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        event.waitUntil(sendCacheStatus(event));
    }
});

// إرسال حالة الذاكرة المؤقتة
async function sendCacheStatus(event) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        
        event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            data: {
                cacheName: CACHE_NAME,
                cachedUrls: keys.map(request => request.url),
                count: keys.length
            }
        });
    } catch (error) {
        event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            error: error.message
        });
    }
}

// مسح جميع الذاكرة المؤقتة
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Service Worker: All caches cleared');
        
        // إرسال رسالة للصفحات المفتوحة
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'CACHE_CLEARED',
                message: 'تم مسح جميع الذاكرة المؤقتة'
            });
        });
    } catch (error) {
        console.error('Service Worker: Failed to clear caches', error);
    }
}

// تنظيف دوري للذاكرة المؤقتة
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEANUP') {
        event.waitUntil(performCleanup());
    }
});

async function performCleanup() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        // حذف الطلبات القديمة (أكثر من أسبوع)
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response.headers.get('date');
            
            if (dateHeader) {
                const responseDate = new Date(dateHeader).getTime();
                if (responseDate < oneWeekAgo) {
                    await cache.delete(request);
                    console.log(`Cleaned up old cache entry: ${request.url}`);
                }
            }
        }
        
        console.log('Service Worker: Cleanup completed');
    } catch (error) {
        console.error('Service Worker: Cleanup failed', error);
    }
}

// معالج الأخطاء العام
self.addEventListener('error', event => {
    console.error('Service Worker: Error occurred', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Unhandled promise rejection', event.reason);
});

console.log('Service Worker v1.1: Script loaded successfully');
