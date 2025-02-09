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
        quantity: products.quantity,
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


const addProductOffer = async (req, res) => {

    try {

        const {productId, percentage} = req.body;
        const findProduct = await Product.findOne({_id:productId});
        const findCategory = await Category.findOne({_id:findProduct.category});
        if(findCategory.categoryOffer>percentage){
            return res.json({status: false, message: "Offer percentage is higher than category offer"});
        }

        findProduct.salePrice = findProduct.salePrice-Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer=0;
        await findCategory.save();
        res.json({status: true});
        

    } catch (error) {

        res.redirect("/pageerror");
        res.status(500).json({status:false, message: "Internal Server Error"});
    }
    
}

const removeProductOffer = async (req, res) => {

    try {

        const {productId} = req.body;
        const findProduct = await Product.findOne({_id:productId});
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({status:true});
        
    } catch (error) {
        res.redirect("/pageerror");
        
    }
    
}


const blockProduct = async (req, res) => {
    try {

        let id = req.query.id;
        console.log(id);
        await Product.updateOne({_id: id}, {$set:{isBlocked:true}});
        res.redirect("/admin/products");
        
    } catch (error) {
        console.log("issue while blocking", error);
        res.redirect("/pageerror");
        
    }
}


const unblockProduct = async (req, res) => {
    try {

        const id = req.query.id;
        await Product.updateOne({_id: id}, {$set:{isBlocked:false}});
        res.redirect("/admin/products");
        
    } catch (error) {
        console.log("issue while unblocking");
        res.redirect("/pageerror");
        
    }
}


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
      console.error('Error in getEditProduct:', error);
      res.redirect("/pageerror");
  }
};

function ensureUploadDirectory() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'product-images');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}


const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const uploadDir = ensureUploadDirectory();

    const category = await Category.findOne({ name: data.category }); // Assuming you have a Category model
    if (!category) {
      return res.status(400).json({ error: "Invalid category" });
    }


    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id }
    });
    
    if (existingProduct) {
      return res.status(400).json({
        error: "Product name already exists, please choose another name"
      });
    }

    // Handle new image uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Since we're using disk storage, the file is already saved
        // We just need to store the filename
        images.push(file.filename);
      }
    }


        

    const updateFields = {
      productName: data.productName,
      description: data.descriptionData,
      category: category._id,  // Use the category ID instead of name
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color,
    };

    if (images.length > 0) {
      updateFields.$push = { productImage: { $each: images } };
    }

    await Product.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.redirect("/admin/products");
  } catch (error) {
    console.error('Error in editProduct:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;

    if (!imageNameToServer || !productIdToServer) {
      return res.status(400).json({
        status: false,
        message: 'Image name and product ID are required'
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
        message: 'Product not found'
      });
    }

    // Delete physical file from the correct directory
    const imagePath = path.join(process.cwd(), 'public', 'uploads', 'product-images', imageNameToServer);
    
    try {
      await fs.promises.access(imagePath);
      await fs.promises.unlink(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } catch (err) {
      console.log(`Image file ${imageNameToServer} not found in filesystem`);
    }

    res.json({
      status: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteSingleImage:', error);
    res.status(500).json({
      status: false,
      message: 'Error deleting image',
      error: error.message
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
  deleteSingleImage
};
