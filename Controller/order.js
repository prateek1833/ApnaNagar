const Item = require("../models/item.js");
const Review = require("../models/review.js");
const Order = require("../models/order.js");
const User = require("../models/user.js"); // Assuming User model exists for storing user details
const axios = require('axios'); // To fetch location details using an API
const Restaurant = require("../models/restaurant.js");
const Employee = require("../models/employee");
const crypto = require("crypto");
const webpush = require("web-push");




const calculateWalkingDistance = async (userCoordinates) => {
    try {
        const startCoordinates = [82.6785652247138, 26.72607612402932]; // Static starting coordinate
        const endCoordinates = userCoordinates;

        // Replace with your Mapbox access token
        const mapboxToken = process.env.MAP_TOKEN;

        // Query the Mapbox Directions API for walking distance
        const response = await axios.get(
            `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoordinates[0]},${startCoordinates[1]};${endCoordinates[0]},${endCoordinates[1]}`,
            {
                params: {
                    access_token: mapboxToken,
                    geometries: "geojson",
                    overview: "full",
                    steps: false,
                },
            }
        );

        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const distanceInMeters = response.data.routes[0].distance; // Distance in meters
            const distanceInKilometers = (distanceInMeters / 1000).toFixed(2); // Convert to kilometers
            return parseFloat(distanceInKilometers); // Return as a float
        } else {
            throw new Error("Could not calculate the distance. Invalid API response.");
        }
    } catch (error) {
        console.error("Error fetching distance:", error);
        throw new Error("An error occurred while calculating the distance.");
    }
};

