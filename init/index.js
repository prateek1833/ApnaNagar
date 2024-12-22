const mongoose=require("mongoose");
const initData=require("./data.js");
const Item=require("../models/item.js");

const mongo_url = "mongodb://127.0.0.1:27017/Store";

main()
    .then(() => {
        console.log("connect to DB");
    })
    .catch((err) => {
        console.log(err);
    });
async function main() {
    await mongoose.connect(mongo_url);
}

const initDB=async()=>{
    await Item.deleteMany();
    initData.data=initData.data.map((obj)=>({...obj,owner:"6638779c9bfc94fc81a42508"}));
    await Item.insertMany(initData.data);
    console.log("data was initialized");
}

initDB();   