const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Employee = require("../models/employee");
const Order = require("../models/order.js");
const Restaurant = require("../models/restaurant");



module.exports.renderLogin = (req, res) => {
    res.render("employee/login.ejs");
}

module.exports.profile = async (req, res) => {
    try {
        let employee = await Employee.findById(req.params.id)
            .populate({
                path: "reviews",
                populate: {
                    path: "author",
                },
            })
            .populate("owner");;
        if (!employee) {
            return res.status(404).send("Employee not found");
        }
        res.render("employee/profile.ejs", { employee });
    } catch (error) {
        res.status(500).send("Server Error");
    }
};


module.exports.login = async (req, res) => {
    try {
        if (!req.user) {
            req.flash("error", "Invalid credentials. Please try again.");
            return res.redirect("/login");
        }

        req.flash("success", "Welcome back to Apna Nagar");
        let redirectUrl = res.locals.redirectUrl || `/employee/${req.user.id}/dashboard`;

        res.redirect(redirectUrl);
    } catch (error) {
        req.flash("error", "Something went wrong. Please try again later.");
        res.redirect("/login");
    }
};


module.exports.renderSignUp = (req, res) => {
    res.render("employee/signup.ejs");
}
module.exports.renderDashboard = async (req, res) => {
    try {
        const employeeId = req.params.id;
        const employee = await Employee.findById(employeeId)
            .populate('active_order')
            .populate('completed_orders');

        // Fetch pending orders and populate items so that we can access item.RestaurantId
        const pendingOrders = await Order.find({ db_status: 'Pending' })
            .populate('author')

        // Fetch restaurant names for each item in the active order
        let restaurantNames = {};
        if (employee.active_order) {
            for (const item of employee.active_order.items) {
                if (item.item.RestaurantId) {
                    const restaurant = await Restaurant.findById(item.item.RestaurantId);
                    restaurantNames[item.item._id] = restaurant ? restaurant.username : 'No Restaurant';
                }
            }
        }

        // Fetch restaurant names for each item in all pending orders
        let pendingRestaurantNames = {};
        for (const order of pendingOrders) {
            for (const item of order.items) {
                if (item.item.RestaurantId) {
                    const restaurant = await Restaurant.findById(item.item.RestaurantId);
                    pendingRestaurantNames[item.item._id] = restaurant ? restaurant.username : 'No Restaurant';
                }
            }
        }

        // Render the dashboard view and pass necessary data to the frontend
        res.render('employee/dashboard', {
            employee,
            pendingOrders,
            restaurantNames,         // for active order items
            pendingRestaurantNames   // for pending order items
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'There was an error fetching the dashboard.');
        res.redirect('/some-error-page');
    }
};



module.exports.signup = async (req, res, next) => {
    try {
        const { username, mobile, password, area, district, state, pincode, latitude, longitude, aadhar } = req.body;

        // Provide default values for the required fields if not provided
        const owner = "6638779c9bfc94fc81a42508";  // Set as required
        const coordinates = [latitude, longitude]; // Latitude and longitude
        let url, filename;

        // Validate image upload
        if (req.file) {
            url = req.file.path;
            filename = req.file.filename;
        } else {
            req.flash("error", "Image upload is required");
            console.log(req.file);
            return res.redirect("/employee/signup");
        }

        // Create a new Employee instance with the provided data
        const newEmployee = new Employee({
            mobile,
            username,
            image: { url, filename },
            owner,
            area,
            district,
            state,
            pincode,
            coordinates,
            status: "Free",
            total_earnings: 0,
            total_deliveries: 0,
            avgRating: 0,
            balance_due: 0,
            active_order: null,
            completed_orders: [],
            type: "Delivery Boy",
            isAvailable: false,
            aadhar
        });

        // Register the employee using passport-local-mongoose
        const registeredEmployee = await Employee.register(newEmployee, password);

        // Ensure the employee is saved with the updated default fields
        await registeredEmployee.save();

        // Log in the newly registered employee
        req.login(registeredEmployee, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to the Delivery Team!");
            res.redirect(`/employee/${registeredEmployee._id}/dashboard`);
        });
    } catch (e) {
        req.flash("error", e.message);
        console.log(e.message);
        res.redirect("/employee/signup");  // Redirect back to the sign-up page if there's an error
    }
};

