const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Banner = require("../../models/BannerSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

// for load products page
const loadProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 16;
    const skip = (page - 1) * limit;

    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
      page: "product",
    });

    // Get active categories
    const categories = await Category.find({ isListed: true });

    // Base query conditions for products
    const baseProductQuery = {
      isBlocked: { $ne: true },
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    };

    // Add pagination to product query
    let productData = await Product.find(baseProductQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination using the same base query
    const totalProducts = await Product.countDocuments(baseProductQuery);

    const isLogin = req.session.user;

    // If it's an AJAX request for loading more products
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.json({
        products: productData,
        hasMore: totalProducts > skip + productData.length,
      });
    }

    // For initial page load with user session
    if (req.session.user) {
      try {
        const userId = new mongoose.Types.ObjectId(req.session.user);
        const userData = await User.findById(userId).lean();

        if (userData) {
          return res.render("bags", {
            user: userData,
            products: productData,
            banner: findBanner || "",
            totalProducts,
            currentPage: page,
            cat: categories,
          });
        } else {
          console.log("User not found in database!");
          req.session.user = null;
        }
      } catch (userError) {
        console.log("Error fetching user data:", userError.message);
        req.session.user = null;
      }
    }

    // Default render for non-logged in users or if user session is invalid
    return res.render("bags", {
      products: productData,
      isLogin,
      banner: findBanner || "",
      totalProducts,
      currentPage: page,
      cat: categories,
    });
  } catch (error) {
    console.log("Error rendering products page:", error.message);
    res.status(500).send("Server Error");
  }
};

// for get products
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 16;
    const sort = req.query.sort || "default";
    const category = req.query.category || "all";
    const search = req.query.search || "";

    // Get active categories
    const categories = await Category.find({ isListed: true });

    // Build base query with blocking condition
    const query = {
      isBlocked: { $ne: true },
      quantity: { $gt: 0 },
    };

    // Add category filter
    if (category !== "all") {
      query.category = category;
    } else {
      // If no specific category selected, only show products from listed categories
      query.category = { $in: categories.map((cat) => cat._id) };
    }

    // Add search filter
    if (search) {
      query.$and = [
        {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case "low-to-high":
        sortOptions = { salePrice: 1 };
        break;
      case "high-to-low":
        sortOptions = { salePrice: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination using the same query
    const total = await Product.countDocuments(query);
    const hasMore = total > skip + products.length;

    res.json({
      products,
      hasMore,
      total,
      categories: categories,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// for loading product details
const loadProductDetails = async (req, res) => {
  try {
    const productId = req.query.id;

    const product = await Product.findOne({ _id: productId }).populate(
      "category",
      "name"
    );

    if (!product) {
      return res.status(404).render("404", { message: "Product not found" });
    }

    // Fetch related products with more relevant fields
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: productId },
    })
      .select("productName productImage salePrice regularPrice")
      .limit(4)
      .lean(); //for better performance with read-only data

    // Track view count
    await Product.findByIdAndUpdate(productId, {
      $inc: { viewCount: 1 },
    });

    // Check wishlist status
    let isInWishlist = false;
    if (req.session.userId) {
      const wishlist = await Wishlist.findOne({
        userId: req.session.userId,
        "products.productId": productId,
      });
      isInWishlist = !!wishlist;
    }

    // Calculate discount percentage for each product
    const calculateDiscount = (regular, sale) => {
      return Math.round(((regular - sale) / regular) * 100);
    };

    // Format related products data
    const formattedRelatedProducts = relatedProducts.map((prod) => ({
      ...prod,
      discount: calculateDiscount(prod.regularPrice, prod.salePrice),
    }));

    res.render("productDetails", {
      product,
      relatedProducts: formattedRelatedProducts,
      isInWishlist,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Error in loadProductDetails:", error);
    res.status(500).render("error", {
      message: "Error loading product details",
    });
  }
};

module.exports = {
  loadProduct,
  getProducts,
  loadProductDetails,
};
