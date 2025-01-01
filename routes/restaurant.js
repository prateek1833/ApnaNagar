const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateItem, isOwner } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

const restaurantController = require("../Controller/restaurant.js");

// Route to display the main restaurant page
router.get("/", (req, res) => {
    res.send("Welcome to the restaurant page!");
});

// Route for restaurant sign-up
router.post("/signUp", upload.single("image"), wrapAsync(restaurantController.createRestaurant));
router.get("/:id/items", wrapAsync(restaurantController.restaurantItem));

router.get("/index", wrapAsync(restaurantController.indexRestaurant))


module.exports = router;
