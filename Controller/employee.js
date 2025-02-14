const express = require("express");
const router = express.Router();
const Employee = require("../models/employee");
const Order = require("../models/order.js");


module.exports.renderLogin = (req, res) => {
    res.render("employee/login.ejs");
}

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to Apna Nagar");
    let redirectUrl = res.locals.redirectUrl || "/employee/dashboard";

    res.redirect(redirectUrl);
}

module.exports.renderSignUp = (req, res) => {
    res.render("employee/signup.ejs");
}
module.exports.renderDashboard = async (req, res) => {
    try {
        const employeeId = req.params.id; // Or whatever method you're using to get the employee's ID
        const employee = await Employee.findById(employeeId).populate('active_order').populate('completed_orders');
        
        // Fetch pending orders from the queue (orders that are yet to be assigned to any delivery boy)
        const pendingOrders = await Order.find({ status: 'Pending' }).populate('author');

        // Render the dashboard view and pass necessary data
        res.render('employee/dashboard', {
            employee,        // Employee details
            pendingOrders    // Pending orders for the employee to see
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'There was an error fetching the dashboard.');
        res.redirect('/some-error-page');
    }
};

module.exports.signup = async (req, res, next) => {
    try {
        const { username, mobile, password, area, district, state, pincode, latitude, longitude } = req.body;

        // Provide default values for the required fields if not provided
        const owner = "6638779c9bfc94fc81a42508";  // Set as required
        const coordinates = [latitude, longitude]; // Latitude and longitude

        // Create a new Employee instance with the provided data
        const newEmployee = new Employee({
            mobile,
            username,
            owner,
            area,
            district,
            state,
            pincode,
            coordinates,
            status: "Free",
            total_earnings: 0,
            total_deliveries: 0,
            rating: 5,
            balance_due: 0,
            active_order: null,
            completed_orders: [],
            type:"Delivery Boy",
            isAvailable:false,
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

// Assume the delivery boy completes the order
module.exports.completeOrder = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const employee = await Employee.findById(employeeId);
        const order = await Order.findById(orderId);

        // Check if the employee and order exist
        if (!employee || !order) {
            req.flash("error", "Invalid employee or order.");
            return res.redirect("/orders");
        }

        // Update the delivery boy's status and mark the order as completed
        employee.status = "Free";
        employee.isAvailable = true;
        employee.total_deliveries += 1;
        employee.completed_orders.push(orderId);
        employee.active_order = null;

        // Mark the order as completed
        order.db_status = "Completed";

        await employee.save();
        await order.save();

        req.flash("success", "Order completed successfully!");
        res.redirect("/orders");
    } catch (error) {
        console.error(error);
        req.flash("error", `Error completing order: ${error.message}`);
        res.redirect("/orders");
    }
};


