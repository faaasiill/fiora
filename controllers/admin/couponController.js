const Coupon = require("../../models/couponSchema");

// Load coupon management page
const loadCoupon = async (req, res) => {
  try {
    const findCoupons = await Coupon.find({});
    return res.render("coupon", { coupons: findCoupons });
  } catch (error) {
    console.error("Error loading coupons:", error);
    return res.redirect("/pageerror");
  }
};

// Create new coupon
const createCoupon = async (req, res) => {
  try {
    // Get the current date if createdOn is not provided or invalid
    let createdDate;
    if (!req.body.createdOn || req.body.createdOn.trim() === "") {
      createdDate = new Date();
    } else {
      createdDate = new Date(req.body.createdOn);
      // Add time component to ensure valid date
      if (isNaN(createdDate.getTime())) {
        createdDate = new Date();
      }
    }

    // Validate expiry date
    const expireDate = new Date(req.body.expireOn);
    if (isNaN(expireDate.getTime())) {
      throw new Error("Invalid expire date");
    }

    // Parse numbers with parseFloat to avoid NaN errors
    const offerPrice = parseFloat(req.body.offerPrice);
    const minimumPrice = parseFloat(req.body.minimumPrice);


    const existingCoupon = await Coupon.findOne({ name: req.body.name });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "A coupon with this name already exists"
      });
    }

    // Validate other required fields
    if (isNaN(offerPrice)) {
      throw new Error("Invalid offer price");
    }

    if (isNaN(minimumPrice)) {
      throw new Error("Invalid minimum price");
    }

    if (!req.body.name) {
      throw new Error("Coupon name is required");
    }

    const newCoupon = new Coupon({
      name: req.body.name,
      createdOn: createdDate,
      expireOn: expireDate,
      offerPrice: offerPrice,
      minimumPrice: minimumPrice,
      isList: req.body.isList === "on" ? true : false,
    });

    await newCoupon.save();

    // Check if this is an AJAX request
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.status(200).json({
        success: true,
        message: "Coupon created successfully",
        coupon: newCoupon,
      });
    }

    return res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error creating coupon:", error);
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.status(400).json({ 
        success: false, 
        message: error.message || "Failed to create coupon" 
      });
    }
    return res.redirect("/pageerror");
  }
};

// Get a specific coupon by ID
const getCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    return res.status(200).json(coupon);
  } catch (error) {
    console.error("Error getting coupon:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update an existing coupon
const updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    // Check if another coupon with the same name exists (excluding current coupon)
    const existingCoupon = await Coupon.findOne({ 
      name: req.body.name,
      _id: { $ne: couponId } 
    });
    
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Another coupon with this name already exists"
      });
    }

    const data = {
      name: req.body.name,
      expireOn: new Date(req.body.expireOn + "T00:00:00"),
      offerPrice: parseInt(req.body.offerPrice),
      minimumPrice: parseInt(req.body.minimumPrice),
      isList: req.body.isList === "on" ? true : false,
    };

    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, data, {
      new: true,
    });

    if (!updatedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    return res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error updating coupon:", error);
    return res.redirect("/pageerror");
  }
};

// Delete a coupon
const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

    if (!deletedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    return res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Improved controller method for toggling coupon status
const toggleCouponStatus = async (req, res) => {
  try {
    const couponId = req.params.id;
    const isList = req.body.isList === true;

    console.log(
      "Toggle request for coupon:",
      couponId,
      "Set active to:",
      isList
    );

    // Find the coupon first to verify it exists
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      console.log("Coupon not found:", couponId);
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    // Check if the coupon is expired
    const now = new Date();
    const expireDate = new Date(coupon.expireOn);

    if (now > expireDate) {
      console.log("Cannot toggle expired coupon:", couponId);
      return res.status(400).json({
        success: false,
        message: "Cannot change status of expired coupons",
      });
    }

    // Update the coupon status
    coupon.isList = isList;
    await coupon.save();

    console.log(
      "Coupon updated successfully:",
      couponId,
      "New status:",
      isList
    );

    return res.status(200).json({
      success: true,
      message: `Coupon ${isList ? "activated" : "deactivated"} successfully`,
      coupon: coupon,
    });
  } catch (error) {
    console.error("Error toggling coupon status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  loadCoupon,
  createCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
};
