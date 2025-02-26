const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const cloudinary = require("../../config/cloudinaryConfig");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// for get Product AddPage
const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    res.render("product-add", {
      cat: category,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

// for post Product AddPage
const addProducts = async (req, res) => {
  try {
      const products = req.body;

      const productExists = await Product.findOne({
          productName: products.productName,
      });

      if (productExists) {
          return res.status(400).json({
              message: "Product already exists, please try with another name.",
          });
      }

      const images = [];

      for (let i = 1; i <= 4; i++) {
          const fieldName = `productImage${i}`;
          if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
              const file = req.files[fieldName][0];
              images.push(file.path);
          }
      }

      if (images.length === 0) {
          return res
              .status(400)
              .json({ message: "At least one image is required." });
      }

      // Determine status based on quantity
      const status = parseInt(products.quantity) <= 0 ? "Out of Stock" : "Available";

      const newProduct = new Product({
          productName: products.productName,
          description: products.description,
          category: products.category,
          regularPrice: products.regularPrice,
          salePrice: products.salePrice,
          createdOn: new Date(),
          color: products.color,
          quantity: products.quantity,
          productImage: images,
          status: status, // Set the determined status
      });

      await newProduct.save();

      console.log("Product added successfully:", newProduct);
      res.redirect("/admin/addProducts");
  } catch (error) {
      console.error("Error adding product:", error);
      res.redirect("/admin/pageerror");
  }
};

// for get All Products
const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;
    const limit = 4;

    // Run all queries in parallel
    const [productData, count, category] = await Promise.all([
      Product.find({
        productName: { $regex: new RegExp(".*" + search + ".*", "i") },
      })
        .sort({ _id: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("category")
        .exec(),

      Product.countDocuments({
        productName: { $regex: new RegExp(".*" + search + ".*", "i") },
      }),

      Category.find({ isListed: true }),
    ]);

    if (category.length > 0) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/pageerror");
  }
};

// for add Product Offer
const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });
    if (findCategory.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "Offer percentage is higher than category offer",
      });
    }

    findProduct.salePrice =
      findProduct.salePrice -
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();
    res.json({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// for remove Product Offer
const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const percentage = findProduct.productOffer;
    findProduct.salePrice =
      findProduct.salePrice +
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = 0;
    await findProduct.save();
    res.json({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

// for bloack proucts
const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    console.log(id);
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    console.log("issue while blocking", error);
    res.redirect("/pageerror");
  }
};

// for unblock Products
const unblockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    console.log("issue while unblocking");
    res.redirect("/pageerror");
  }
};

// for get edit product
const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findById(id);
    if (!product) {
      return res.redirect("/admin/products");
    }
    const category = await Category.find({});
    res.render("edit-product", {
      product: product,
      cat: category,
    });
  } catch (error) {
    console.error("Error in getEditProduct:", error);
    res.redirect("/pageerror");
  }
};

// for edit product
const editProduct = async (req, res) => {
  try {
      const id = req.params.id;
      const data = req.body;

      const category = await Category.findOne({ name: data.category });
      if (!category) {
          return res.status(400).json({ error: "Invalid category" });
      }

      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ error: "Product not found" });
      }

      const existingProduct = await Product.findOne({
          productName: data.productName,
          _id: { $ne: id },
      });

      if (existingProduct) {
          return res.status(400).json({
              error: "Product name already exists, please choose another name",
          });
      }

      const images = [];
      if (req.files && req.files.length > 0) {
          for (const file of req.files) {
              images.push(file.path);
          }
      }

      // Determine status based on quantity
      const status = parseInt(data.quantity) <= 0 ? "Out of Stock" : "Available";

      const updateFields = {
          productName: data.productName,
          description: data.descriptionData,
          category: category._id,
          regularPrice: data.regularPrice,
          salePrice: data.salePrice,
          quantity: data.quantity,
          color: data.color,
          status: status, // Set the determined status
      };

      if (images.length > 0) {
          updateFields.$push = { productImage: { $each: images } };
      }

      await Product.findByIdAndUpdate(id, updateFields, {
          new: true,
          runValidators: true,
      });

      res.redirect("/admin/products");
  } catch (error) {
      console.error("Error in editProduct:", error);
      res.status(500).json({ error: error.message });
  }
};

// for delete Single Image
const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;

    if (!imageNameToServer || !productIdToServer) {
      return res.status(400).json({
        status: false,
        message: "Image URL and product ID are required",
      });
    }

    const product = await Product.findByIdAndUpdate(
      productIdToServer,
      { $pull: { productImage: imageNameToServer } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        status: false,
        message: "Product not found",
      });
    }

    const publicId = imageNameToServer.split("/").pop().split(".")[0];
    const folder = "product-images";
    const cloudinaryImageId = `${folder}/${publicId}`;

    // Delete the image from Cloudinary
    cloudinary.uploader.destroy(cloudinaryImageId, (error, result) => {
      if (error) {
        console.error("Error deleting image from Cloudinary:", error);
        return res.status(500).json({
          status: false,
          message: "Failed to delete image from Cloudinary",
          error: error.message,
        });
      }

      console.log(`Image deleted from Cloudinary: ${cloudinaryImageId}`);

      res.json({
        status: true,
        message: "Image deleted successfully",
      });
    });
  } catch (error) {
    console.error("Error in deleteSingleImage:", error);
    res.status(500).json({
      status: false,
      message: "Error deleting image",
      error: error.message,
    });
  }
};

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
};