module.exports.toggleStatus = async (req, res) => {
    const { id } = req.params;
    const employee = await Employee.findById(id);

    if (!employee) {
        req.flash("error", "Employee not found.");
        return res.redirect("/employee");
    }

    // Toggle the isOpen status
    employee.isAvailable = !employee.isAvailable;
    await employee.save();

    req.flash("success", `You is now marked as ${employee.isAvailable ? "Available" : "Not Availbale"}.`);
    res.redirect(`/employee/${id}/dashboard`);
};


module.exports.completeOrder = async (req, res) => {
    try {
        let employeeId = req.params.id; // Correct way to extract employeeId

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            console.log("Invalid Employee ID:", req.params);
            req.flash("error", "Invalid Employee ID format.");
            return res.redirect("/orders");
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            req.flash("error", "Employee not found.");
            return res.redirect("/orders");
        }

        // Validate if `active_order` exists before querying
        if (!employee.active_order || !mongoose.Types.ObjectId.isValid(employee.active_order)) {
            req.flash("error", "No active order found for the employee.");
            return res.redirect("/orders");
        }

        const order = await Order.findById(employee.active_order);
        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/orders");
        }

        // Update employee and order status
        employee.status = "Free";
        employee.total_deliveries += 1;
        employee.completed_orders.push(employee.active_order);
        employee.active_order = null;

        order.db_status = "Completed";
        order.status = "Delivered";

        if (!order.deliveredAt) {
            order.deliveredAt = new Date();
        }
        
        order.deliveryBoy = { _id: employee._id, name: employee.username, mobile: employee.mobile };

        await employee.save();
        await order.save();

        req.flash("success", "Order completed successfully!");
        return res.redirect(`/employee/${employeeId}/dashboard`);
    } catch (error) {
        console.error("Error in completeOrder:", error);
        req.flash("error", `Error completing order: ${error.message}`);
        return res.redirect("/orders");
    }
};

module.exports.completeOrderAndAssignNext = async (req, res) => {
    try {
        let employeeId = req.params.id; // Extract employeeId

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            console.log("Invalid Employee ID:", req.params);
            req.flash("error", "Invalid Employee ID format.");
            return res.redirect("/orders");
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            req.flash("error", "Employee not found.");
            return res.redirect("/orders");
        }

        // Validate if `active_order` exists before querying
        if (!employee.active_order || !mongoose.Types.ObjectId.isValid(employee.active_order)) {
            req.flash("error", "No active order found for the employee.");
            return res.redirect("/orders");
        }

        const order = await Order.findById(employee.active_order);
        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/orders");
        }

        // Complete the current order
        employee.status = "Free";
        employee.total_deliveries += 1;
        employee.completed_orders.push(employee.active_order);
        employee.active_order = null;

        order.db_status = "Completed";
        order.status = "Delivered";

        if (!order.deliveredAt) {
            order.deliveredAt = new Date();
        }

        await employee.save();
        await order.save();

        // Find the next pending order
        const nextOrder = await Order.findOne({ db_status: "Pending" }).sort({ createdAt: 1 });

        if (employee.status !== "Free") {
            req.flash("error", "You are not free to take an order");
        } else if (!employee.isAvailable) {
            req.flash("error", "You are not available");
        } else if (nextOrder) { // Ensure nextOrder exists before assigning
            // Assign the new order to the employee
            employee.active_order = nextOrder._id;
            employee.status = "Busy";
            nextOrder.db_status = "Assigned";
            nextOrder.deliveryBoy = { _id: employee._id, name: employee.username, mobile: employee.mobile };

            await employee.save();
            await nextOrder.save();

            req.flash("success", "Order completed and next pending order assigned successfully!");
        } else {
            req.flash("success", "Order completed, but no pending orders available.");
        }

        return res.redirect(`/employee/${employeeId}/dashboard`);
    } catch (error) {
        console.error("Error in completeOrderAndAssignNext:", error);
        req.flash("error", `Error completing and assigning order: ${error.message}`);
        return res.redirect("/orders");
    }
};

