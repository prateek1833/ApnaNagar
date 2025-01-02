const mongoose=require("mongoose");
const Schema =mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema=new Schema({
    mobile:{
        type:String,
        required: true,
    },
    area:{
        type:String,
        required: true,
    },
    district:{
        type:String,
        required: true,
    },
    state:{
        type:String,
        required: true,
    },
    pincode:{
        type:Number,
        required: true,
        maxlength: 6,
    },
    orders: [{
        type: Schema.Types.ObjectId,
        ref: "Orders",
    }],
    distance: Number,
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    coordinates: {
        type: [Number],
        required: true
      },
    balance_due: Number,
    type: String,

})

userSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model("User",userSchema);