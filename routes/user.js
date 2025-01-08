
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Restaurant = require('../models/restaurant'); // Import your Restaurant model
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware");
const {isLoggedIn,validateItem,isOwner}=require("../middleware.js");

const userController=require("../Controller/user");

router
.route("/signup")
.get( userController.renderSignUp)
.post( wrapAsync(userController.signup))

router.get("/logout",wrapAsync(userController.logout));

router
.route("/login")
.get(userController.renderLogin)
.post( saveRedirectUrl, passport.authenticate("local", { failureRedirect: '/login', failureFlash: true }), userController.login);


router.get("/:id/cart", isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const order = req.cookies.order ? JSON.parse(req.cookies.order) : [];

    // Initialize arrays for open and closed items
    const openItems = [];
    const closedItems = [];

    // Iterate through the orders and check the restaurant status
    for (const item of order) {
        try {
            const restaurant = await Restaurant.findById(item.RestaurantId); // Query the restaurant
            if (restaurant && restaurant.isOpen) {
                openItems.push(item); // Add to openItems if the restaurant is open
            } else {
                closedItems.push(item); // Add to closedItems if the restaurant is closed
            }
        } catch (error) {
            console.error(`Error fetching restaurant with ID ${item.RestaurantId}:`, error);
            closedItems.push(item); // Treat as closed if there's an error
        }
    }

    // Render the cart page with open and closed items
    res.render('user/cart.ejs', { openItems, closedItems, id });
});




module.exports = router;