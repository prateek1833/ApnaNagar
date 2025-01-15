const Restaurant = require("../models/restaurant");
const Item = require("../models/item");
const Orders = require("../models/order");
const Review = require("../models/review");

module.exports.indexRestaurant = async (req, res) => {
    const allRestaurant = await Restaurant.find({});
    res.render("restaurant/index.ejs", { allRestaurant });
};

module.exports.showRestaurant = async (req, res) => {
    try {
        const { id } = req.params; // Extract `id` from request parameters
        const restaurant = await Restaurant.findById(id)
            .populate({
                path: "reviews",
                populate: { path: "author", select: "username" } // Populates the `author` field of each review
            })
            .populate("orders"); // Populates the `orders` field

        const allItem = await Item.find({ RestaurantId: id });

        if (!restaurant) {
            req.flash("error", "The restaurant you are trying to access does not exist.");
            return res.redirect("/restaurant");
        }

        res.render("restaurant/show.ejs", { restaurant, allItem });
    } catch (err) {
        console.error("Error fetching restaurant:", err);
        req.flash("error", "Something went wrong. Please try again later.");
        res.redirect("/restaurant");
    }
};


module.exports.createRestaurant = async (req, res) => {
    const { username, address, latitude, longitude, category, password, mobile, open_time, close_time } = req.body;
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
    if (!username || !address || !latitude || !longitude || !category || !password || !mobile || !open_time || !close_time) {
        req.flash("error", "All fields are required");
        return res.redirect("/user/signup.ejs");
    }

    // Validate mobile number format (optional)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
        req.flash("error", "Invalid mobile number. Please enter a valid 10-digit number.");
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
            type: "Restaurant",
            mobile,
            open_time,
            close_time,
            avgRating:0
        });

        // Register the restaurant with hashed password
        const registeredRestaurant = await Restaurant.register(newRestaurant, password);

        req.login(registeredRestaurant, (err) => {
            if (err) {
                console.error("Error logging in after signup:", err);
                req.flash("error", "Error logging in after signup. Please try logging in manually.");
                return res.redirect("/user/login");
            }

            req.flash("success", "New restaurant created and logged in successfully");
            res.redirect(`/restaurant/${registeredRestaurant._id}/show`);
        });
        
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
    if (!restaurant) {
        res.flash("error", "restaurant you requested does not exist!");
        res.redirect("/restaurant");
    }
    let originalImageUrl = restaurant.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("restaurant/edit.ejs", { restaurant, originalImageUrl });
}

module.exports.toggleStatus = async (req, res) => {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
        req.flash("error", "Restaurant not found.");
        return res.redirect("/restaurant");
    }

    // Toggle the isOpen status
    restaurant.isOpen = !restaurant.isOpen;
    await restaurant.save();

    req.flash("success", `Restaurant is now marked as ${restaurant.isOpen ? "Open" : "Closed"}.`);
    res.redirect(`/restaurant/${id}/show`);
};

module.exports.update = async (req, res) => {
    const { id } = req.params;
    const { address, coordinates, category, type, mobile, open_time, close_time } = req.body;
    try {
        // Parse coordinates from string to an array of numbers
        const parsedCoordinates = coordinates.split(',').map(coord => parseFloat(coord.trim()));

        // Find the existing restaurant
        let restaurant = await Restaurant.findById(id);

        if (!restaurant) {
            req.flash("error", "Restaurant not found");
            return res.redirect("/restaurants");
        }

        // Update restaurant details
        restaurant.address = address;
        restaurant.coordinates = parsedCoordinates;
        restaurant.category = category;
        restaurant.type = type;
        restaurant.mobile = mobile;
        restaurant.open_time = open_time;
        restaurant.close_time = close_time;

        // Handle image upload
        if (req.file) {
            const url = req.file.path;
            const filename = req.file.filename;
            restaurant.image = { url, filename };
        }

        // Save the updated restaurant
        await restaurant.save();

        req.flash("success", "Restaurant updated successfully");
        res.redirect(`/restaurant/${id}/show`);
    } catch (err) {
        console.error("Error updating restaurant:", err);
        req.flash("error", "Failed to update restaurant details");
        res.redirect(`/restaurant/${id}/edit`);
    }
};


