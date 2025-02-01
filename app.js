const express = require("express");
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const db = require("./config/db");
const userRoutes = require("./routes/userRouter");
const passport = require("./config/passport");
const adminRouter = require("./routes/adminRouter");

// Connect to the database
db();

const app = express();



// Middleware to handle JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // ✅ Prevents saving empty sessions
    cookie: {
        secure: false, // Use `true` only with HTTPS
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));


app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
    res.set('cache-control', 'no-store')
    next();
});

// Set up view engine and views directory
app.set('view engine', 'ejs');
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);
app.use(express.static(path.join(__dirname, "public")));



// Use the router after setting up middleware
app.use("/", userRoutes);
app.use("/admin", adminRouter);


app.listen(process.env.PORT || 3002, () => {
    console.log(`Server running at http://localhost:${process.env.PORT || 3002} \n http://localhost:${process.env.PORT || 3002}/admin/login`);
});
