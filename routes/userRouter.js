const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/usercontroller");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const passport = require("passport");

router.get("/", userController.loadHomepage);
router.get("/pageNotFound", userController.pageNotFound);
//signup management 
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
//google Routes
router.get(
  "/auth/google/",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    res.redirect("/");
  }
);

// Facebook Routes
router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/signup" }),
  (req, res) => {
    res.redirect("/");
  }
);

router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);
//Profile Management
router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resent-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);
// product management
router.get("/products", productController.loadProduct);
router.get("/api/products/load-more", productController.loadProduct);
router.get('/api/products', productController.getProducts);
router.get("/productDetails", productController.loadProductDetails);


module.exports = router;
