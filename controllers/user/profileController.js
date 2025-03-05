const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const razorpayHelper = require("../../helpers/razorpayHelper");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const env = require("dotenv").config();
const session = require("express-session");
const { response } = require("express");


const generateReferralLink = (userId) => {
  const baseUrl = process.env.NODE_ENV === "development" 
    ? process.env.DEVELOPMENT_FRONTEND_URL 
    : process.env.PRODUCTION_FRONTEND_URL;
  return `${baseUrl}/referral?code=${userId}`;
};

// Function for genarate OTP
function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

// for sending OTP via email
const sendVerificationEmail = async (email, otp) => {
  try {
    console.log("Setting up email transport"); // Debug log

    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    await transporter.verify();

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP For Password Reset",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP is ${otp}</h4><br></b>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
};

// for password Hashing
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

// for get forgot password page
const getForgotPassPage = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// for get forgot password page
const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });

    if (!findUser) {
      return res.render("forgot-password", {
        message: "User With This Email Does Not Exist",
      });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      req.session.userOtp = otp;
      req.session.email = email;
      console.log("OTP:", otp);
      return res.render("forgotPass-otp");
    }

    return res.render("forgot-password", {
      message: "Email not sent, Please Try Again",
    });
  } catch (error) {
    console.error("Error in forgotEmailValid:", error);
    res.redirect("/pageNotFound");
  }
};

// for verify otp
const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "An error occurred, Please try again" });
  }
};

// for reset password page
const getResetPassPage = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// for reset password
const resendOtp = async (req, res) => {
  try {
    if (!req.session.email) {
      console.log("Email not found in session");
      return res.status(400).json({
        success: false,
        message: "Session expired. Please try again.",
      });
    }

    const email = req.session.email;
    const otp = generateOtp();

    console.log("Attempting to resend OTP to:", email);

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      req.session.userOtp = otp;
      console.log("New OTP saved:", otp);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });
    } else {
      console.log("Failed to send email");
      return res.status(500).json({
        success: false,
        message: "Failed to send email. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in resendOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Server error occurred",
    });
  }
};

// for posting new password
const postNewPassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    if (newPass1 === newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      res.redirect("/login");
    } else {
      res.render("reset-password", { message: "Passwords do not match" });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// for managing user profile
const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId: userId });
    const wallet = await Wallet.findOne({ userId: userId });

    const orders = await Order.find({ userId: userId })
      .populate("orderItems.product")
      .sort({ createdOn: -1 });

    const formattedOrders = orders.map((order) => {
      const formattedDate = new Date(order.createdOn).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return { ...order._doc, formattedDate };
    });

    const referralLink = generateReferralLink(userId);

    // Calculate referral earnings
    let referralEarnings = 0;
    if (wallet && wallet.transactions.length > 0) {
      referralEarnings = wallet.transactions
        .filter(
          (txn) => txn.source === "referral_bonus" && txn.status === "completed"
        )
        .reduce((sum, txn) => sum + txn.amount, 0);
    }

    res.render("userProfile", {
      user: userData,
      address: addressData,
      orders: formattedOrders,
      wallet: wallet || { transactions: [] },
      referralLink,
      referralEarnings, // Pass referral earnings to the view
    });
  } catch (error) {
    console.error("Error retrieving profile data", error);
    res.redirect("/pageNotFound");
  }
};

