const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const admin = require("firebase-admin");
const serviceAccount = require("./utils/firebaseConfig.json"); // Path to your Firebase key

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API,
    api_secret: process.env.CLOUD_API_SECRET,
})

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'items',
      allowedFormat:  ["png","jpg","jpeg"],     // supports promises as well
    },
});


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


module.exports={
    cloudinary,
    storage,
    admin,
}