const express = require("express");
const router = express.Router();
const Employee = require("../models/employee");


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
module.exports.renderDashboard = (req, res) => {
    res.render("employee/dashboard.ejs");
}

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
            completed_orders: []
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
            res.redirect("/employee/dashboard");  // Redirect to a dashboard or main page after login
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/employee/signup");  // Redirect back to the sign-up page if there's an error
    }
};