// for change user details
const changeUserDetails = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.session.user;

    const userExist = await User.findById(userId);
    if (!userExist) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser = await User.findOne({
      $or: [{ name }, { email }, { phone }],
      _id: { $ne: userId },
    });

    if (existingUser) {
      if (existingUser.name === name) {
        return res.status(400).json({ error: "User name already exists" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Email already exists" });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ error: "Phone number already exists" });
      }
    }

    await User.updateOne({ _id: userId }, { $set: { name, email, phone } });

    res.status(200).json({ success: "Profile updated successfully!" });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};

// for send change password otp
const changePassOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const userExist = await User.findOne({ email });

    if (userExist) {
      const otp = generateOtp();
      console.log(otp);
      const emailSent = await sendVerificationEmail(email, otp);

      if (emailSent) {
        req.session.userOtp = otp;
        req.session.userData = req.body;
        req.session.email = email;
        return res.status(200).json({ message: "OTP sent successfully" });
      } else {
        return res.status(500).json({ error: "Failed to send OTP" });
      }
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error in changePassOtp:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// for verify change password otp
const verifyChangePassOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp === req.session.userOtp) {
      // Clear the OTP from session after successful verification
      req.session.userOtp = null;
      return res.status(200).json({ message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error in verifyChangePassOtp:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// for change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in changePassword:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// for add or edit address
const addOrEditAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
      addressId,
    } = req.body;

    console.log("Received Data:", req.body);

    let userAddress = await Address.findOne({ userId });
    console.log("Existing User Address:", userAddress);

    if (addressId) {
      const updateResult = await Address.findOneAndUpdate(
        {
          userId,
          "address._id": addressId,
        },
        {
          $set: {
            "address.$.addressType": addressType,
            "address.$.name": name,
            "address.$.city": city,
            "address.$.landMark": landMark,
            "address.$.state": state,
            "address.$.pincode": pincode,
            "address.$.phone": phone,
            "address.$.altPhone": altPhone,
          },
        },
        { new: true }
      );

      if (!updateResult) {
        return res.status(404).json({ error: "Address not found" });
      }
    } else {
      // Add new address
      if (!userAddress) {
        userAddress = new Address({ userId, address: [] });
      }

      userAddress.address.push({
        addressType,
        name,
        city,
        landMark,
        state,
        pincode,
        phone,
        altPhone,
      });

      const pushResult = await userAddress.save();
      console.log("Push New Address Result:", pushResult);
    }

    res
      .status(200)
      .json({ status: true, message: "Address saved successfully" });
  } catch (error) {
    console.error("Error adding/editing address:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

// for delete Address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressId = req.params.addressId;

    await Address.updateOne(
      { userId },
      { $pull: { address: { _id: addressId } } }
    );

    res
      .status(200)
      .json({ status: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//  for delivery - setDefaultAddress
const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId } = req.body;

    await Address.updateOne(
      { userId },
      { $set: { "address.$[].isDefault": false } }
    );

    await Address.updateOne(
      { userId, "address._id": addressId },
      { $set: { "address.$.isDefault": true } }
    );

    res
      .status(200)
      .json({ status: true, message: "Default address set successfully" });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

// for cancel order
const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason, additionalComments } = req.body;

    // Find the order and validate ownership
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const sessionUserId = typeof req.session.user === 'object' ? 
                      (req.session.user.id || req.session.user._id).toString() : 
                      req.session.user.toString();

    if (order.userId.toString() !== sessionUserId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Check if order is eligible for cancellation
    const cancelableStatuses = ["Pending", "Processing"];
    if (!cancelableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled at this stage",
      });
    }

    // If payment is already done, we need to process refund to wallet
    let refundInitiated = false;
    let walletRefundResult = null;
    
    if (order.paymentDone && order.paymentMethod !== "cod") {
      // Flag for refund initiation
      refundInitiated = true;
      
      try {
        // Find user wallet
        let wallet = await Wallet.findOne({ userId: order.userId });
        
        // If wallet doesn't exist, create one
        if (!wallet) {
          wallet = new Wallet({
            userId: order.userId,
            balance: 0,
            transactions: []
          });
          await wallet.save(); // Make sure to save the newly created wallet
        }
        
        // Create transaction data
        const transactionData = {
          transactionId: uuidv4(), // Generate a new UUID
          orderId: order._id,
          amount: order.finalAmount,
          type: "credit",
          status: "completed",
          source: "order_cancellation",
          description: `Refund for cancelled order #${order.orderId}`,
          metadata: {
            orderDetails: {
              orderNumber: order.orderId,
              items: order.orderItems.map(item => ({
                productId: item.product,
                quantity: item.quantity,
                price: item.price
              })),
              cancelReason: reason === "Other" ? additionalComments : reason
            },
            paymentDetails: {
              method: order.paymentMethod,
              referenceId: order.razorpay?.paymentId || null
            }
          },
          createdAt: new Date(),
          completedAt: new Date()
        };
        
        // Add transaction and update wallet balance
        wallet.transactions.push(transactionData);
        const newBalance = wallet.calculateBalance();
        wallet.lastUpdated = new Date();
        
        // Save the updated wallet
        walletRefundResult = await wallet.save();
        
        console.log("Wallet refund processed successfully:", walletRefundResult);
      } catch (walletError) {
        console.error("Error processing wallet refund:", walletError);
        // Continue with cancellation even if wallet processing fails
      }
    }

    // Update order status and cancellation details
    const updateResult = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "Cancelled",
        cancellation: {
          cancelledAt: new Date(),
          reason: reason === "Other" ? "Other" : reason,
          otherReason: reason === "Other" ? additionalComments : null,
          comments: additionalComments,
        },
      },
      { new: true }
    );

    if (!updateResult) {
      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
      });
    }

    // Send success response with appropriate message
    let responseMessage = "Order cancelled successfully";
    if (refundInitiated) {
      if (walletRefundResult) {
        responseMessage += `. Amount ₹${order.finalAmount} has been credited to your wallet.`;
      } else {
        responseMessage += ". Wallet refund process failed, please contact support.";
      }
    }

    return res.status(200).json({
      success: true,
      message: responseMessage,
      order: updateResult,
      walletRefund: walletRefundResult ? {
        success: true,
        amount: order.finalAmount,
        walletBalance: walletRefundResult.balance
      } : null
    });
  } catch (error) {
    console.error("Error in order cancellation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: error.message
    });
  }
};


