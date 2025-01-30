const Orders = require("../models/order");
const User = require("../models/user");
const Restaurant = require("../models/restaurant");


module.exports.index = async (req, res) => {
    const allUser = await User.find({});
    res.render("owner/users.ejs", { allUser });
}

module.exports.addItem = async (req, res) => {
    res.render("owner/addItem.ejs");
}
module.exports.renderEdit = async (req, res) => {
    let { id } = req.params;
    const user = await User.findById(id);
    res.render("owner/edit.ejs", { user });
}

module.exports.renderQuantity = async (req, res) => {
    let { id } = req.params;
    const order = await Orders.findById(id);
    res.render("owner/quantity.ejs", { order });
}

module.exports.quantity = async (req, res) => {
    const { id } = req.params;

    try {
        // Find the specific order by ID
        const order = await Orders.findById(id);
        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect("/owner/orders"); // Redirect to orders page or another relevant page
        }

        // Iterate over each order item and update its quantity
        for (let item of order.items) {
            const quantityKey = `quantity_${item._id}`;
            if (req.body[quantityKey]) {
                item.item.quantity = parseFloat(req.body[quantityKey], 10);
            }
        }

        // Save the updated order
        await order.save();

        // Fetch all orders again to pass to the template
        const allOrder = await Orders.find({});

        req.flash("success", "Quantity updated successfully");
        res.render("items/orders.ejs", { allOrder, User });
    } catch (error) {
        console.error('Error updating order quantities:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};


module.exports.status = async (req, res) => {
    const { id } = req.params;
    const { orderStatus } = req.body;
    const allOrder = await Orders.find({});
    try {
        console.log(orderStatus);
        // Validate that the orderStatus is one of the allowed values
        const validStatuses = ['1', '2', '3', '4'];
        if (!validStatuses.includes(orderStatus)) {
            req.flash("warning", "invalid order status");
            res.render("items/orders.ejs", { allOrder, User });
        }

        // Update the order with the new status
        const statusMap = {
            '1': 'Order Received',
            '2': 'Preparing',
            '3': 'Out for Delivery',
            '4': 'Delivered'
        };

        const updatedOrder = await Orders.findByIdAndUpdate(
            id,
            { status: statusMap[orderStatus] },
            { new: true } // Return the updated document
        );

        if (!updatedOrder) {
            return res.status(404).send({ message: 'Order not found' });
        }
        req.flash("success", "status updated");
        return res.render("items/orders.ejs", { allOrder, User });
        // Send the updated order back in the response
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};



module.exports.update = async (req, res) => {
    const { id } = req.params;
    let { area, district, state, pincode, balance_due, mobile } = req.body;
    console.log(req.body);

    try {
        let user = await User.findByIdAndUpdate(id, {
            area,
            district,
            state,
            pincode,
            balance_due,
            mobile,
        })

        if (!user) {
            req.flash("error", "User not found");
            return res.redirect(`/owner`);
        }
        req.flash("success", "User Updated");
        return res.redirect(`/owner`);
    } catch (error) {
        console.error("Error updating user:", error);
        req.flash("error", "Error updating user");
        return res.redirect(`/owner`);
    }
}


module.exports.statistics = async (req, res, next) => {
    try {
        const now = new Date();
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        
        const previousMonthName = monthNames[firstDayOfLastMonth.getMonth()]; 

        // Fetch orders from the previous month
        const orders = await Orders.find({
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        }).lean();

        let totalEarnings = 0;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let ordersByDay = { Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
        let totalOrders = 0;
        let peakOrderTimes = {};
        let itemSales = {};
        let restaurantSales = {}; 
        let customerPurchases = {};
        let restaurantCache = {}; 

        for (let orderData of orders) {
            const order = await Orders.findById(orderData._id).lean();
            if (!order) continue;

            const orderDate = new Date(order.createdAt);
            const dayName = daysOfWeek[orderDate.getDay()];
            const hour = orderDate.getHours();

            ordersByDay[dayName]++;
            peakOrderTimes[hour] = (peakOrderTimes[hour] || 0) + 1;
            totalOrders++;

            for (let { item } of order.items) {
                if (!item || item.price === undefined || !item.title) continue;

                totalEarnings += item.price * item.quantity;
                itemSales[item.title] = (itemSales[item.title] || 0) + item.quantity;

                let restaurantName = "Unknown Restaurant";
                if (item.RestaurantId) {
                    if (restaurantCache[item.RestaurantId]) {
                        restaurantName = restaurantCache[item.RestaurantId];
                    } else {
                        const restaurant = await Restaurant.findById(item.RestaurantId).select("username").lean();
                        if (restaurant) {
                            restaurantName = restaurant.username;
                            restaurantCache[item.RestaurantId] = restaurant.username; 
                        }
                    }
                }

                if (!restaurantSales[restaurantName]) {
                    restaurantSales[restaurantName] = { totalRevenue: 0, totalItemsSold: 0 };
                }
                restaurantSales[restaurantName].totalRevenue += item.price * item.quantity;
                restaurantSales[restaurantName].totalItemsSold += item.quantity;
            }

            if (order.author) {
                const customer = await User.findById(order.author._id).select("username").lean();
                const customerName = customer ? customer.username : "Unknown";
                const userID = order.author._id.toString(); 

                if (!customerPurchases[userID]) {
                    customerPurchases[userID] = { 
                        userID, 
                        name: customerName, 
                        totalSpent: 0, 
                        orders: 0, 
                        totalItems: 0 
                    };
                }

                customerPurchases[userID].totalSpent += order.items.reduce((sum, { item }) => {
                    return sum + (item ? item.price * item.quantity : 0);
                }, 0);
                customerPurchases[userID].orders += 1;
                customerPurchases[userID].totalItems += order.items.length;
            }
        }

        // Get top selling items
        const topSellingItems = Object.entries(itemSales)
            .map(([name, quantitySold]) => ({ name, quantitySold }))
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 10);

        // Get top customers
        const topCustomers = Object.values(customerPurchases)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        res.render("owner/statistics", {
            totalEarnings,
            totalOrders,
            topSellingItems,
            topCustomers,
            restaurantSales,
            previousMonthName,
            peakOrderTimes,
            ordersByDay,
        });

    } catch (error) {
        console.error("Error in statistics calculation:", error);
        next(error);
    }
};