module.exports.completeNextPendingOrder = async (req, res) => {
    try {
        let employeeId = req.params.id; // Extract employeeId

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            console.log("Invalid Employee ID:", req.params);
            req.flash("error", "Invalid Employee ID format.");
            return res.redirect("/orders");
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            req.flash("error", "Employee not found.");
            return res.redirect(`/employee/${req.user}/dashboard`);
        }

        // Check if the employee is already handling an active order
        if (employee.active_order) {
            req.flash("info", "Employee already has an active order.");
            return res.redirect(`/employee/${employeeId}/dashboard`);
        }

        // Find the next pending order
        const nextOrder = await Order.findOne({ db_status: "Pending" }).sort({ createdAt: 1 });

        if (!nextOrder) {
            req.flash("info", "No pending orders available.");
            return res.redirect(`/employee/${employeeId}/dashboard`);
        }

        // Assign the new order to the employee
        employee.active_order = nextOrder._id;
        employee.status = "Busy";
        nextOrder.db_status = "Assigned";
        nextOrder.deliveryBoy = { _id: employee._id, name: employee.username, mobile: employee.mobile };

        await employee.save();
        await nextOrder.save();

        req.flash("success", "Next pending order assigned successfully!");
        return res.redirect(`/employee/${employeeId}/dashboard`);
    } catch (error) {
        console.error("Error in takeNextPendingOrder:", error);
        req.flash("error", `Error assigning order: ${error.message}`);
        return res.redirect("/orders");
    }
};

module.exports.Statistics = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Delivery Boy not found' });
        }
        const completedOrders = await Order.find({ '_id': { $in: employee.completed_orders } });
        if (!completedOrders || completedOrders.length === 0) {
            return res.status(404).json({ message: 'No completed orders found' });
        }

        const getDateString = (date) => date.toISOString().split('T')[0];

        // Get today's, yesterday's, and the day before yesterday's date
        const todayDate = new Date();
        const yesterdayDate = new Date(todayDate);
        const dayBeforeYesterdayDate = new Date(todayDate);

        yesterdayDate.setDate(todayDate.getDate() - 1);
        dayBeforeYesterdayDate.setDate(todayDate.getDate() - 2);

        const todayStr = getDateString(todayDate);
        const yesterdayStr = getDateString(yesterdayDate);
        const dayBeforeYesterdayStr = getDateString(dayBeforeYesterdayDate);

        // Filter orders for each day
        const filterOrdersByDate = (dateStr) => completedOrders.filter(order => {
            return order.createdAt && getDateString(new Date(order.createdAt)) === dateStr;
        });

        const todayOrders = filterOrdersByDate(todayStr);
        const yesterdayOrders = filterOrdersByDate(yesterdayStr);
        const dayBeforeYesterdayOrders = filterOrdersByDate(dayBeforeYesterdayStr);

        // Calculate earnings and platform charges for each day
