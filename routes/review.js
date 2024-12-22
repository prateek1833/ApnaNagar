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

router.delete("/:rid",isLoggedIn,reviewAuthor, wrapAsync(reviewController.destroyReview));


module.exports=router;
