const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Banner = require("../../models/BannerSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

// for load signup page.
const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("home page not found", error);
    res.status(500).send("server Error");
  }
};

// for load home page
const loadHomepage = async (req, res) => {
  try {
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
      page: "home",
    });
    let userData = null;
    const categories = await Category.find({ isListed: true });

    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .limit(7)
      .lean();

    const isLogin = req.session.user;

    if (req.session.user) {
      const userId = new mongoose.Types.ObjectId(req.session.user);
      userData = await User.findById(userId).lean();

      if (userData) {
        return res.render("home", {
          user: userData,
          products: productData,
          banner: findBanner || "",
        });
      } else {
        console.log("User not found in database!");
        req.session.user = null;
      }
    }

    // Default render
    return res.render("home", {
      products: productData,
      isLogin,
      banner: findBanner || "",
    });
  } catch (error) {
    console.log("Error rendering home page:", error.message);
    res.status(500).send("Server Error");
  }
};

// for page error
const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("pageNotFound");
  }
};

// for genarate otp
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// for send Verification to Email
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your email",
      text: `your OTP is ${otp}`,
      html: `<b>your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending Email", error);
    return false;
  }
}

// for signup
const signup = async (req, res) => {
  try {
    const { name, phone, email, password, confirmPassword } = req.body;
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", { message: "Email already exists" });
    }

    const otp = generateOtp();

    const emailSend = await sendVerificationEmail(email, otp);

    if (!emailSend) {
      return res.json("email-error");
    }
    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };

    res.render("verify-otp");
    console.log("OTP send", otp);
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pageNotFound");
  }
};

// for secure password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    return passwordHash;
  } catch (error) {
    console.error("Error hashing password", error);
  }
};

// for verify otp
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        phone: user.phone,
        email: user.email,
        password: passwordHash,
      });

      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({ success: true, redirect: "/" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP, please try again" });
    }
  } catch (error) {
    console.log("error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occcured" });
  }
};

//  for resend otp
const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSend = await sendVerificationEmail(email, otp);
    if (emailSend) {
      console.log("Resend OTP:", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP resent successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internel Server Error Please try again",
    });
  }
};

// for load login
const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

//  for login registrations
const login = async (req, res) => {
  try {
    console.log("Login request received:", req.body);
    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render("login", { message: "User Not Found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "Your account is blocked" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("login", { message: "Invalid Password" });
    }

    req.session.user = findUser._id;

    return res.redirect("/");
  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed. Please try again later" });
  }
};

// for user logout
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("session distruction error", err);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("logout error", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  loadHomepage,
  loadSignup,
  pageNotFound,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
};
