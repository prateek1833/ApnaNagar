const Item = require("../models/item");
const Orders = require("../models/order");
const User = require("../models/user");

const Restaurant = require("../models/restaurant");


module.exports.index = async (req, res) => {
    try {
        const allItem = await Item.find({});
        
        // Fetch all unique restaurant IDs
        const restaurantIds = [...new Set(allItem.map(item => item.RestaurantId))];

        // Fetch restaurant data for all items in one go
        const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } });

        // Create a map for quick access to restaurant data
        const restaurantMap = restaurants.reduce((acc, restaurant) => {
            acc[restaurant._id.toString()] = restaurant;
            return acc;
        }, {});

        // Simplified helper function to determine if a restaurant is open
        const isRestaurantOpen = (restaurant) => {
            return restaurant ? restaurant.isOpen : false;
        };

        // Update all items with the isOpen status
        const updatedItems = allItem.map(item => {
            const restaurant = restaurantMap[item.RestaurantId.toString()];
            const isOpen = isRestaurantOpen(restaurant);
            return { ...item.toObject(), isOpen };
        });

        // Render the items view
        res.render("items/index.ejs", { allItem: updatedItems });
    } catch (err) {
        console.error("Error fetching items or restaurants:", err);
        res.status(500).send("Internal Server Error");
    }
};



module.exports.indexRestaurant = async (req, res) => {
    const allItem = await Item.find({ RestaurantId: "Restaurant" });
    res.render("items/index.ejs", { allItem });
}
module.exports.restaurantItem = async (req, res) => {
    const { id } = req.params; // Extract the id from the route params
    const allItem = await Item.find({ RestaurantId: id }); // Query items based on the restaurant's id
    res.render("items/index.ejs", { allItem }); // Render the page with the items
}

module.exports.search = async (req, res) => {
    const keyword = req.query.keyword; // Assuming keyword is sent in the query parameters
    console.log(keyword);
    // Find items where title or description contains the keyword
    const allItem = await Item.find({
        $or: [
            { title: { $regex: new RegExp(keyword, 'i') } }, // Case-insensitive regex search for title
            { description: { $regex: new RegExp(keyword, 'i') } }, // Case-insensitive regex search for description
            { key: { $regex: new RegExp(keyword, 'i') } },
            { category: { $regex: new RegExp(keyword, 'i') } },
        ]
    });

    res.render("items/index.ejs", { allItem });
}

module.exports.showItem = async (req, res) => {
    let { id } = req.params;
    const item = await Item.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");

    if (!item) {
        req.flash("error", "Item you are trying to access does not exist");
        return res.redirect("/items");
    }

    // Assume you have a way to get the restaurant by its ID
    const restaurant = await Restaurant.findById(item.RestaurantId);

    if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/items");
    }

    // Check if the restaurant is open
    const isRestaurantOpen = restaurant.isOpen; // Replace this with the actual logic to check open status

    res.render("items/show.ejs", { item, isRestaurantOpen });
}


module.exports.orders = async (req, res) => {
    const allOrder = await Orders.find({});
    res.render("items/orders.ejs", { allOrder,User });
}
module.exports.myOrders = async (req, res, next) => {
    try {
        let { id } = req.params;
        const allOrder = await Orders.find({ "author._id": id });
        res.render("user/myOrders.ejs", { allOrder, User });
    } catch (error) {
        next(error); 
    }
};



module.exports.createItem = async (req, res) => {
    let { title, description, category, unit, key } = req.body;
    let { price, typ } = req.body;

    let url = req.file.path;
    let filename = req.file.filename;

    // Create an array of detail objects
    let detail = [];
    for (let i = 0; i < price.length; i++) {
        detail.push({ price: price[i], typ: typ[i] });
    }

    try {
        let newItem = new Item({
            owner: "6637e25345e0bb950e6a0fbe",
            title: title,
            description: description,
            category: category,
            avgRating:0,
            unit: unit,
            key: key.split(" "),
            image: { url, filename },
            detail: detail,
            RestaurantId:req.user._id
        });

        await newItem.save();
        console.log("New item saved");
        req.flash("success", "New Item Created");
        res.redirect("/restaurant");
    } catch (err) {
        console.log(err);
        req.flash("error", "Error creating new item");
        res.redirect("/items/new");
    }
}


module.exports.renderEdit = async (req, res) => {
    let { id } = req.params;
    const item = await Item.findById(id);
    if(!item){
        res.flash("error","Item you requested does not exist!");
        res.redirect("/items");
    }
    let originalImageUrl=item.image.url;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250");
    res.render("items/edit.ejs", { item,originalImageUrl });
}

module.exports.update = async (req, res) => {
    const { id } = req.params;
    const { title, description, category, unit, detail, key } = req.body;

    // Convert key from a comma-separated string to an array
    const keywords = key.split(',').map(keyword => keyword.trim());

    // Find the existing item
    let item = await Item.findById(id);

    // Update the item details
    item.title = title;
    item.description = description;
    item.category = category;
    item.unit = unit;

    // Extract existing details and update with new details
    if (Array.isArray(detail)) {
        item.detail = detail.map(d => ({
            typ: d.typ,
            price: d.price
        }));
    } else if (detail) {
        item.detail = [{ typ: detail.typ, price: detail.price }];
    }

    // Update keywords
    item.key = keywords;

    // Handle image upload
    if (req.file) {
        let url = req.file.path;
        let filename = req.file.filename;
        item.image = { url, filename };
    }

    // Save the updated item
    await item.save();

    req.flash("success", "Item Updated");
    res.redirect(`/items/${id}/show.ejs`);
};



module.exports.destroyItem = async (req, res) => {
    let { id } = req.params;
    let deleted = await Item.findByIdAndDelete(id);
    req.flash("success", " Item deleted");
    res.redirect("/restaurant");
}