const calculateStats = (orders) => {
    let totalSells = 0;
    let totalPlatformCharges = 0;
    let totalDeliveryCharge = 0;

    orders.forEach(order => {
        const distance = order.author?.distance || 0;
        const deliveryCharge = distance <= 1 ? 5 : 5 + Math.ceil((distance - 1) * 3);
        totalDeliveryCharge += deliveryCharge;

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
    });

    return {
        totalEarnings: totalSells,
        totalPlatformCharges,
        totalDeliveries: totalDeliveryCharge
    };
};



        const todayStats = calculateStats(todayOrders);
        const yesterdayStats = calculateStats(yesterdayOrders);
        const dayBeforeYesterdayStats = calculateStats(dayBeforeYesterdayOrders);

        res.render('employee/statistics.ejs', {
            username: employee.username,
            mobile: employee.mobile,
            todayEarnings: todayStats.totalEarnings,
            yesterdayEarnings: yesterdayStats.totalEarnings,
            dayBeforeYesterdayEarnings: dayBeforeYesterdayStats.totalEarnings,
            todayDeliveries: todayStats.totalDeliveries,
            yesterdayDeliveries: yesterdayStats.totalDeliveries,
            dayBeforeYesterdayDeliveries: dayBeforeYesterdayStats.totalDeliveries,
            todayPlatformCharges: todayStats.totalPlatformCharges,
            yesterdayPlatformCharges: yesterdayStats.totalPlatformCharges,
            dayBeforeYesterdayPlatformCharges: dayBeforeYesterdayStats.totalPlatformCharges,
        });
    } catch (error) {
        console.error("Error in Statistics Controller:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports.OrderHistory = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Delivery Boy not found' });
        }

        // Fetch completed orders of the delivery boy
        const completedOrders = await Order.find({ '_id': { $in: employee.completed_orders } }).sort({ createdAt: -1 });

        if (!completedOrders || completedOrders.length === 0) {
            return res.status(404).json({ message: 'No completed orders found' });
        }

        res.render('employee/order.ejs', {
            username: employee.username,
            mobile: employee.mobile,
            completedOrders,
        });
    } catch (error) {
        console.error("Error in OrderHistory Controller:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports.DeliveredStatus = async (req, res) => {
    try {
        let employeeId = req.params.id; // Extract employeeId

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            console.log("Invalid Employee ID:", req.params);
            req.flash("error", "Invalid Employee ID format.");
            return res.redirect("/orders");
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            req.flash("error", "Employee not found.");
            return res.redirect("/orders");
        }

        // Validate if `active_order` exists before querying
        if (!employee.active_order || !mongoose.Types.ObjectId.isValid(employee.active_order)) {
            req.flash("error", "No active order found for the employee.");
            return res.redirect("/orders");
        }

        const order = await Order.findById(employee.active_order);
        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/orders");
        }

        order.status = "Delivered";
        order.deliveredAt = new Date();

        await order.save();
        req.flash("success", "Order delivered");
        return res.redirect(`/employee/${employeeId}/dashboard`);
    } catch (error) {
        console.error("Error in completeOrderAndAssignNext:", error);
        req.flash("error", `Error completing and assigning order: ${error.message}`);
        return res.redirect("/orders");
    }
};
module.exports.subscribe = async (req, res) => {
    try {
        const { id } = req.params; // Employee ID from URL
        const { subscription } = req.body; // Subscription object

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: "Invalid subscription object" });
        }

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        employee.pushSubscription = subscription;
        await employee.save();

        console.log("✅ Subscription saved for employee:", employee._id);

        res.status(200).json({ message: "Subscription successful" });
    } catch (error) {
        console.error("❌ Error subscribing to notifications:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports.deleteOrder = async (req, res) => {
    const { id } = req.params;
    try {
        // Find employee
        const employee = await Employee.findById(id);
        if (!employee) {
            req.flash('error', 'Employee not found');
            return res.redirect(`/employee/${id}/dashboard`);
        }

        // Check if employee has an active order
        if (!employee.active_order) {
            req.flash('error', 'No active order found for this employee');
            return res.redirect(`/employee/${id}/dashboard`);
        }

        // Find and delete the active order
        await Order.findByIdAndDelete(employee.active_order);

        // Set active_order to null
        employee.active_order = null;
        employee.status = "Free";

        // ---- Track Deleted Order Count (add this block) ----
        const today = new Date().toISOString().slice(0, 10);

        if (!employee.deletedOrdersCount) {
            employee.deletedOrdersCount = {};
        }

        employee.deletedOrdersCount[today] = (employee.deletedOrdersCount[today] || 0) + 1;
        employee.markModified('deletedOrdersCount'); // Important!

        await employee.save();

        console.log("Deleted Orders Count Updated:", employee.deletedOrdersCount);

        req.flash('success', 'Active order deleted successfully');
        res.redirect(`/employee/${id}/dashboard`);
    } catch (error) {
        console.error('Error deleting active order:', error);
        req.flash('error', 'Something went wrong while deleting the order');
        res.redirect(`/employee/${id}/dashboard`);
    }
};

module.exports.outForDelivery = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch employee and populate active_order
        const employee = await Employee.findById(id).populate('active_order');

        // Ensure employee and an active order exist
        if (!employee || !employee.active_order) {
            req.flash('error', 'No active order found for this employee.');
            return res.redirect(`/employee/${id}/dashboard`);
        }

        // Update the status
        // Validate if `active_order` exists before querying
        if (!employee.active_order || !mongoose.Types.ObjectId.isValid(employee.active_order)) {
            req.flash("error", "No active order found for the employee.");
            return res.redirect("/orders");
        }

        const order = await Order.findById(employee.active_order);
        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/orders");
        }

        order.status = "Out for Delivery";
        await order.save();

        req.flash('success', 'Order marked as Out for Delivery.');
        res.redirect(`/employee/${id}/dashboard`);
    } catch (err) {
        console.error('Error updating status to Out for Delivery:', err);
        req.flash('error', 'Something went wrong while updating the status.');
        res.redirect(`/employee/${id}/dashboard`);
    }
};
