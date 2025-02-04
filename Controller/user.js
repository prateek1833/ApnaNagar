const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Order = require("../models/order.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;


module.exports.renderSignUp = (req, res) => {
    res.render("user/signup.ejs");
}


module.exports.signup = async (req, res) => {
    try {
        const owner = "6638779c9bfc94fc81a42508";
        let { username, mobile, password } = req.body;

        // Provide default values for the required fields
        const pincode = "000000";
        const state = "Unknown";
        const district = "Unknown";
        const area = "Unknown";
        const type="User";

        const newUser = new User({ mobile, username, owner, pincode, state, district, area, type });
        const registerUser = await User.register(newUser, password);

        // Update the user's balance_due field
        registerUser.balance_due = 0;

        // Save the updated user document
        await registerUser.save();

        req.login(registerUser, (err) => {
            if (err) {
                return next(err);
            }
            res.redirect("/items");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};



module.exports.renderLogin = (req, res) => {
    res.render("user/login.ejs");
}

module.exports.logout = async (req, res, next) => {
    req.logout((err) => {
        if (err) {
            next(err);
        }
        res.clearCookie('order');
        req.flash("success", "you are logged out!");
        res.redirect("/");
    })

}

module.exports.login = async (req, res) => {
    let redirectUrl = res.locals.redirectUrl || "/items";

    res.redirect(redirectUrl);
}

module.exports.statistics = async (req, res, next) => {
    try {
        const { id } = req.params; // User ID
        const user = await User.findById(id).populate('orders'); // Populate orders field with Order documents

        if (!user) {
            return res.status(404).send("User not found");
        }

        const monthlySpend = {};
        const orders = user.orders || []; // Ensure orders is an array
        const balance_due = user.balance_due || 0;
        let totalSpend = 0;
        let totalOrders = 0;

        // Process each order
        orders.forEach(order => {
            if (order.items && order.createdAt) {
                const date = new Date(order.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format as YYYY-MM

                // Safely calculate order total
                const orderTotal = order.items.reduce((sum, item) => {
                    const price = item.item?.price || 0; // Default to 0 if price is missing
                    const quantity = item.item?.quantity || 0; // Default to 0 if quantity is missing
                    return sum + price * quantity;
                }, 0);

                monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + orderTotal;
                totalSpend += orderTotal;
                totalOrders++;
            }
        });

        const orderDates = [];
        const orderCounts = {};
        orders.forEach(order => {
            if (order.createdAt) {
                const date = new Date(order.createdAt).toISOString().split('T')[0];
                orderDates.push(date);
                orderCounts[date] = (orderCounts[date] || 0) + 1;
            }
        });

        const sortedOrderDates = [...new Set(orderDates)].sort();
        const sortedOrderCounts = sortedOrderDates.map(date => orderCounts[date]);

        const sortedMonthlySpend = Object.entries(monthlySpend)
            .sort(([a], [b]) => a.localeCompare(b)); // Sort by month keys

        const monthlyLabels = sortedMonthlySpend.map(([month]) => month); // ["2024-01", "2024-02"]
        const monthlyData = sortedMonthlySpend.map(([, spend]) => spend); // [5000, 7000]

        // Render the statistics page with data
        res.render('user/statistics', {
            monthlyLabels,
            monthlyData,
            orderDates: sortedOrderDates,
            orderCounts: sortedOrderCounts,
            balance_due,
            totalSpend,
            totalOrders,
            id,
            user
        });
    } catch (error) {
        next(error);
    }
};
