const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const restaurantSchema = new Schema({
    // username field will be added by passport-local-mongoose plugin
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
    image: {
        url: String,
        filename: String,
    },
    mobile: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{10}$/.test(v); // Validates a 10-digit number
            },
            message: props => `${props.value} is not a valid mobile number!`
        }
    },
    balance_due: Number,
    createdAt: {
        type: Date,
        default: Date.now,
    },
    type: {
        type: String,
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review",
    }],
    avgRating:Number,
    isOpen: {
        type: Boolean,
        default: true,
    },
    open_time: {
        type: String, // "HH:mm" format
        required: true,
        validate: {
            validator: function(v) {
                return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v); // Validates time in 24-hour "HH:mm" format
            },
            message: props => `${props.value} is not a valid time format (HH:mm)!`,
        },
    },
    close_time: {
        type: String, // "HH:mm" format
        required: true,
        validate: {
            validator: function(v) {
                return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v); // Validates time in 24-hour "HH:mm" format
            },
            message: props => `${props.value} is not a valid time format (HH:mm)!`,
        },
    },
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String,
        },
    },
});

// Add a username field for authentication
restaurantSchema.plugin(passportLocalMongoose);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;
