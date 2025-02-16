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

module.exports.renderEmployee= async (req,res)=>{
    const Employees=await Employee.find({});
    res.render("owner/employee.ejs",{Employees});
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
    let { area, district, state, pincode, balance_due, mobile,dob } = req.body;

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
        const getDateString = (date) => date.toISOString().split('T')[0];
        const today = new Date();
        const yesterday = new Date(today);
        const dayBeforeYesterday = new Date(today);

        yesterday.setDate(today.getDate() - 1);
        dayBeforeYesterday.setDate(today.getDate() - 2);

        const todayStr = getDateString(today);
        const yesterdayStr = getDateString(yesterday);
        const dayBeforeYesterdayStr = getDateString(dayBeforeYesterday);

        // 2. Initialize stats for Today, Yesterday, and Day Before Yesterday
        let employeeStats = {};

        // Fetch all employees
        const employees = await Employee.find().lean();

        // 3. Loop through each employee and calculate earnings for the last three days
        for (let employee of employees) {
            let totalEarningsEmployee = 0;
            let totalDeliveriesEmployee = 0;
            let totalPlatformChargesEmployee = 0;
            let todayEarnings = 0;
            let yesterdayEarnings = 0;
            let dayBeforeYesterdayEarnings = 0;
            let todayDeliveries = 0;
            let yesterdayDeliveries = 0;
            let dayBeforeYesterdayDeliveries = 0;
            let todayPlatformCharges = 0;
            let yesterdayPlatformCharges = 0;
            let dayBeforeYesterdayPlatformCharges = 0;

            // Fetch completed orders for the employee
            const completedOrders = await Orders.find({ '_id': { $in: employee.completed_orders } }).lean();

            // Filter orders for today, yesterday, and the day before yesterday
            const todayOrders = completedOrders.filter(order => getDateString(new Date(order.createdAt)) === todayStr);
            const yesterdayOrders = completedOrders.filter(order => getDateString(new Date(order.createdAt)) === yesterdayStr);
            const dayBeforeYesterdayOrders = completedOrders.filter(order => getDateString(new Date(order.createdAt)) === dayBeforeYesterdayStr);

            // Function to calculate earnings and platform charges for each day
            const calculateStats = (orders) => {
                let earnings = 0;
                let platformCharges = 0;
                let deliveries = 0;
                orders.forEach(order => {
                    let totalPrice = order.items.reduce((sum, item) => sum + (item.item.price * item.item.quantity), 0);
                    let orderEarnings = 1;
                    if (totalPrice > 100) {
                        orderEarnings += Math.round(totalPrice * 0.01);
                    }
                    orderEarnings += Math.round(order.author.distance);
                    earnings += orderEarnings;

                    let charge = order.items.reduce((sum, item) => {
                        return sum + ((item.item.price > 50 ? 0.1 : 0.2) * item.item.price * item.item.quantity);
                    }, 0);

                    platformCharges += Math.round(charge);
                    if (order.author.distance > 3) {
                        platformCharges += Math.round(order.author.distance * 4);
                    }
                    deliveries++;
                });
                return { earnings, platformCharges, deliveries };
            };

            // Calculate stats for each day
            const todayStats = calculateStats(todayOrders);
            const yesterdayStats = calculateStats(yesterdayOrders);
            const dayBeforeYesterdayStats = calculateStats(dayBeforeYesterdayOrders);

            // Aggregate employee stats
            totalEarningsEmployee = todayStats.earnings + yesterdayStats.earnings + dayBeforeYesterdayStats.earnings;
            totalDeliveriesEmployee = todayStats.deliveries + yesterdayStats.deliveries + dayBeforeYesterdayStats.deliveries;
            totalPlatformChargesEmployee = todayStats.platformCharges + yesterdayStats.platformCharges + dayBeforeYesterdayStats.platformCharges;

            todayEarnings = todayStats.earnings;
            yesterdayEarnings = yesterdayStats.earnings;
            dayBeforeYesterdayEarnings = dayBeforeYesterdayStats.earnings;

            todayDeliveries = todayStats.deliveries;
            yesterdayDeliveries = yesterdayStats.deliveries;
            dayBeforeYesterdayDeliveries = dayBeforeYesterdayStats.deliveries;

            todayPlatformCharges = todayStats.platformCharges;
            yesterdayPlatformCharges = yesterdayStats.platformCharges;
            dayBeforeYesterdayPlatformCharges = dayBeforeYesterdayStats.platformCharges;

            // Store the stats for this employee
            employeeStats[employee._id] = {
                username: employee.username,
                totalEarnings: totalEarningsEmployee,
                totalDeliveries: totalDeliveriesEmployee,
                totalPlatformCharges: totalPlatformChargesEmployee,
                todayEarnings,
                yesterdayEarnings,
                dayBeforeYesterdayEarnings,
                todayDeliveries,
                yesterdayDeliveries,
                dayBeforeYesterdayDeliveries,
                todayPlatformCharges,
                yesterdayPlatformCharges,
                dayBeforeYesterdayPlatformCharges
            };
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
            employeeStats: formattedEmployeeStats, // Now it's an array
            todayStr,
            yesterdayStr,
            dayBeforeYesterdayStr,
        });

    } catch (error) {
        console.error("Error in statistics calculation:", error);
        next(error);
    }
};


