const ExpressError = require("./utils/ExpressError.js");
const multer = require("multer");
const { itemSchema,reviewSchema, orderSchema } = require("./schema.js");
const Review = require("./models/review.js");
const Item = require("./models/item.js");
const Restaurant = require("./models/restaurant.js");
const storage = multer.memoryStorage();


const imageSizeLimit = 512 * 1024; 

module.exports.validateImage = (req, res, next) => {
    if (!req.file) return next(); // No file uploaded, proceed further

    if (req.file.size > imageSizeLimit) {
        req.flash("error", "Image size must be less than 512 kB");
        return res.redirect("back");
    }
    next();
};


module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","Please Log in before performing this task");
        return res.redirect("/login");
    }
    next();
}

module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl=req.session.redirectUrl;
    }
    next();
}
module.exports.isOwner=async (req,res,next)=>{
    let {id}=req.params;
    if(res.locals.currUser &&  !res.locals.currUser.owner._id.equals(res.locals.currUser._id)){
        console.log(res.locals.currUser);
        req.flash("error","You don't have permission to perform this task");
        return res.redirect(`/items/${id}/show.ejs`);
    }
    next();
}

module.exports.validateItem = async(req, res, next) => {
    let { error } = itemSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};


module.exports.validateReview = async(req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};
module.exports.validateOrder = async(req, res, next) => {
    let { error } = orderSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.reviewAuthor=async (req,res,next)=>{
    let {id,rid}=req.params;
    let review =await Review.findById(rid);
    if (
        res.locals.currUser &&
        !review.author.equals(res.locals.currUser._id) && // Not the review author
        !res.locals.currUser._id.equals(res.locals.currUser.owner) // Not the owner
    ){
        req.flash("error","You didn't create this review");
        return res.redirect(`/items/${id}/show.ejs`);
    }
    next();
}

module.exports.isRestaurant = async (req, res, next) => {
    let { id } = req.params;
    let restaurant = await Restaurant.findById(id);
    if (!restaurant || !restaurant.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You don't have permission to access this restaurant");
        return res.redirect("/restaurants");
    }
    next();
};

module.exports.isEmployee = async (req, res, next) => {
    if (!req.user || req.user.type !== 'Delivery Boy') {
        req.flash("error", "You don't have permission to access this.");
        return res.redirect("/");
    }
    next();
};