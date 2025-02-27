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

const cors = require("cors");
const bodyParser = require("body-parser");

const http = require("http");
const socketIo = require("socket.io");
const admin = require("./cloudConfig"); // Firebase Config

const User = require("./models/user");
const Restaurant = require("./models/restaurant");
const Employee = require("./models/employee");

const itemRouter = require("./routes/item");
const reviewsRouter = require("./routes/review");
const orderRouter = require("./routes/order");
const userRouter = require("./routes/user");
const ownerRouter = require("./routes/owner");
const restaurantRouter = require("./routes/restaurant");
const employeeRouter = require("./routes/employee");

const app = express();

// const dbUrl = "mongodb://localhost:27017/Store";
const dbUrl = process.env.ATLASDB_URL;

const server = http.createServer(app);
const io = socketIo(server);

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
app.use(cors());
app.use(bodyParser.json());

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
        maxAge: 90 * 24 * 60 * 60 * 1000,
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

passport.use("employee-local", new LocalStrategy(Employee.authenticate()));


passport.serializeUser((entity, done) => {
    if (entity instanceof User) {
        done(null, { id: entity.id, type: "User" });
    } else if (entity instanceof Restaurant) {
        done(null, { id: entity.id, type: "Restaurant" });
    } else if (entity instanceof Employee) {
        done(null, { id: entity.id, type: "Employee" });
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
        } else if (obj.type === "Employee") {
            const employee = await Employee.findById(obj.id);
            done(null, employee);
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
    res.locals.cartItems = req.cookies.order ? JSON.parse(req.cookies.order) : [];
    next();
});

app.get("/", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login"); // Render the login page if not authenticated
    }
    if (req.user instanceof User) {
        return res.redirect("/items"); // Redirect User
    } else if (req.user instanceof Restaurant) {
        return res.redirect(`/restaurant/${req.user.id}/show`); // Redirect Restaurant
    }
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
app.use("/employee", employeeRouter);

app.post("/login-user", passport.authenticate("user-local", {
    failureRedirect: "/login",
    failureFlash: true,
}), (req, res) => {
    res.redirect("/");
});

app.get("/api/getCurrentUser", (req, res) => {
    res.json(req.user || null);
});


app.post("/login-restaurant", passport.authenticate("restaurant-local", {
    failureRedirect: "/login",
    failureFlash: true,
}), (req, res) => {
    res.redirect("/");
});

app.post("/login", passport.authenticate("employee-local", {
    failureRedirect: "/employee/login",
    failureFlash: true,
}), (req, res) => {
    res.redirect("/employee/dashboard");
});



app.use((err, req, res, next) => {
    console.error(err); // Log the error for debugging
    const { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("items/err.ejs", { message });
});

app.listen(8080, () => {
    console.log("Server is listening on port 8080");
});

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
  
    // Handle new order event
    socket.on("newOrder", (orderData) => {
      console.log("New order received:", orderData);
      if (!orderData) {
        console.error("❌ No order data received!");
        return;
        }
      io.emit("orderUpdate", orderData); // Send update to restaurant and delivery boy
  
      // Send Firebase Notification
      sendPushNotification(orderData);
    });
  
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
  
  // Start Server
  const PORT = 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  
  // Function to send Firebase Push Notifications
  async function sendPushNotification(orderData) {
    console.log("FCM Token:", orderData.restaurantToken);

    if (!orderData.restaurantToken) {
        console.error("❌ Error: No FCM token provided!");
        return;
    }
    const message = {
      notification: {
        title: "New Order Received!",
        body: `Order #${orderData.id} from ${orderData.user}`,
      },
      token: orderData.restaurantToken, // Get FCM token from DB
    };
  
    try {
      await admin.messaging().send(message);
      console.log("Push notification sent successfully!");
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }
  app.post("/restaurant/subscribe", async (req, res) => {
    const { restaurantId, subscription } = req.body;

    try {
        await Restaurant.findByIdAndUpdate(restaurantId, { pushSubscription: subscription });
        res.status(201).json({ message: "Restaurant subscribed successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error subscribing restaurant", error });
    }
});

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});