const returnOrder = async (req, res) => {
  try {
    const { orderId, returnReason, otherReason, comments } = req.body;
    
    // Find the order and validate ownership
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const sessionUserId = typeof req.session.user === 'object' ? 
                      (req.session.user.id || req.session.user._id).toString() : 
                      req.session.user.toString();

if (order.userId.toString() !== sessionUserId) {
  return res.status(403).json({
    success: false,
    message: "Unauthorized access",
  });
}

    // Check if order is eligible for return (only delivered orders)
    if (order.status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      });
    }
    
    // Check if the return window is still open (14 days from delivery)
    const deliveryDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 14) {
      return res.status(400).json({
        success: false,
        message: "Return window has expired (14 days from delivery date)",
      });
    }

    // Process uploaded images if any
    let proofImages = [];
    if (req.files && req.files.length > 0) {
      proofImages = req.files.map(file => file.path);
    }

    // Get user's address as pickup address (can be modified later)
    const user = await User.findById(req.session.user);
    const pickupAddress = user.address || order.address;

    // Update order status and return details
    const updateResult = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "Return Requested",
        return: {
          isRequested: true,
          requestedAt: new Date(),
          reason: returnReason === "Other" ? "Other" : returnReason,
          otherReason: returnReason === "Other" ? otherReason : null,
          comments: comments,
          status: 'Pending Approval',
          proofImages: proofImages,
          returnPickupAddress: pickupAddress
        },
      },
      { new: true }
    );

    if (!updateResult) {
      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
      });
    }

    // Send notification/email to admin about return request
    // sendReturnRequestNotification(updateResult); // Implement this function as needed

    return res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
      order: updateResult,
    });
  } catch (error) {
    console.error("Error in order return process:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const getWalletBalance = async (req, res) => {
  try {
    // Change from req.user._id to req.session.user
    const userId = req.session.user;
    
    // Find or create wallet for the user
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = await new Wallet({
        userId,
        balance: 0,
        transactions: []
      }).save();
    }
    
    res.status(200).json({
      status: true,
      balance: wallet.balance
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch wallet balance'
    });
  }
};

const getWalletTransactions = async (req, res) => {
  try {
    // Change from req.user._id to req.session.user
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(404).json({
        status: false,
        message: 'Wallet not found for this user'
      });
    }
    
    // Sort transactions by date (newest first) and paginate
    const transactions = wallet.transactions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);
    
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);
    
    res.status(200).json({
      status: true,
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch wallet transactions'
    });
  }
};

const createWalletAddMoneyOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    // Change from req.user._id to req.session.user
    const userId = req.session.user;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: false,
        message: 'Please provide a valid amount'
      });
    }
    
    // Generate a unique receipt ID for the transaction
    const receiptId = `w-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString().substr(-8)}`;    
    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: receiptId,
      payment_capture: 1
    };
    
    const razorpayOrder = await razorpayHelper.createOrder(options);
    
    if (!razorpayOrder.success) {
      return res.status(500).json({
        status: false,
        message: 'Failed to create payment order',
        error: razorpayOrder.error
      });
    }
    
    // Get user details
    const user = await User.findById(userId);
    
    // Return order details for client-side processing
    res.status(200).json({
      status: true,
      order: razorpayOrder.order,
      key: process.env.RAZORPAY_API_KEY,
      user: {
        name: user.name || '',
        email: user.email || '',
        contact: user.mobile || ''
      },
      walletData: {
        amount: amount,
        receiptId: receiptId
      }
    });
    
  } catch (error) {
    console.error('Wallet add money error:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to create payment order'
    });
  }
};

const verifyWalletPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      amount,
      receiptId
    } = req.body;
    
    // Change from req.user._id to req.session.user
    const userId = req.session.user;
    
    // Verify payment signature
    const isValid = razorpayHelper.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });
    
    if (!isValid) {
      return res.status(400).json({
        status: false,
        message: 'Payment verification failed'
      });
    }
    
    // Find or create wallet for the user
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
      });
    }
    
    // Create transaction for the wallet
    const transaction = {
      transactionId: razorpay_payment_id,
      amount: parseFloat(amount),
      type: "credit",
      status: "completed",
      source: "admin_credit", // Using admin_credit for adding money to wallet
      description: "Added money to wallet",
      metadata: {
        paymentDetails: {
          method: "razorpay",
          referenceId: razorpay_order_id
        }
      },
      completedAt: Date.now()
    };
    
    wallet.transactions.push(transaction);
    wallet.calculateBalance();
    wallet.lastUpdated = Date.now();
    
    await wallet.save();
    
    res.status(200).json({
      status: true,
      message: 'Money added to wallet successfully',
      balance: wallet.balance,
      transaction: transaction
    });
    
  } catch (error) {
    console.error('Wallet payment verification error:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword,
  userProfile,
  changeUserDetails,
  changePassOtp,
  verifyChangePassOtp,
  changePassword,
  addOrEditAddress,
  deleteAddress,
  setDefaultAddress,
  cancelOrder,
  returnOrder,
  getWalletBalance,
  getWalletTransactions,
  createWalletAddMoneyOrder,
  verifyWalletPayment
};
