const express=require("express");
const router=express.Router();
const wrapAsync = require("../utils/wrapAsync.js")
const {isLoggedIn,validateItem,isOwner}=require("../middleware.js");
const multer  = require('multer')
const {storage}=require("../cloudConfig.js")
const upload = multer({ storage });


const itemController=require("../Controller/item.js");

router.get("/", wrapAsync(itemController.index))

router.get("/restaurant", wrapAsync(itemController.indexRestaurant))
router.get("/hardware", wrapAsync(itemController.indexHardware))
router.get("/clothes", wrapAsync(itemController.indexClothes))
router.get("/accessories", wrapAsync(itemController.indexAccessories))
router.get("/paints", wrapAsync(itemController.indexPaint))
router.get("/grocery", wrapAsync(itemController.indexGrocery))

router.get("/search", wrapAsync(itemController.search))

router.get("/:id/show.ejs", wrapAsync(itemController.showItem));
router.get("/orders",isOwner,isLoggedIn, wrapAsync(itemController.orders));
router.get("/:id/myOrders",isLoggedIn, wrapAsync(itemController.myOrders));

router.get("/new", isLoggedIn, async (req, res) => {
    res.render("items/new.ejs");
})


router.post("/new",isLoggedIn,upload.single('image'), wrapAsync(itemController.createItem));

router
.route("/:id/edit")
.get(isLoggedIn, itemController.renderEdit)
.put(isLoggedIn,upload.single('image'), itemController.update)


router.delete("/:id/delete",isLoggedIn, itemController.destroyItem);


module.exports=router;
