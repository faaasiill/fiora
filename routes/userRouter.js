const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/usercontroller");


router.get("/pageNotFound", userController.pageNotFound);
router.get("/", userController.loadHomepage);



module.exports = router;