module.exports.updateAddress = async (req, res) => {
    try {
        let { coordinates } = req.body;
        const { id } = req.params; // Extract the `id` from `req.params`
        console.log("Coordinates:", coordinates);

        if (typeof coordinates === "string") {
            coordinates = JSON.parse(coordinates);
        }

        if (!coordinates || coordinates.length !== 2) {
            console.log("Length of coordinates:", coordinates.length);
            req.flash("error", "Invalid coordinates provided.");
            return res.redirect(`/order/${id}/location`);
        }

        const [longitude, latitude] = coordinates;

        // Fetch location data from the Mapbox API
        const mapboxToken = process.env.MAP_TOKEN; // Replace with your Mapbox access token
        const locationData = await axios.get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`
        );

        if (!locationData || !locationData.data || !locationData.data.features) {
            req.flash("error", "Unable to fetch location details.");
            return res.redirect(`/order/${id}/location`);
        }
        // Parse the location data
        const features = locationData.data.features;
        const locality = features.find((feature) => feature.place_type.includes("locality"))?.text || "";
        const city = features.find((feature) => feature.place_type.includes("place"))?.text || "";
        const postcode = features.find((feature) => feature.place_type.includes("postcode"))?.text || "";
        const state = features.find((feature) => feature.place_type.includes("region"))?.text || "Unknown State";

        const user = await User.findById(req.user._id);
        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect(`/order/${id}/location`);
        }

        // Update user details
        user.area = locality;
        user.village = locality;
        user.district = city; // Mapbox doesn't provide a distinct "district" field; using `state` here
        user.state = state;
        user.pinCode = postcode;
        user.coordinates = coordinates;

        // Calculate the distance and update the user object
        try {
            const distance = await calculateWalkingDistance(coordinates);
            user.distance = distance;
            console.log(`Calculated Distance: ${distance} km`);
        } catch (distanceError) {
            console.error("Error calculating distance:", distanceError);
            req.flash("error", "An error occurred while calculating the distance.");
        }

        await user.save();
        req.flash("success", "Address updated successfully.");
        res.redirect("/order/checkout");
    } catch (error) {
        console.error(error);
        req.flash("error", "An error occurred while updating the address.");
        res.redirect(`/order/${id}/location`);
    }
};



module.exports.addToCart = async (req, res) => {
    try {
        const item = await Item.findById(req.body.item);

        // Extract the selected type and quantity from the request body
        const selectedTypeIndex = req.body.selectedType;
        const quantity = req.body.quantity;
        const title = item.title;
        const category = item.category;
        const unit = item.unit;
        const id = item._id;
        const RestaurantId = item.RestaurantId;

        // Check if the item exists
        if (!item) {
            // Handle the case where the item is not found
            return res.status(404).send("Item not found");
        }

        // Get the selected type from the item's detail array
        const selectedType = item.detail[selectedTypeIndex];

        // Check if the selected type exists
        if (!selectedType) {
            // Handle the case where the selected type is not found
            return res.status(404).send("Selected type not found");
        }

        // Create the new order with the selected type and quantity
        const newOrder = { title: title, category: category, unit: unit, detail: selectedType, quantity: quantity, id: id, RestaurantId: RestaurantId };

        // Get the current order array from the cookie, or initialize it as an empty array if it doesn't exist
        let orders = req.cookies.order ? JSON.parse(req.cookies.order) : [];

        // Add the new order to the array
        orders.push(newOrder);

        // Set the cookie with the updated order array
        res.cookie("order", JSON.stringify(orders));

        // Render the cart view
        req.flash("success", `${selectedType.typ} ${item.title} has been added to cart`);
        res.redirect("/items");

    } catch (error) {
        // Handle any errors that occur during the process
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.buy = async (req, res) => {
    try {
        const item = await Item.findById(req.body.item);
        const userId = req.params.id;

        // Extract the selected type and quantity from the request body
        const selectedTypeIndex = req.body.selectedType;
        const quantity = parseInt(req.body.quantity, 10);

        // Check if the item exists
        if (!item) {
            return res.status(404).send("Item not found");
        }

        // Find the selected type from the item's detail array
        const selectedDetail = item.detail[selectedTypeIndex];

        // Check if the selected type exists
        if (!selectedDetail) {
            return res.status(404).send("Selected type not found");
        }

        // Create the new order with the selected type and quantity
        const newOrder = {
            title: item.title,
            category: item.category,
            unit: item.unit,
            detail: selectedDetail,
            quantity: quantity,
            id: item._id,
            RestaurantId: item.RestaurantId,
        };

        // Get the current order array from the cookie, or initialize it as an empty array if it doesn't exist
        let orders = [];

        // Add the new order to the array
        orders.push(newOrder);

        // Set the cookie with the updated order array
        res.cookie("order", JSON.stringify(orders));

        // Redirect to the user's location page
        res.redirect(`/order/${userId}/location`);

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports.destroyFromCart = async (req, res) => {
    try {
        console.log(req.body.orderItem);

        // Get the current order array from the cookie, or initialize it as an empty array if it doesn't exist
        const order = req.cookies.order ? JSON.parse(req.cookies.order) : [];

        // Check if there are any orders in the array
        if (order.length === 0) {
            return res.status(404).send("No orders to delete");
        }

        // Extract the orderItem ID from the request body
        const orderItemId = req.body.orderItem;

        // Find the index of the orderItem in the orders array
        const index = order.findIndex(order => order.id == orderItemId);

        // Check if the orderItem exists in the orders array
        if (index === -1) {
            return res.status(404).send("Order not found");
        }

        // Remove the orderItem from the orders array
        order.splice(index, 1);

        // Update the cookie with the new order array
        res.cookie("order", JSON.stringify(order));

        // Categorize the remaining items into openItems and closedItems
        const openItems = [];
        const closedItems = [];

        for (const item of order) {
            try {
                const restaurant = await Restaurant.findById(item.RestaurantId); // Query the restaurant
                if (restaurant && restaurant.isOpen) {
                    openItems.push(item); // Add to openItems if the restaurant is open
                } else {
                    closedItems.push(item); // Add to closedItems if the restaurant is closed
                }
            } catch (error) {
                console.error(`Error fetching restaurant with ID ${item.RestaurantId}:`, error);
                closedItems.push(item); // Treat as closed if there's an error
            }
        }

        // Redirect back to the cart view with updated items
        res.render('user/cart.ejs', { openItems, closedItems, id: req.params.id });

    } catch (error) {
        // Handle any errors that occur during the process
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const webPush = require("web-push");
// Web Push Configuration
const publicVapidKey = process.env.PUBLIC_VAPID_KEY; // Use the same key as in main.js
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;  // Replace with your private key

webPush.setVapidDetails(
    "mailto:kumarprateek1833@gmail.com",
    publicVapidKey,
    privateVapidKey
);

// Function to Notify Restaurant
async function notifyRestaurant(restaurantId, orderDetails) {
    try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || !restaurant.pushSubscription) {
            console.log("❌ No push subscription found for this restaurant.");
            return;
        }

        const payload = JSON.stringify({
            title: "New Order Received",
            body: `You have a new order! Order ID: ${orderDetails._id}`,
            icon: "/icons/icon-72x72.png",
            data: { url: `http://apnanagar.onrender.com/restaurant/${restaurantId}/order` } // ✅ Ensure this exists
        });        

        await webPush.sendNotification(restaurant.pushSubscription, payload);
        console.log("✅ Push Notification Sent to Restaurant!");
    } catch (error) {
        console.error("❌ Error sending push notification:", error);
    }
}



