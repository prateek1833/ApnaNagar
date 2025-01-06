const express=require("express");
const router=express.Router({mergeParams:true});
const wrapAsync = require("../utils/wrapAsync.js")
const ExpressError = require("../utils/ExpressError.js")
const { itemSchema, reviewSchema } = require("../schema.js");
const Review = require("../models/review.js");
const Item = require("../models/item.js");
const {isLoggedIn, reviewAuthor,validateReview}=require("../middleware.js");

const reviewController=require("../Controller/review.js")


router.post("/",isLoggedIn, validateReview, wrapAsync(reviewController.createReview));
router.post("/restaurant",isLoggedIn, validateReview, wrapAsync(reviewController.createRestaurantReview));

router.delete("/:rid",isLoggedIn,reviewAuthor, wrapAsync(reviewController.destroyReview));
router.delete("/:rid/restaurant",isLoggedIn,reviewAuthor, wrapAsync(reviewController.destroyRestaurantReview));


module.exports=router;
