importScripts("https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging.js");

// Initialize Firebase inside the service worker
const firebaseConfig = {
    apiKey: "AIzaSyCKRiwnq4MCYzbQhNj1E9ewfJU9oNksLFs",
    authDomain: "apna-nagar.firebaseapp.com",
    projectId: "apna-nagar",
    storageBucket: "apna-nagar.firebasestorage.app",
    messagingSenderId: "1097716244046",
    appId: "1:1097716244046:web:3b19d31a83cff06214ed1f",
    measurementId: "G-KH5PMYHD9D"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
    console.log("Received background message ", payload);
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/icons/icon-72x72.png", // Ensure this path is correct
    });
});
