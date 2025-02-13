const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const bannerController = require("../controllers/admin/bannerController");
const uploads = require("../middlewares/multerConfig");
const upload = require("../middlewares/bannerMulter");
const { adminAuth } = require("../middlewares/auth");


router.get("/pageerror", adminController.pageerror);

// login management
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);
//  customer management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);
// category management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory/:id", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);
// product management
router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts", adminAuth, uploads.fields([
    { name: 'productImage1', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
    { name: 'productImage4', maxCount: 1 }
]), productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct/:id", adminAuth, uploads.array("images",4), productController.editProduct);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);
// Banner Management
router.get("/banner", adminAuth, bannerController.getBannerPage);
router.get("/addBanner", adminAuth, bannerController.getAddBannerPage);
router.post("/banners/create", adminAuth, upload.single("bannerImage"), bannerController.postAddBanner);
router.get("/deleteBanner", adminAuth, bannerController.deleteBanner);



module.exports = router;
