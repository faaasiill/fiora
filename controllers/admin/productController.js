const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

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

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (!productExists) {
      const images = [];

      for (let i = 1; i <= 4; i++) {
        const fieldName = `productImage${i}`;
        if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          images.push(file.filename);
        }
      }

      if (images.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one image is required." });
      }

      const categoryId = products.category;

      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        category: categoryId,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdOn: new Date(),
        color: products.color,
        productImage: images,
        status: "Available",
      });

      await newProduct.save();
      res.redirect("/admin/addProducts");
    } else {
      res
        .status(400)
        .json({
          message: "Product already exists, please try with another name.",
        });
    }
  } catch (error) {
    console.error("Error adding product:", error);
    res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {

    try {

        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*"+search+".*","i")}},
            ],
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec();

        const count = await Product.find({
            $or: [
                {productName:{$regex: new RegExp(".*"+search+".*","i")}}
            ],
        }).countDocuments();


        const category = await Category.find({isListed: true});

        if(category){
            res.render('products', {
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category
        })
    } else {
        res.render("page-404");
    }


    } catch (error) {

        res.redirect("/pageerror");
        
    }
    
}

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
};
