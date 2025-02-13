const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config(); // Load environment variables


// Configure storage on Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "product-images", // Cloudinary folder name
    allowed_formats: ["jpg", "jpeg", "png"], // Allowed file types
  },
});


// Multer upload setup
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = upload;
