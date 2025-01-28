const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const db = require("./config/db");
const userRoutes = require("./routes/userRouter");

// Middleware to handle JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up view engine and views directory
app.set('view engine', 'ejs');
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);
app.use(express.static(path.join(__dirname, "public")));


// Connect to the database
db();

// Use the router after setting up middleware
app.use("/", userRoutes);

app.listen(process.env.PORT || 3002, () => {
    console.log(`Server running at http://localhost:${process.env.PORT || 3002}`);
});
