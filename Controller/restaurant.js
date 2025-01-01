const Restaurant = require("../models/restaurant");
const Item = require("../models/item");
const Orders = require("../models/order");

module.exports.indexRestaurant = async (req, res) => {
    const allRestaurant = await Restaurant.find({});
    res.render("restaurant/index.ejs", { allRestaurant });
};

module.exports.restaurantItem = async (req, res) => {
    const { id } = req.params; // Extract the id from the route params
    const allItem = await Item.find({ RestaurantId: id }); // Query items based on the restaurant's id
    const restaurant = await Restaurant.findById(id);
    res.render("restaurant/items.ejs", { allItem,restaurant }); // Render the page with the items
};

module.exports.createRestaurant = async (req, res) => {
    const { username, address, latitude, longitude, category, password } = req.body;
    const owner = "6638779c9bfc94fc81a42508"; // Assign a static owner ID for now
    let url, filename;

    // Validate image upload
    if (req.file) {
        url = req.file.path;
        filename = req.file.filename;
    } else {
        req.flash("error", "Image upload is required");
        return res.redirect("/restaurants/new");
    }

    // Validate input
    if (!username || !address || !latitude || !longitude || !category || !password) {
        req.flash("error", "All fields are required");
        return res.redirect("/restaurants/new");
    }

    // Try creating a new restaurant
    try {
        const newRestaurant = new Restaurant({
            username,
            address,
            coordinates: [latitude, longitude],
            category,
            image: { url, filename },
            owner
           });

        // Register the restaurant with hashed password
        const registeredRestaurant = await Restaurant.register(newRestaurant, password);

        req.flash("success", "New restaurant created successfully");
        res.redirect("/restaurants");
    } catch (err) {
        console.error("Error creating restaurant:", err);
        req.flash("error", "Error creating new restaurant");
        res.redirect("/restaurants/new");
    }
};



