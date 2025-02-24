const User = require("../models/userSchema");

// middileware for user authentication
const userAuth = (req, res, next) => {
  if (!req.session.user) {
    // Check if it's an AJAX request
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.status(401).json({
        status: false,
        notLoggedIn: true,
        message: "Please login to continue",
      });
    }
    return res.redirect("/login");
  }

  User.findById(req.session.user)
    .then((data) => {
      if (data && !data.isBlocked) {
        next();
      } else {
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
          return res.status(403).json({
            status: false,
            blocked: true,
            message: "Your account is blocked",
          });
        }
        return res.redirect("/login");
      }
    })
    .catch((err) => {
      console.log("Error in userAuth Middleware", err);
      res.status(500).send("Internal Server Error");
    });
};

// middileware for admin authentication
const adminAuth = (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/login");
  }

  User.findById(req.session.admin)
    .then((admin) => {
      if (admin && admin.isAdmin) {
        next();
      } else {
        res.redirect("/login");
      }
    })
    .catch((err) => {
      console.log("Error in adminAuth Middleware:", err);
      res.status(500).send("Internal Server Error");
    });
};

module.exports = {
  userAuth,
  adminAuth,
};
