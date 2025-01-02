const Restaurant = require("../models/restaurant");
const Item = require("../models/item");
const Orders = require("../models/order");

module.exports.indexRestaurant = async (req, res) => {
    const allRestaurant = await Restaurant.find({});
    res.render("restaurant/index.ejs", { allRestaurant });
};

module.exports.showRestaurant = async (req, res) => {
    try {
        const { id } = req.params; // Correct way to extract `id` from request parameters
        const restaurant = await Restaurant.findById(id)
            .populate("items") // Updated field name to `items` based on schema
            .populate("orders"); // Updated field name to `orders` based on schema
            const allItem = await Item.find({ RestaurantId: id });
        if (!restaurant) {
            req.flash("error", "The restaurant you are trying to access does not exist.");
            return res.redirect("/restaurant");
        }
        res.render("restaurant/show.ejs", { restaurant,allItem });
    } catch (err) {
        console.error("Error fetching restaurant:", err);
        req.flash("error", "Something went wrong. Please try again later.");
        res.redirect("/restaurant");
    }
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
        return res.redirect("/user/signup.ejs");
    }

    // Validate input
    if (!username || !address || !latitude || !longitude || !category || !password) {
        req.flash("error", "All fields are required");
        return res.redirect("/user/signup.ejs");
    }

    // Try creating a new restaurant
    try {
        const newRestaurant = new Restaurant({
            username,
            address,
            coordinates: [latitude, longitude],
            category,
            image: { url, filename },
            owner,
            type:"Restaurant"
        });

        // Register the restaurant with hashed password
        const registeredRestaurant = await Restaurant.register(newRestaurant, password);

        req.flash("success", "New restaurant created successfully");
        res.redirect("/restaurant/show.ejs");
    } catch (err) {
        console.error("Error creating restaurant:", err);
        req.flash("error", "Error creating new restaurant");
        res.redirect("/user/signup.ejs");
    }
};

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to Apna Nagar");
    let redirectUrl = res.locals.redirectUrl || `/restaurant/${req.user.id}/show`;

    res.redirect(redirectUrl);
}

module.exports.renderEdit = async (req, res) => {
    let { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    if(!restaurant){
        res.flash("error","restaurant you requested does not exist!");
        res.redirect("/restaurant");
    }
    let originalImageUrl=restaurant.image.url;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250");
    res.render("restaurant/edit.ejs", { restaurant,originalImageUrl });
}

module.exports.update = async (req, res) => {
    const { id } = req.params;
    const { address, coordinates, category, type } = req.body;
    console.log('reached');
    // Parse coordinates from string to an array of numbers
    const parsedCoordinates = coordinates.split(',').map(coord => parseFloat(coord.trim()));

    // Find the existing restaurant
    let restaurant = await Restaurant.findById(id);

    // Update restaurant details
    restaurant.address = address;
    restaurant.coordinates = parsedCoordinates;
    restaurant.category = category;
    restaurant.type = type;

    // Handle image upload
    if (req.file) {
        const url = req.file.path;
        const filename = req.file.filename;
        restaurant.image = { url, filename };
    }

    // Save the updated restaurant
    await restaurant.save();

    req.flash("success", "Restaurant Updated");
    res.redirect(`/restaurant/${id}/show`);
};



