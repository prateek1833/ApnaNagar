const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const restaurantSchema = new Schema({
    // username: {
    //     type: String,
    //     required: true,
    // },
    address: {
        type: String,
        required: true,
    },
    coordinates: {
        type: [Number],
        required: true,
    },
    items: [{
        type: Schema.Types.ObjectId,
        ref: "Item",
    }],
    orders: [{
        type: Schema.Types.ObjectId,
        ref: "Order",
    }],
    category: {
        type: String,
        enum: ['Fast Food', 'Casual Dining', 'Fine Dining', 'Cafe', 'Buffet', 'Other'],
        default: 'Other',
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    rating: {
        avgRating: {
            type: Number,
            default: 0,
        },
        numberOfRatings: {
            type: Number,
            default: 0,
        },
    },
    image: {
        url: String,
        filename: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    type: String,
});

// Add a username field for authentication
restaurantSchema.plugin(passportLocalMongoose);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;
