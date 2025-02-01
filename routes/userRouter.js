const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/usercontroller");
const passport = require("passport");


router.get("/", userController.loadHomepage);
router.get("/pageNotFound", userController.pageNotFound);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get("/auth/google/", passport.authenticate('google', { scope:['profile', 'email']}));
router.get("/auth/google/callback", passport.authenticate('google', { failureRedirect: '/signup' }),(req, res) => {
    res.redirect('/profile');

});

// Facebook Routes
router.get("/auth/facebook", passport.authenticate('facebook', { scope: ['email'] }));
router.get("/auth/facebook/callback", passport.authenticate('facebook', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect("/");
});

router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);

module.exports = router;
