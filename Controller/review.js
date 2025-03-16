const Review = require("../models/review.js");
const Item = require("../models/item.js");
const Restaurant=require("../models/restaurant.js");
const Employee = require("../models/employee");

module.exports.createReview=async(req,res)=>{
    let item=await Item.findById(req.params.id);
    let newReview=new Review(req.body.review);
    newReview.author=req.user._id;
    item.avgRating=parseFloat(((item.avgRating*item.reviews.length+newReview.rating)/(item.reviews.length+1)).toFixed(1));
    item.reviews.push(newReview);
    await newReview.save();
    await item.save();
    req.flash("success","New Review added");    
    res.redirect(`/items/${item._id}/show.ejs`);
}
module.exports.createRestaurantReview=async(req,res)=>{
    let restaurant=await Restaurant.findById(req.params.id);
    let newReview=new Review(req.body.review);
    newReview.author=req.user._id;
    restaurant.avgRating=parseFloat(((restaurant.avgRating*restaurant.reviews.length+newReview.rating)/(restaurant.reviews.length+1)).toFixed(1));
    restaurant.reviews.push(newReview);
    await newReview.save();
    await restaurant.save();
    req.flash("success","New Review added");    
    res.redirect(`/restaurant/${restaurant._id}/show`);
}
module.exports.createEmployeeReview=async(req,res)=>{
    let employee=await Employee.findById(req.params.id);
    let newReview=new Review(req.body.review);
    newReview.author=req.user._id;
    employee.avgRating=parseFloat(((employee.avgRating*employee.reviews.length+newReview.rating)/(employee.reviews.length+1)).toFixed(1));
    employee.reviews.push(newReview);
    await newReview.save();
    await employee.save();
    req.flash("success","New Review added");    
    res.redirect(`/employee/${employee._id}/profile`);
}

module.exports.destroyReview = async (req, res) => {
    try {
        const { id, rid } = req.params;

        // Find the item and remove the review reference
        const item = await Item.findByIdAndUpdate(
            id,
            { $pull: { reviews: rid } },
            { new: true } // Return the updated document
        ).populate('reviews'); // Ensure we get the reviews for recalculating avgRating

        if (!item) {
            req.flash('error', 'Item not found');
            return res.redirect('/items');
        }

        // Find the review to get its rating
        const review = await Review.findById(rid);
        if (!review) {
            req.flash('error', 'Review not found');
            return res.redirect(`/items/${id}`);
        }

        // Recalculate average rating
        const totalReviews = item.reviews.length;
        if (totalReviews === 0) {
            item.avgRating = 0; // No reviews left
        } else {
            const totalRating = item.avgRating * (totalReviews + 1) - review.rating;
            item.avgRating = parseFloat((totalRating / totalReviews).toFixed(1));
        }

        // Save the updated item
        await item.save();

        // Delete the review
        await Review.findByIdAndDelete(rid);

        req.flash('success', 'Review deleted successfully');
        res.redirect(`/items//${item._id}/show.ejs`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/items');
    }
};

module.exports.destroyRestaurantReview = async (req, res) => {
    try {
        const { id, rid } = req.params;

        // Find the restaurant and remove the review reference
        const restaurant = await Restaurant.findByIdAndUpdate(
            id,
            { $pull: { reviews: rid } },
            { new: true } // Return the updated document
        ).populate('reviews'); // Ensure we get the reviews for recalculating avgRating

        if (!restaurant) {
            req.flash('error', 'Restaurant not found');
            return res.redirect('/restaurants');
        }

        // Find the review to get its rating
        const review = await Review.findById(rid);
        if (!review) {
            req.flash('error', 'Review not found');
            return res.redirect(`/restaurant/${id}`);
        }

        // Recalculate average rating
        const totalReviews = restaurant.reviews.length;
        if (totalReviews === 0) {
            restaurant.avgRating = 0; // No reviews left
        } else {
            const totalRating = restaurant.avgRating * (totalReviews + 1) - review.rating;
            restaurant.avgRating = parseFloat((totalRating / totalReviews).toFixed(1));
        }

        // Save the updated restaurant
        await restaurant.save();

        // Delete the review
        await Review.findByIdAndDelete(rid);

        req.flash('success', 'Review deleted successfully');
        res.redirect(`/restaurant/${restaurant._id}/show`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/restaurants');
    }
};
module.exports.destroyEmployeeReview = async (req, res) => {
    try {
        const { id, rid } = req.params;

        // Find the restaurant and remove the review reference
        const employee = await Employee.findByIdAndUpdate(
            id,
            { $pull: { reviews: rid } },
            { new: true } // Return the updated document
        ).populate('reviews'); // Ensure we get the reviews for recalculating avgRating

        if (!employee) {
            req.flash('error', 'employee not found');
            return res.redirect(`/employee/${id}/profile`);
        }

        // Find the review to get its rating
        const review = await Review.findById(rid);
        if (!review) {
            req.flash('error', 'Review not found');
            return res.redirect(`/employee/${id}/profile`);
        }

        // Recalculate average rating
        const totalReviews = employee.reviews.length;
        if (totalReviews === 0) {
            employee.avgRating = 0; // No reviews left
        } else {
            const totalRating = employee.avgRating * (totalReviews + 1) - review.rating;
            employee.avgRating = parseFloat((totalRating / totalReviews).toFixed(1));
        }

        // Save the updated restaurant
        await employee.save();

        // Delete the review
        await Review.findByIdAndDelete(rid);

        req.flash('success', 'Review deleted successfully');
        res.redirect(`/employee/${id}/profile`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect(`/employee/${id}/profile`);
    }
};
