const Review = require("../models/review.js");
const Item = require("../models/item.js");
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