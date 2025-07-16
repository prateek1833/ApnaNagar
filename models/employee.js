const { boolean } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const employeeSchema = new Schema({
    mobile: {
        type: String,
        required: true,
        unique: true
    },
    area: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true,
        maxlength: 6
    },
    coordinates: {
        type: [Number],  // [latitude, longitude]
        required: true
    },
    status: {
        type: String,
        enum: ["Free", "Busy", "Offline"],
        default: "Free"
    },
    active_order: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        default: null
    },
    completed_orders: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    total_earnings: {
        type: Number,
        default: 0
    },
    total_deliveries: {
        type: Number,
        default: 0
    },
    avgRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    balance_due: {
        type: Number,
        default: 0 // Amount pending to be paid
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    isAvailable: {
        type: Boolean,
        default: false,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: String,
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String,
        },
    },
    image: {
        url: String,
        filename: String,
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review",
    }],
    aadhar: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{12}$/ // Optional: basic validation for 12-digit Aadhar
    },
        deletedOrdersCount: {
        type: Object,
        default: {}
    }


});

employeeSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Employee", employeeSchema);
