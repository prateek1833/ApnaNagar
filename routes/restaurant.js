const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware");
const { isLoggedIn, validateImage, isOwner } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

const restaurantController = require("../Controller/restaurant.js");

// Route to display the main restaurant page
router.get("/", wrapAsync(restaurantController.index));

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

router
  .route("/:id/edit")
  .get(isLoggedIn, restaurantController.renderEdit)
  .put(isLoggedIn, upload.single("image"), restaurantController.update);

router.get("/:id/statistics", isLoggedIn, wrapAsync(restaurantController.statistics));

router.get("/:id/order", isLoggedIn, wrapAsync(restaurantController.orders));

router
.post("/:id/status",isLoggedIn,restaurantController.status)

// Route to toggle the restaurant's open/closed status
router.post("/:id/toggle", isLoggedIn, wrapAsync(restaurantController.toggleStatus));

router.delete("/:id/delete",isLoggedIn,isOwner, restaurantController.destroyRestaurant);
// Web Push Notifications
const webpush = require("web-push");

router.post("/:id/subscribe", isLoggedIn, wrapAsync(restaurantController.subscribe));

router.post("/:id/new", isLoggedIn,validateImage, upload.single('image'), wrapAsync(restaurantController.createItem));

router.get("/:id/newItem", isLoggedIn, async (req, res) => {
    res.render("items/new.ejs", { restaurantId: req.params.id });
});


module.exports = router;
