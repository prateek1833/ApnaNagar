const mongoose = require('mongoose');

const { Schema } = mongoose;

const orderSchema = new Schema({
    items: [
        {
            item: {
                image: {
                    url: String,
                    filename: String,
                },
                _id: String,
                title: String,
                description: String,
                unit:String,
                price: Number,
                typ:String,
                quantity: Number,
                RestaurantId:String,
                owner: String,
                __v: Number,
                // type: Schema.Types.ObjectId,
                // ref: "Item"
            },
        },
    ],
    status:String,
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    author: {
        _id:String,
        name:String,
        area:String,
        district:String,
        state:String,
        pincode:Number,
        mobile: Number,
        distance:Number,
        balance_due:Number,
        coordinates: {
            type: [Number],
            required: true
        },
    },
    db_status: {
        type: String,
        enum: ["Pending", "Assigned", "Completed"],
        default: "Pending"
    },
    deliveryBoy: {
        _id: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        name: String,
        mobile: String,
    },
    restaurantToken: String,  // FCM Token for Restaurant
    deliveryBoyToken: String, // FCM Token for Delivery Boy
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
