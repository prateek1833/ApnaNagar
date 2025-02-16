const express = require("express");
const passport = require("passport");
const Employee = require("../models/employee");
const wrapAsync = require("../utils/wrapAsync");
const { saveRedirectUrl } = require("../middleware");
const {isLoggedIn,validateItem,isOwner}=require("../middleware.js");

const router = express.Router();
const employeeController=require("../Controller/employee");


router
.route("/login")
.get(employeeController.renderLogin)
.post( saveRedirectUrl, passport.authenticate("employee-local", { failureRedirect: '/login', failureFlash: true }), employeeController.login);

router
.route("/signup")
.get( employeeController.renderSignUp)
.post( wrapAsync(employeeController.signup))

router
.route("/:id/dashboard")
.get( employeeController.renderDashboard)

router.post("/:id/toggle", isLoggedIn, wrapAsync(employeeController.toggleStatus));

router.post("/:id/complete", isLoggedIn, wrapAsync(employeeController.completeOrder));

router.post("/:id/completeAndNext", isLoggedIn, wrapAsync(employeeController.completeOrderAndAssignNext));

router.post("/:id/takeNextPending", isLoggedIn, wrapAsync(employeeController.completeNextPendingOrder)); 

router.get("/:id/statistics", isLoggedIn, wrapAsync(employeeController.Statistics)); 

module.exports = router;
