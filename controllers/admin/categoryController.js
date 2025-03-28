const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

// for category data info
const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    let filter = {};

    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: "i" };
    }

    const category = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: category,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
      searchQuery: searchQuery,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

// for add Category
const addCategory = async (req, res) => {
  const { name, description, offerPrice } = req.body;

  try {
    // Case-insensitive check using regex
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res.json({ success: false, message: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      description,
      categoryOffer: offerPrice,
    });

    await newCategory.save();
    return res.json({ success: true, message: "Category added successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to add category" });
  }
};

// for add category offer
const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: category._id });
    const hasProductOffer = products.some(
      (product) => product.productOffer > percentage
    );

    if (hasProductOffer) {
      return res.status(400).json({
        status: false,
        message: "Products Within This Category Already Have Offers",
      });
    }

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: percentage } }
    );

    // Apply category offer to all products in this category
    for (const product of products) {
      product.productOffer = 0;

      // Calculate the discounted price based on category offer
      const discountAmount = Math.floor(
        product.regularPrice * (percentage / 100)
      );
      product.salePrice = product.regularPrice - discountAmount;

      await product.save();
    }

    res.json({ status: true });
  } catch (error) {
    console.error("Error in addCategoryOffer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};
// for remove category
const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: category._id });

    if (products.length > 0) {
      for (const product of products) {
        // Reset sale price to regular price
        product.salePrice = product.regularPrice;
        product.productOffer = 0;
        await product.save();
      }
    }

    category.categoryOffer = 0;
    await category.save();

    res.json({ status: true });
  } catch (error) {
    console.error("Error in removeCategoryOffer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// for get Listed Category
const getListCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    await Product.updateMany({ category: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("pageerror");
  }
};

// for get unListed Category
const getUnlistCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    await Product.updateMany({ category: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("pageerror");
  }
};

// for get edit category
const getEditCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const category = await Category.findOne({ _id: id });
    res.render("edit-category", { category: category });
    console.log(category);
  } catch (error) {
    res.redirect("/pageerror");
  }
};

// for edit category
const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;
    const existingCategory = await Category.findOne({ name: categoryName });

    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "Category already exists, please choose another name" });
    }

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: categoryName,
        description: description,
      },
      { new: true }
    );

    if (updateCategory) {
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  getListCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory,
};
