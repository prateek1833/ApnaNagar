const Orders = require("../models/order");
const User = require("../models/user");
const Restaurant = require("../models/restaurant");
const Employee = require("../models/employee");

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

module.exports.renderEmployee = async (req, res) => {
    const Employees = await Employee.find({});
    res.render("owner/employee.ejs", { Employees });
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
    let { area, district, state, pincode, balance_due, mobile, dob } = req.body;

    try {
        let user = await User.findByIdAndUpdate(id, {
            area,
            district,
            state,
            pincode,
            balance_due,
            mobile,
            dob
        })

        if (!user) {
            req.flash("error", "User not found");
            return res.redirect(`/items`);
        }
        req.flash("success", "User Updated");
        return res.redirect(`/items`);
    } catch (error) {
        console.error("Error updating user:", error);
        req.flash("error", "Error updating user");
        return res.redirect(`/items`);
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

        const getDateString = (date) => date.toISOString().split('T')[0];
        const today = new Date();
        const yesterday = new Date(today);
        const dayBeforeYesterday = new Date(today);

        yesterday.setDate(today.getDate() - 1);
        dayBeforeYesterday.setDate(today.getDate() - 2);

        const todayStr = getDateString(today);
        const yesterdayStr = getDateString(yesterday);
        const dayBeforeYesterdayStr = getDateString(dayBeforeYesterday);

        const employeeStats = {};
        const employees = await Employee.find().lean();

        for (let employee of employees) {
            let totalSellsEmployee = 0;
            let totalPlatformChargesEmployee = 0;
            let totalDeliveryChargesEmployee = 0;

            let todaySells = 0, yesterdaySells = 0, dayBeforeYesterdaySells = 0;
            let todayPlatformCharges = 0, yesterdayPlatformCharges = 0, dayBeforeYesterdayPlatformCharges = 0;
            let todayDeliveryCharges = 0, yesterdayDeliveryCharges = 0, dayBeforeYesterdayDeliveryCharges = 0;

            const completedOrders = await Orders.find({ '_id': { $in: employee.completed_orders } }).lean();

            // Filter orders for each day
        const filterOrdersByDate = (dateStr) => completedOrders.filter(order => {
            return order.createdAt && getDateString(new Date(order.createdAt)) === dateStr;
        });

        const todayOrders = filterOrdersByDate(todayStr);
        const yesterdayOrders = filterOrdersByDate(yesterdayStr);
        const dayBeforeYesterdayOrders = filterOrdersByDate(dayBeforeYesterdayStr);

            const calculateStats = (orders) => {
                let totalSells = 0;
                let totalPlatformCharges = 0;
                let totalDeliveryCharges = 0;
                let lateDeliveries = 0;

                orders.forEach(order => {
        const distance = order.author?.distance || 0;
        const deliveryCharge = distance <= 1 ? 5 : 5 + Math.ceil((distance - 1) * 3);
        totalDeliveryCharges += deliveryCharge;

        const orderSell = order.items.reduce((sum, item) => {
            return sum + (item.item.price * item.item.quantity);
        }, 0);
        totalSells += orderSell;

        let platformCharge = 0;
        order.items.forEach(item => {
            if (item.item && item.item.price !== undefined && item.item.rprice !== undefined) {
                platformCharge += (item.item.price - item.item.rprice) * item.item.quantity;
            }
        });

        totalPlatformCharges += Math.round(platformCharge);

        // Calculate late deliveries
        if (order.deliveredAt && order.createdAt) {
            const created = new Date(order.createdAt);
            const delivered = new Date(order.deliveredAt);
            const diffInMinutes = (delivered - created) / (1000 * 60);
            if (diffInMinutes > 10) lateDeliveries++;
        }
    });

                return { totalSells, totalPlatformCharges, totalDeliveryCharges, lateDeliveries  };
            };

            const todayStats = calculateStats(todayOrders);
            const yesterdayStats = calculateStats(yesterdayOrders);
            const dayBeforeYesterdayStats = calculateStats(dayBeforeYesterdayOrders);

            // Aggregate
            totalSellsEmployee = todayStats.totalSells + yesterdayStats.totalSells + dayBeforeYesterdayStats.totalSells;
            totalPlatformChargesEmployee = todayStats.totalPlatformCharges + yesterdayStats.totalPlatformCharges + dayBeforeYesterdayStats.totalPlatformCharges;
            totalDeliveryChargesEmployee = todayStats.totalDeliveryCharges + yesterdayStats.totalDeliveryCharges + dayBeforeYesterdayStats.totalDeliveryCharges;

            // Daily
            todaySells = todayStats.totalSells;
            yesterdaySells = yesterdayStats.totalSells;
            dayBeforeYesterdaySells = dayBeforeYesterdayStats.totalSells;

            todayPlatformCharges = todayStats.totalPlatformCharges;
            yesterdayPlatformCharges = yesterdayStats.totalPlatformCharges;
            dayBeforeYesterdayPlatformCharges = dayBeforeYesterdayStats.totalPlatformCharges;

            todayDeliveryCharges = todayStats.totalDeliveryCharges;
            yesterdayDeliveryCharges = yesterdayStats.totalDeliveryCharges;
            dayBeforeYesterdayDeliveryCharges = dayBeforeYesterdayStats.totalDeliveryCharges;

            const deletedOrdersToday = (employee.deletedOrdersCount && employee.deletedOrdersCount[todayStr]) || 0;

            employeeStats[employee._id] = {
                username: employee.username,
                totalSells: totalSellsEmployee,
                totalPlatformCharges: totalPlatformChargesEmployee,
                totalDeliveries: totalDeliveryChargesEmployee,
                todaySells,
                yesterdaySells,
                dayBeforeYesterdaySells,
                todayPlatformCharges,
                yesterdayPlatformCharges,
                dayBeforeYesterdayPlatformCharges,
                todayDeliveryCharges,
                yesterdayDeliveryCharges,
                dayBeforeYesterdayDeliveryCharges,
                deletedOrdersToday,
            };
        }

        const topSellingItems = Object.entries(itemSales)
            .map(([name, quantitySold]) => ({ name, quantitySold }))
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 10);

        const topCustomers = Object.values(customerPurchases)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        const formattedEmployeeStats = Object.values(employeeStats);
        res.render("owner/statistics", {
            totalEarnings,
            totalOrders,
            topSellingItems,
            topCustomers,
            restaurantSales,
            previousMonthName,
            peakOrderTimes,
            ordersByDay,
            employeeStats: formattedEmployeeStats,
            todayStr,
            yesterdayStr,
            dayBeforeYesterdayStr,
        });

    } catch (error) {
        console.error("Error in statistics calculation:", error);
        next(error);
    }
};


module.exports.subscribeOwner = async (req, res) => {
    try {
        const { id } = req.params; // Restaurant (owner) ID from URL
        const { subscription } = req.body; // Web Push subscription object

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: "Invalid subscription object" });
        }

        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({ error: "Restaurant (owner) not found" });
        }

        restaurant.ownerPushSubscription = subscription;
        await restaurant.save();

        console.log("✅ Subscription saved for owner (restaurant):", restaurant._id);

        res.status(200).json({ message: "Owner subscription successful" });
    } catch (error) {
        console.error("❌ Error subscribing owner to notifications:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



