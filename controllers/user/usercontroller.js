const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Wallet = require("../../models/walletSchema");
const Banner = require("../../models/BannerSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");


const handleReferral = async (req, res) => {
  try {
    const { code } = req.query;
    if (code) {
      // Store referral code in session
      req.session.referralCode = code;
      
      // Also store in a global variable for OAuth flows
      global.pendingReferral = { code: code, timestamp: Date.now() };
      
      // Set a timeout to clear the referral after 1 hour (optional)
      setTimeout(() => {
        if (global.pendingReferral && global.pendingReferral.timestamp === Date.now()) {
          delete global.pendingReferral;
        }
      }, 3600000); // 1 hour
    }
    res.redirect("/signup");
  } catch (error) {
    console.error("Referral handling error:", error);
    res.redirect("/pageNotFound");
  }
};


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
    // Store referral code if exists
    if (req.session.referralCode) {
      req.session.userData.referredBy = req.session.referralCode;
    }

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

    if (otp === req.session.userOtp) {
      const userData = req.session.userData;
      const passwordHash = await securePassword(userData.password);

      const newUser = new User({
        name: userData.name,
        phone: userData.phone,
        email: userData.email,
        password: passwordHash,
        referredBy: userData.referredBy || null
      });

      await newUser.save();
      req.session.user = newUser._id;

      // Handle referral bonus
      const referralBonus = parseInt(process.env.REFERRAL_BONUS_AMOUNT) || 10;

      // Create wallet for new user
      const newUserWallet = new Wallet({
        userId: newUser._id,
        balance: 0
      });
      await newUserWallet.save();

      if (newUser.referredBy) {
        const referrer = await User.findById(newUser.referredBy);
        if (referrer && !referrer.redeemed) {
          // Credit referrer
          let referrerWallet = await Wallet.findOne({ userId: referrer._id });
          if (!referrerWallet) {
            referrerWallet = new Wallet({ userId: referrer._id, balance: 0 });
            await referrerWallet.save(); // Save the new wallet if it doesn't exist
          }

          // Add transaction for referrer
          await Wallet.addTransaction(referrer._id, {
            amount: referralBonus,
            type: "credit",
            status: "completed",
            source: "referral_bonus",
            description: `Referral bonus for inviting ${newUser.email}`
          });

          // Credit new user
          await Wallet.addTransaction(newUser._id, {
            amount: referralBonus,
            type: "credit",
            status: "completed",
            source: "referral_bonus",
            description: "Referral signup bonus"
          });

          // Update referrer's redeemed status and add new user to redeemedUsers
          referrer.redeemed = true;
          referrer.redeemedUsers.push(newUser._id);
          await referrer.save();
        }
      }

      // Clear session referral data
      delete req.session.referralCode;
      delete req.session.userData;
      delete req.session.userOtp;

      res.json({ success: true, redirect: "/" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
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

const getAboutUs = async (req, res) => {
  try {

    res.render("aboutUs");
    
  } catch (error) {
    res.redirect("/pageNotFound")
    console.error("getAboutUs error", error);
  }
  
}

const getContactUs = async (req, res) => {
  try {

    res.render("contactUs");
    
  } catch (error) {
    res.redirect("/pageNotFound")
    console.error("getAboutUs error", error);
  }
  
}

const postContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    // Create a transporter object using environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
      }
    });
    
    // Setup email data
    const mailOptions = {
      from: `Your Website <${process.env.NODEMAILER_EMAIL}>`,
      to: process.env.NODEMAILER_EMAIL, // Sending to yourself
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    };
    
    // Send mail
    await transporter.sendMail(mailOptions);
    
    // Return success
    res.render('contactUs', { 
      success: 'Thank you for your message. We will get back to you soon!' 
    });
    
  } catch (error) {
    console.error("postContactForm error", error);
    res.render('contactUs', { 
      error: 'Sorry, there was an error sending your message. Please try again later.' 
    });
  }
};

const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    const categories = await Category.find({ isListed: true });

    const products = await Product.find({
      $and: [
        {
          $or: [
            { productName: { $regex: new RegExp(q, 'i') } }, // Improved regex for partial matches
            { description: { $regex: new RegExp(q, 'i') } }
          ]
        },
        { isBlocked: false },
        { category: { $in: categories.map(cat => cat._id) } },
        { quantity: { $gt: 0 } }
      ]
    })
    .limit(10)
    .lean();

    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
  handleReferral,
  getAboutUs,
  getContactUs,
  postContactForm,
  searchProducts
};
