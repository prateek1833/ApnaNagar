// Example starter JavaScript for disabling form submissions if there are invalid fields
(function () {
    'use strict'

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.prototype.slice.call(forms)
        .forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    event.stopPropagation()
                }

                form.classList.add('was-validated')
            }, false)
        })
})()

importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js");

// Firebase Configuration
firebase.initializeApp({
    apiKey: "AIzaSyCKRiwnq4MCYzbQhNj1E9ewfJU9oNksLFs",
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
        icon: "/icons/icon-72x72.png",
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
