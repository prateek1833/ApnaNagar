const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware");const { isLoggedIn, validateItem, isOwner } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

const restaurantController = require("../Controller/restaurant.js");

// Route to display the main restaurant page
router.get("/", wrapAsync(restaurantController.index))

// Route for restaurant sign-up
router.post("/signUp", upload.single("image"), wrapAsync(restaurantController.createRestaurant));
router.get("/index", wrapAsync(restaurantController.indexRestaurant));

router
  .route("/login")
  .post(
    saveRedirectUrl,
    passport.authenticate("restaurant-local", { failureRedirect: "/login", failureFlash: true }),
    restaurantController.login
  );

router.get("/:id/show", wrapAsync(restaurantController.showRestaurant));


module.exports = router;
