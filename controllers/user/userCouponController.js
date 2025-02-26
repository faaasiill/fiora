// controllers/couponController.js
const Coupon = require("../../models/couponSchema");
const Cart = require("../../models/cartSchema");

// Get all active coupons
const getActiveCoupons = async (req, res) => {
  try {
    const currentDate = new Date();
    const coupons = await Coupon.find({
      isList: true,
      expireOn: { $gt: currentDate }
    });
    
    return res.status(200).json({
      status: true,
      coupons
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch coupons"
    });
  }
};

// Apply coupon to cart
const applyCoupon = async (req, res) => {
  try {
    const { couponName, subtotal } = req.body;
    const userId = req.session.user;

    if (!couponName) {
      return res.status(400).json({
        status: false,
        message: "Coupon name is required"
      });
    }

    // Find the coupon
    const currentDate = new Date();
    const coupon = await Coupon.findOne({
      name: couponName,
      isList: true,
      expireOn: { $gt: currentDate }
    });

    if (!coupon) {
      return res.status(404).json({
        status: false,
        message: "Invalid coupon or coupon expired"
      });
    }

    // Check if user already used this coupon
    if (coupon.userId && coupon.userId.includes(userId)) {
      return res.status(400).json({
        status: false,
        message: "You have already used this coupon"
      });
    }

    // Check minimum purchase amount
    if (subtotal < coupon.minimumPrice) {
      return res.status(400).json({
        status: false,
        message: `Minimum purchase of ₹${coupon.minimumPrice.toFixed(2)} required to use this coupon`
      });
    }

    // Calculate discount amount
    const discountAmount = coupon.offerPrice;

    // Update the cart with coupon info
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        status: false,
        message: "Cart not found"
      });
    }

    cart.coupon = {
      couponId: coupon._id,
      name: coupon.name,
      discount: discountAmount
    };

    // Recalculate cart totals with coupon
    const cartTotal = cart.calculateTotals();
    await cart.save();

    return res.status(200).json({
      status: true,
      cartTotal,
      message: "Coupon applied successfully"
    });
  } catch (error) {
    console.error("Apply coupon error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to apply coupon"
    });
  }
};

// Remove coupon from cart
const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        status: false,
        message: "Cart not found"
      });
    }

    // Set coupon to null before recalculating totals
    cart.coupon = null;
    
    // Ensure all totals are valid numbers before saving
    const cartTotal = cart.calculateTotals();
    
    // Add validation to prevent NaN values
    if (isNaN(cartTotal.final)) {
      return res.status(400).json({
        status: false,
        message: "Error calculating cart total"
      });
    }
    
    await cart.save();

    return res.status(200).json({
      status: true,
      cartTotal,
      message: "Coupon removed successfully"
    });
  } catch (error) {
    console.error("Remove coupon error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to remove coupon: " + error.message
    });
  }
};

module.exports = {
  getActiveCoupons,
  applyCoupon,
  removeCoupon
};