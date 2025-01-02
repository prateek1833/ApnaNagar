const Item = require("../models/item.js");
const Review = require("../models/review.js");
const Order = require("../models/order.js");
const User = require("../models/user.js"); // Assuming User model exists for storing user details
const axios = require('axios'); // To fetch location details using an API


const calculateDistance = async (userCoordinates) => {
    try {
        const startCoordinates = [82.678557, 26.726058]; // Static starting coordinate
        const endCoordinates = userCoordinates;

        // Replace with your Mapbox access token
        const mapboxToken = process.env.MAP_TOKEN;

        // Query the Mapbox Directions API
        const response = await axios.get(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoordinates[0]},${startCoordinates[1]};${endCoordinates[0]},${endCoordinates[1]}`,
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
            const distance = await calculateDistance(coordinates);
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
        const allItem = await Item.find({});
        const item = await Item.findById(req.body.item);

        // Extract the selected type and quantity from the request body
        const selectedTypeIndex = req.body.selectedType;
        const quantity = req.body.quantity;
        const title=item.title;
        const category=item.category;
        const unit=item.unit;
        const id=item._id;

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
        const newOrder = { title: title,category:category,unit:unit, detail: selectedType, quantity:quantity,id:id };

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
        console.log(req.body);
        console.log(req.params);
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
            id: item._id
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
        if (order.length == 0) {
            return res.status(404).send("No orders to delete");
        }

        // Extract the orderItem ID from the request body
        const orderItemId = req.body.orderItem;

        let id=req.params;

        // Find the index of the orderItem in the orders array
        const index = order.findIndex(order => order.id == orderItemId);

        // Check if the orderItem exists in the orders array
        if (index === -1) {
            return res.status(404).send("Order not found");
        }

        // Remove the orderItem from the orders array
        order.splice(index, 1);

        // Set the cookie with the updated order array
        res.cookie("order", JSON.stringify(order));

        // Redirect back to the cart view or any other appropriate page
        res.render('user/cart.ejs', { order: order,id });// You might need to change this URL based on your application's routes

    } catch (error) {
        // Handle any errors that occur during the process
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};



module.exports.createOrder = async (req, res) => {
    try {
        const user = res.locals.currUser;
        const orders = req.cookies.order ? JSON.parse(req.cookies.order) : [];

        // Initialize an empty array to store order items
        const items = [];

        // Iterate through each orderItem and construct the items array
        orders.forEach(orderItem => {
            items.push({
                item: {
                    _id: orderItem.id,
                    title: orderItem.title,
                    price: orderItem.detail.price,
                    quantity: orderItem.quantity,
                    unit: orderItem.unit,
                    typ: orderItem.detail.typ,
                    // Add other properties if necessary
                },
                // You may want to include other properties from the orderItem or additional properties if needed
            });
        });

        // Create a new order with the constructed items array
        const newOrder = new Order({
            items: items,
            status: "Order Processing",
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
                // Add other user properties if necessary
            },
            createdAt: new Date()
        });

        // Save the new order
        await newOrder.save();

        // Add the order ID to user's orders array
        user.orders.push(newOrder._id);

        // Save the updated user
        await user.save();

        // Clear the order cookie after the order has been placed
        res.clearCookie('order');

        req.flash("success", "Your Order has been placed. Keep Shopping.");
        res.redirect("/items");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error placing your order. Please try again later.");
        res.redirect("/items/orders");
    }
};

module.exports.destroyOrder = async (req, res) => {
    let { id } = req.params;
    let deleted = await Order.findByIdAndDelete(id);
    req.flash("success", " Order deleted");
    res.redirect("/items/orders");
}

