const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isBlocked) {
          next();
        } else {
          res.redirect("/login");
        }
      })
      .catch((err) => {
        console.log("Error in userAuth Middileware", err);
        res.status(500).send("internal Server Error");
      });
  } else {
    res.redirect("/login");
  }
};

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