module.exports.createOrder = async (req, res) => {
    try {
        const user = res.locals.currUser;
        let orders = req.cookies.order ? JSON.parse(req.cookies.order) : [];

        if (!orders || orders.length === 0) {
            req.flash("error", "No items in the cart to place an order.");
            return res.redirect("/items");
        }

        // Fetch all unique restaurant IDs in one query to minimize DB calls
        const restaurantIds = [...new Set(orders.map(order => order.RestaurantId))];
        const restaurants = await Restaurant.find({ _id: { $in: restaurantIds }, isOpen: true }).lean();

        // Convert array to Map for quick lookup
        const openRestaurants = new Map(restaurants.map(restaurant => [restaurant._id.toString(), restaurant]));

        const remainingItems = [];
        const orderItems = orders.reduce((acc, orderItem) => {
            if (openRestaurants.has(orderItem.RestaurantId)) {
                acc.push({
                    item: {
                        _id: orderItem.id,
                        title: orderItem.title,
                        price: orderItem.detail.price,
                        quantity: orderItem.quantity,
                        unit: orderItem.unit,
                        typ: orderItem.detail.typ,
                        RestaurantId: orderItem.RestaurantId,
                    },
                });
            } else {
                remainingItems.push(orderItem);
            }
            return acc;
        }, []);

        if (orderItems.length === 0) {
            req.flash("error", "All restaurants are closed. Please try again later.");
            return res.redirect("/items");
        }

        const restaurantToken = crypto.randomBytes(6).toString("hex");

        // Use bulk insert for performance
        const newOrder = await Order.create({
            items: orderItems,
            db_status: "Pending",
            status: "Order Received",
            restaurantToken,
            author: {
                _id: user._id,
                name: user.username,
                area: user.area,
                district: user.district,
                state: user.state,
                pincode: user.pincode,
                coordinates: user.coordinates,
                mobile: user.mobile,
                distance: user.distance,
                balance_due: user.balance_due,
            },
            createdAt: new Date(),
        });

        // Bulk update user orders
        await User.updateOne({ _id: user._id }, { $push: { orders: newOrder._id } });

        // Notify all restaurants in parallel
        await Promise.all(orderItems.map(orderItem => notifyRestaurant(orderItem.item.RestaurantId, newOrder)));

        // Fetch available delivery boys in a single query
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const availableDeliveryBoy = await Employee.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "completed_orders",
                    foreignField: "_id",
                    as: "completedOrdersDetails",
                },
            },
            {
                $addFields: {
                    todayDeliveries: {
                        $size: {
                            $filter: {
                                input: "$completedOrdersDetails",
                                as: "order",
                                cond: {
                                    $gte: ["$$order.completedAt", today],
                                },
                            },
                        },
                    },
                },
            },
            { $match: { status: "Free", isAvailable: true } },
            { $sort: { todayDeliveries: 1 } }, // Prioritize lowest deliveries
            { $limit: 1 } // Fetch only one delivery boy
        ]);

        if (availableDeliveryBoy.length > 0) {
            const selectedDeliveryBoy = availableDeliveryBoy[0];

            // Update the delivery boy status and assign the order
            const updatedDeliveryBoy = await Employee.findOneAndUpdate(
                { _id: selectedDeliveryBoy._id, status: "Free" },
                { $set: { status: "Busy", active_order: newOrder._id } },
                { new: true }
            );

            if (updatedDeliveryBoy) {
                const deliveryBoyToken = crypto.randomBytes(6).toString("hex");

                await Order.updateOne(
                    { _id: newOrder._id },
                    {
                        $set: {
                            db_status: "Assigned",
                            deliveryBoy: {
                                _id: updatedDeliveryBoy._id,
                                name: updatedDeliveryBoy.username,
                                mobile: updatedDeliveryBoy.mobile,
                            },
                            deliveryBoyToken: deliveryBoyToken,
                        },
                    }
                );

                req.flash("success", "Your order has been assigned to a delivery boy.");
            } else {
                req.flash("success", "Your order is in the queue and will be assigned once available.");
            }
        } else {
            req.flash("success", "Your order is in the queue and will be assigned to a delivery boy once available.");
        }

        // Optimize order cookie handling
        if (remainingItems.length > 0) {
            res.cookie("order", JSON.stringify(remainingItems), { httpOnly: true });
        } else {
            res.clearCookie("order");
        }

        res.redirect("/items");
    } catch (error) {
        console.error(error);
        req.flash("error", `Error placing your order: ${error.message}`);
        res.redirect("/order/checkout");
    }
};



module.exports.destroyOrder = async (req, res) => {
    let { id } = req.params;
    let deleted = await Order.findByIdAndDelete(id);
    req.flash("success", " Order deleted");
    res.redirect("/items/orders");
}

