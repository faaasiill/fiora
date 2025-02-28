const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/usercontroller");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const wishlistController = require("../controllers/user/wishlistController");
const cartController = require("../controllers/user/cartController");
const checkOutController = require("../controllers/user/checkOutController");
const userCouponController = require("../controllers/user/userCouponController");
const {userAuth} = require("../middlewares/auth");
const upload = require("../middlewares/multerConfig");
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
// user management
router.get("/userProfile", userAuth, profileController.userProfile);
router.post("/changeUserDetails", userAuth, profileController.changeUserDetails);
router.post("/changePassOtp", userAuth, profileController.changePassOtp);
router.post("/verifyChangePassOtp", userAuth, profileController.verifyChangePassOtp);
router.post("/changePassword", userAuth, profileController.changePassword);
router.post("/addOrEditAddress", userAuth, profileController.addOrEditAddress);
router.delete("/deleteAddress/:addressId", userAuth, profileController.deleteAddress);
router.post("/setDefaultAddress", userAuth, profileController.setDefaultAddress);
router.post("/orders/cancel", userAuth, profileController.cancelOrder);
router.post("/orders/return", userAuth, upload.array('proofImages', 3), profileController.returnOrder);
// wishlist management
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/addToWishlist", userAuth, wishlistController.addToWishlist);
router.get("/getWishlistedProducts", userAuth, wishlistController.getWishlistedProducts);
router.post("/removeFromWishlist", userAuth, wishlistController.removeFromWishlist);  
// cart management
router.get("/cart", userAuth, cartController.loadCart);
router.post("/addToCart", userAuth, cartController.addToCart);
router.put("/updateCartQuantity", userAuth, cartController.updateCartQuantity);
router.delete("/removeFromCart", userAuth, cartController.removeFromCart);
// checkOut management
router.get("/checkout", userAuth, checkOutController.loadCheckOut);
router.post("/place-order", userAuth, checkOutController.placeOrder);
router.get("/order-confirmation/:orderId", userAuth, checkOutController.orderConfirmation);
// Razorpay routes
router.post('/create-razorpay-order', checkOutController.createRazorpayOrder);
router.post('/verify-razorpay-payment', checkOutController.verifyRazorpayPayment);
// coupon management
router.get('/getActiveCoupons', userAuth, userCouponController.getActiveCoupons);
router.post('/applyCoupon', userAuth, userCouponController.applyCoupon);
router.post('/removeCoupon', userAuth, userCouponController.removeCoupon);


module.exports = router;
