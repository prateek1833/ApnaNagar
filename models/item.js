const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const Restaurant = require("./restaurant.js");
const { bool } = require("joi");


const itemSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        url: String,
        filename: String,
    },
    category: String,
    unit:String,
    detail:[{
        price:Number,
        rprice:Number,
        typ:String,
    }],
    avgRating:Number,
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review",
    }],
    key:[{
        type:String,
    }],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    RestaurantId: String,
    isAvailable: Boolean
});
itemSchema.post("findOneAndDelete", async (item) => {
    if (item) {
        await Review.deleteMany({ _id: { $in: item.reviews } })
    }
})

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;