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
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js");

// Firebase Configuration
firebase.initializeApp({
    apiKey: "jIGykfNP8oTM0a3ektrJweyQKbupfH2zE3wKxf9SdMc",
    authDomain: "apna-nagar.firebaseapp.com",
    projectId: "apna-nagar",
    storageBucket: "apna-nagar.appspot.com",
    messagingSenderId: "1097716244046",
    appId: "1:1097716244046:web:3b19d31a83cff06214ed1f",
    measurementId: "G-KH5PMYHD9D",
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
    console.log("📩 Received background message:", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: "/icon.png",
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
self.addEventListener("push", event => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-72x72.png", // Change to your website logo
    });
});

