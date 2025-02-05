const User = require('../models/userSchema');



const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
        .then(data => {
            if (data && !data.isBlocked) {
                next();
            } else {
                res.redirect("/login");
            }

        })
        .catch(err => {
            console.log("Error in userAuth Middileware",err);
            res.status(500).send("internal Server Error");
        })
    } else {
        res.redirect("/login");
    }
}


const adminAuth = (req, res, next) => {
    User.findOne({isAdmin: true})
    .then(data => {
        if(data) {
            next();
        } else {
            res.redirect("/admin/login")
        }
    })
    .catch(error => {
        console.log("Error in Admin auth middleware", error);
        res.status(500).send("Internel Server Error");
    })
}

module.exports = {
    userAuth,
    adminAuth
}