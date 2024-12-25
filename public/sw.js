const staticCacheName = 'site-static-v1';
const dynamicCacheName = 'site-dynamic-v1';

const assets = [
    '/',
    '/items',
    '/js/main.js',
    '/css/style.css',
];

// Install event
self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(staticCacheName).then(cache => {
            console.log("Caching static assets");
            return cache.addAll(assets);
        })
    );
});

// Activate event
self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== staticCacheName && key !== dynamicCacheName)
                    .map(key => caches.delete(key))
            );
        })
    );
    console.log("Service Worker activated");
});

// Fetch event
self.addEventListener('fetch', evt => {
    evt.respondWith(
        caches.match(evt.request).then(cacheRes => {
            return (
                cacheRes ||
                fetch(evt.request)
                    .then(fetchRes => {
                        return caches.open(dynamicCacheName).then(cache => {
                            cache.put(evt.request.url, fetchRes.clone());
                            return fetchRes;
                        });
                    })
            );
        }).catch(() => {
            // Optionally provide fallback for offline (e.g., return a custom page).
        })
    );
});
