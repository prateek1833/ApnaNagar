const staticCacheName = 'site-static-v1';
const dynamicCacheName = 'site-dynamic-v1';

const assets = [
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
// self.addEventListener('fetch', evt => {
//     evt.respondWith(
//         caches.match(evt.request).then(cacheRes => {
//             return (
//                 cacheRes ||
//                 fetch(evt.request)
//                     .then(fetchRes => {
//                         return caches.open(dynamicCacheName).then(cache => {
//                             cache.put(evt.request.url, fetchRes.clone());
//                             return fetchRes;
//                         });
//                     })
//             );
//         }).catch(() => {
//             // Optionally provide fallback for offline (e.g., return a custom page).
//         })
//     );
// });

self.addEventListener("push", (event) => {
    if (event.data) {
        const data = event.data.json();

        // Show notification
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: data.icon || "/icons/icon-72x72.png",
                badge: "/icons/badge.png",
                data: { url: data.url },
                requireInteraction: true // Keeps notification visible until user interacts
            })
        );

        // Notify the client to play a sound
        self.clients.matchAll().then((clients) => {
            clients.forEach(client => {
                client.postMessage({ type: "playSound" });
            });
        });
    }
});

// Handle notification click event
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(clients.openWindow(event.notification.data.url));
    }
});

