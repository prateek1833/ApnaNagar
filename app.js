if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const Restaurant = require("./models/restaurant");

const itemRouter = require("./routes/item");
const reviewsRouter = require("./routes/review");
const orderRouter = require("./routes/order");
const userRouter = require("./routes/user");
const ownerRouter = require("./routes/owner");
const restaurantRouter = require("./routes/restaurant");

const app = express();

// const dbUrl = "mongodb://localhost:27017/Store";
const dbUrl = process.env.ATLASDB_URL;

mongoose
    .connect(dbUrl)
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => {
        console.error("DB Connection Error:", err);
    });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.engine("ejs", ejsMate);
app.use(cookieParser());

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (error) => {
    console.error("Session Store Error:", error);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// User Strategy
passport.use(new LocalStrategy(User.authenticate())); // Default "local" strategy
// Restaurant Strategy
passport.use("restaurant-local", new LocalStrategy(Restaurant.authenticate()));

// Serialization and Deserialization
passport.serializeUser((entity, done) => {
    if (entity instanceof User) {
        done(null, { id: entity.id, type: "User" });
    } else if (entity instanceof Restaurant) {
        done(null, { id: entity.id, type: "Restaurant" });
    }
});

passport.deserializeUser(async (obj, done) => {
    try {
        if (obj.type === "User") {
            const user = await User.findById(obj.id);
            done(null, user);
        } else if (obj.type === "Restaurant") {
            const restaurant = await Restaurant.findById(obj.id);
            done(null, restaurant);
        } else {
            done(new Error("Unknown type"), null);
        }
    } catch (err) {
        done(err, null);
    }
});


app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// Routes
app.get("/demouser", async (req, res) => {
    let fakeUser = new User({
        email: "student@gmail.com",
        username: "delta-student",
    });
    let registeredUser = await User.register(fakeUser, "helloworld");
    res.send(registeredUser);
});

app.get("/", (req, res) => {
    res.redirect("/items/restaurant");
});
app.get("/restaurant/", (req, res) => {
    res.redirect(`/restaurant/${req.user.id}/show`);
});

app.use("/owner", ownerRouter);
app.use("/items", itemRouter);
app.use("/items/:id/reviews", reviewsRouter);
app.use("/restaurant/:id/reviews", reviewsRouter);
app.use("/", userRouter);
app.use("/order", orderRouter);
app.use("/restaurant", restaurantRouter);

app.post("/login-user", passport.authenticate("user-local", {
    failureRedirect: "/login",
    failureFlash: true,
}), (req, res) => {
    res.redirect("/");
});

app.post("/login-restaurant", passport.authenticate("restaurant-local", {
    failureRedirect: "/login",
    failureFlash: true,
}), (req, res) => {
    res.redirect("/");
});

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    console.error(err); // Log the error for debugging
    const { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("items/err.ejs", { message });
});

app.listen(8080, () => {
    console.log("Server is listening on port 8080");
});
