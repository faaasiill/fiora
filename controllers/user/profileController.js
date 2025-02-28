const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const { response } = require("express");

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

    const orders = await Order.find({ userId: userId })
      .populate("orderItems.product")
      .sort({ createdOn: -1 });

    const formattedOrders = orders.map((order) => {
      const formattedDate = new Date(order.createdOn).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      );

      return {
        ...order._doc,
        formattedDate,
      };
    });

    res.render("userProfile", {
      user: userData,
      address: addressData,
      orders: formattedOrders,
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

    // If payment is already done, we might need to initiate refund process
    let refundInitiated = false;
    if (order.paymentDone && order.paymentMethod !== "cod") {
      // Flag for refund initiation
      refundInitiated = true;
      // Note: Implement actual refund logic here based on payment method
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
      responseMessage += ". Refund process has been initiated";
    }

    return res.status(200).json({
      success: true,
      message: responseMessage,
      order: updateResult,
    });
  } catch (error) {
    console.error("Error in order cancellation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
  returnOrder
};