module.exports.orders = async (req, res, next) => {
    try {
        let { id } = req.user; // Restaurant ID from logged-in user
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).send("Restaurant not found");
        }

        // Fetch detailed orders using the stored order IDs
        const orders = await Orders.find({ _id: { $in: restaurant.orders } });
        res.render("restaurant/order.ejs", { orders });
    } catch (error) {
        next(error);
    }
};

// Backend Code
module.exports.statistics = async (req, res, next) => {
    try {

        const { id } = req.user; // Assuming req.user contains the authenticated restaurant owner's details
        const restaurant = await Restaurant.findById(id).populate('orders');

        if (!restaurant) {
            return res.status(404).send("Restaurant not found");
        }

        const monthlyEarnings = {};
        const weekdayOrders = Array(7).fill(0);
        const orders = restaurant.orders;
        const balance_due = restaurant.balance_due;

        let totalEarnings = 0;
        let totalOrders = 0;

        orders.forEach(order => {
            if (order.items && order.createdAt) {
                const date = new Date(order.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format as YYYY-MM
                const total = order.items.reduce((sum, item) => sum + item.item.price * item.item.quantity, 0);

                monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + total;
                totalEarnings += total;
                totalOrders++;
            }
        });


        const orderDates = [];
        const orderCounts = {};
        orders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            orderDates.push(date);
            orderCounts[date] = (orderCounts[date] || 0) + 1;
        });
        const sortedOrderDates = [...new Set(orderDates)].sort();
        const sortedOrderCounts = sortedOrderDates.map(date => orderCounts[date]);

        const itemSales = {};
        orders.forEach(order => {
            if (order.items) {
                order.items.forEach(({ item }) => {
                    if (!itemSales[item.title]) {
                        itemSales[item.title] = 0;
                    }
                    itemSales[item.title] += item.quantity;
                });
            }
        });

        const topSellingItems = Object.entries(itemSales)
            .map(([name, quantitySold]) => ({ name, quantitySold }))
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 10); // Limit to top 10 items

        const categorySales = {};
        orders.forEach(order => {
            if (order.items) {
                order.items.forEach(({ item }) => {
                    const category = item.typ || 'Others';
                    categorySales[category] = (categorySales[category] || 0) + item.quantity;
                });
            }
        });

        const categoryLabels = Object.keys(categorySales);
        const categoryData = Object.values(categorySales);
        const sortedMonthlyEarnings = Object.entries(monthlyEarnings)
            .sort(([a], [b]) => a.localeCompare(b)); // Sort by month keys

        const monthlyLabels = sortedMonthlyEarnings.map(([month]) => month); // ["2024-01", "2024-02"]
        const monthlyData = sortedMonthlyEarnings.map(([, earnings]) => earnings); // [5000, 7000]



        res.render('restaurant/statistics.ejs', {
            monthlyLabels,
            monthlyData,
            orderDates,
            orderDates: sortedOrderDates,
            orderCounts: sortedOrderCounts,
            topSellingItems,
            categoryLabels,
            categoryData,
            weekdayOrders,
            balance_due,
            totalEarnings,
            totalOrders
        });
    } catch (error) {
        next(error);
    }
};

module.exports.destroyRestaurant = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the restaurant to delete
        const restaurant = await Restaurant.findById(id);

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found!" });
        }

        // Find all items associated with the restaurant
        const items = await Item.find({ RestaurantId: id });

        // Collect all reviews associated with the items
        const reviewIds = items.flatMap(item => item.reviews);

        // Delete all associated reviews
        if (reviewIds.length > 0) {
            await Review.deleteMany({ _id: { $in: reviewIds } });
        }

        // Delete all items associated with the restaurant
        await Item.deleteMany({ RestaurantId: id });

        // Finally, delete the restaurant
        await Restaurant.findByIdAndDelete(id);

        req.flash("success", "Restaurant and its associated items and reviews deleted successfully!");
        res.redirect("/");
    } catch (error) {
        console.error("Error while deleting restaurant:", error);
        res.status(500).json({ message: "An error occurred while deleting the restaurant." });
    }
};
