// Cloudinary storage configuration
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// Configure storage on Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "banner-images", // Separate folder for banner images
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// Multer upload setup
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = upload;
