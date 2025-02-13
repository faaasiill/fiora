const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Banner = require("../../models/BannerSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const loadProduct = async (req, res) => {
  try {
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
      page: "product",
    });

    let userData = null;
    const categories = await Category.find({ isListed: true });

    let productData = await Product.find({
      isBlocked: false, 
      category: { $in: categories.map(category => category._id) }, 
      quantity: { $gt: 0 }
    })
    .sort({ createdAt: -1 })
    .lean();

    const isLogin = req.session.user;

    if (req.session.user) {
      const userId = new mongoose.Types.ObjectId(req.session.user);
      userData = await User.findById(userId).lean();

      if (userData) {
        return res.render("bags", { user: userData, products: productData , banner:findBanner || ""});
      } else {
        console.log("User not found in database!");
        req.session.user = null;
      }
    }
    return res.render("bags", { products: productData, isLogin , banner:findBanner || ""});

  } catch (error) {
    console.log("Error rendering products page:", error.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  loadProduct,
};
