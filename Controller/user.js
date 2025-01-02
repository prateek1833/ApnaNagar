const express = require("express");
const router = express.Router();
const User = require("../models/user");
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
            req.flash("success", "Welcome to Apna Nagar");
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
        res.redirect("/items");
    })

}

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to Apna Nagar");
    let redirectUrl = res.locals.redirectUrl || "/items";

    res.redirect(redirectUrl);
}