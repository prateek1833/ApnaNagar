if ("serviceWorker" in navigator && "PushManager" in window) {
    navigator.serviceWorker.register("/sw.js")
        .then(async (reg) => {
            console.log("✅ Service Worker Registered", reg);

            // Fetch the current user
            let currUser;
            try {
                const userResponse = await fetch("/api/getCurrentUser"); // Create this API route in Express
                currUser = await userResponse.json();
            } catch (error) {
                console.error("❌ Failed to fetch current user:", error);
                return;
            }

            // Request permission for push notifications
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                console.log("❌ Push notifications denied");
                return;
            }

            // Subscribe to Push Notifications
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: "BEAVi19IrJ1jYyoJREmhP8UuCQntZGCF_VqLHUjnxT-NbjqqBCkn0cvFV0KL95rMISgTbGtS_s3vWeTyjyLoXN4"
            });

            console.log("🔔 Push Subscription:", subscription);

            // Ensure currUser is valid
            if (currUser && currUser.type === "Restaurant") {
                const restaurantId = currUser._id;

                await fetch(`/restaurant/${restaurantId}/subscribe`, {
                    method: "POST",
                    body: JSON.stringify({ subscription }),
                    headers: { "Content-Type": "application/json" },
                });

                console.log("✅ Push Subscription sent to server");
            }
            if (currUser && currUser.type === "Delivery Boy") {
                const deliveryId = currUser._id;

                await fetch(`/employee/${deliveryId}/subscribe`, {
                    method: "POST",
                    body: JSON.stringify({ subscription }),
                    headers: { "Content-Type": "application/json" },
                });

                console.log("✅ Push Subscription sent to server");
            }
            if (currUser && currUser.type === "Owner") {
                const ownerId = currUser._id;

                await fetch(`/owner/${ownerId}/subscribe`, {
                    method: "POST",
                    body: JSON.stringify({ subscription }),
                    headers: { "Content-Type": "application/json" },
                });

                console.log("✅ Push Subscription sent to server for Owner");
            }
            // Listen for messages from service worker to play a sound
            navigator.serviceWorker.addEventListener("message", (event) => {
                if (event.data && event.data.type === "playSound") {
                    playNotificationSound();
                }
            });

            // Function to play the notification sound
            function playNotificationSound() {
                const audio = new Audio("/sounds/notification.mp3"); // Make sure this file exists
                audio.play().catch(error => console.error("❌ Error playing sound:", error));
            }
        })
        .catch((err) => console.log("❌ Service Worker Not Registered", err));
} else {
    console.log("❌ Service Worker or Push Notifications not supported in this browser.");
}
