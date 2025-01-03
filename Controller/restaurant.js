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
        res.redirect(`/restaurant/${id}/show`);
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

module.exports.orders = async (req, res, next) => {
    try {
        let { id } = req.user; // Restaurant ID from logged-in user
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).send("Restaurant not found");
        }

        // Fetch detailed orders using the stored order IDs
        const orders = await Orders.find({ _id: { $in: restaurant.orders } });
        console.log(orders);
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
        const currentYear = new Date().getFullYear();

        let totalProfit = 0;
        let totalEarnings = 0;
        let totalOrders = 0;

        orders.forEach(order => {
            if (order.items && order.createdAt) {
                const date = new Date(order.createdAt);
                const month = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                const weekday = date.getDay();
                const total = order.items.reduce((sum, item) => sum + item.item.price * item.item.quantity, 0);
                const cost = order.items.reduce((sum, item) => sum + item.item.cost * item.item.quantity, 0);

                monthlyEarnings[month] = (monthlyEarnings[month] || 0) + total;
                weekdayOrders[weekday]++;

                totalEarnings += total;
                totalProfit += (total - cost);
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

        res.render('restaurant/statistics.ejs', {
            monthlyEarnings,
            orderDates: sortedOrderDates,
            orderCounts: sortedOrderCounts,
            topSellingItems,
            categoryLabels,
            categoryData,
            weekdayOrders,
            totalProfit,
            totalEarnings,
            totalOrders
        });
        console.log({ monthlyEarnings, orderDates, orderCounts, categoryLabels, categoryData });
    } catch (error) {
        next(error);
    }
};
