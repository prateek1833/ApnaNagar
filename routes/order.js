const express=require("express");
const router=express.Router({mergeParams:true});
const wrapAsync = require("../utils/wrapAsync.js")
const Restaurant = require('../models/restaurant'); // Import your Restaurant model
const ExpressError = require("../utils/ExpressError.js")
const { orderSchema } = require("../schema.js");
const Order = require("../models/order.js");
const Item = require("../models/item.js");
const {isLoggedIn,validateOrder}=require("../middleware.js");

const orderController=require("../Controller/order.js")

router
.post("/",isLoggedIn, wrapAsync(orderController.addToCart));

router.delete("/cart/:id/delete",isLoggedIn, wrapAsync(orderController.destroyFromCart));

router.get("/:id/location", isLoggedIn, async (req, res) => {
    res.render('user/location.ejs');
})
router.get("/checkout", isLoggedIn, async (req, res) => {
    const order = req.cookies.order ? JSON.parse(req.cookies.order) : [];

    // Filter orders based on restaurant `isOpen` status
    const filteredOrder = [];
    for (const item of order) {
        const restaurant = await Restaurant.findById(item.RestaurantId);
        if (restaurant && restaurant.isOpen) {
            filteredOrder.push(item);
        }
    }

    res.render('user/checkout.ejs', { order: filteredOrder });
});


router.post("/:id/update-address", isLoggedIn, wrapAsync(orderController.updateAddress));


router
.post("/checkout",isLoggedIn, (orderController.createOrder));

router
.post("/:id/buy",isLoggedIn, (orderController.buy));

router.delete("/:id/delete", isLoggedIn, orderController.destroyOrder);

module.exports=router;
