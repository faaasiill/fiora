const express = require("express");
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const cookieParser = require('cookie-parser');
const db = require("./config/db");
const userRoutes = require("./routes/userRouter");
const { passport, sessionMiddleware } = require("./config/passport");
const adminRouter = require("./routes/adminRouter");
const walletRoutes = require('./routes/userRouter');


db();

const app = express();




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, 
    cookie: {
      secure: process.env.NODE_ENV === 'Production' ? true : false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000
    }
}));


app.use(passport.initialize());
app.use(passport.session());
app.use(sessionMiddleware);

app.use(cookieParser());

app.use((req, res, next) => {
    res.set('cache-control', 'no-store')
    next();
});


app.set('view engine', 'ejs');
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);
app.use(express.static(path.join(__dirname, "public")));




app.use("/", userRoutes);
app.use("/admin", adminRouter);
app.use('/wallet', walletRoutes);


app.listen(process.env.PORT || 3002, () => {
    console.log(`Server running at http://localhost:${process.env.PORT || 3002} \n http://localhost:${process.env.PORT || 3002}/admin/login`);
});
