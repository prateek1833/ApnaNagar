const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware");
const {isLoggedIn,validateItem,isOwner}=require("../middleware.js");
const multer  = require('multer')



const ownerController=require("../Controller/owner.js");

router.get("/",isOwner,isLoggedIn, wrapAsync(ownerController.index))

router
.get("/:id/edit",isOwner,isLoggedIn, wrapAsync(ownerController.renderEdit))
.put("/:id/edit",isLoggedIn,isOwner,ownerController.update)

router
.post("/:id/status",isLoggedIn,isOwner,ownerController.status)

router
.get("/:id/quantity",isLoggedIn,isOwner,ownerController.renderQuantity)
.post("/:id/quantity",isLoggedIn,isOwner,ownerController.quantity)

router
.get("/addItem",isLoggedIn,ownerController.addItem)

module.exports=router;