const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

// for error pages
const pageerror = async (req, res) => {
  try {
    res.render("admin-error");
  } catch (error) {
    console.error("Error Page Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

// for loading admin login page
const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { message: null });
};

// for admin check
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login Attempt:", req.body);

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      console.log("Admin not found!");
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      console.log("Incorrect password!");
      return res.redirect("/login");
    }

    req.session.admin = admin._id.toString();
    req.session.save(() => {
      return res.redirect("/admin/dashboard");
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.redirect("/pageerror");
  }
};

const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      // Get total users count
      const totalUsers = await User.countDocuments({ isAdmin: false });
      
      // Get total products count
      const totalProducts = await Product.countDocuments();
      
      // Get total orders count
      const totalOrders = await Order.countDocuments();
      
      // Calculate total revenue
      const orders = await Order.find({ paymentDone: true });
      const totalRevenue = orders.reduce((total, order) => total + order.finalAmount, 0);
      
      // Get order status counts
      const pendingOrders = await Order.countDocuments({ status: "Pending" });
      const processingOrders = await Order.countDocuments({ status: "Processing" });
      const shippedOrders = await Order.countDocuments({ status: "Shipped" });
      const deliveredOrders = await Order.countDocuments({ status: "Delivered" });
      const cancelledOrders = await Order.countDocuments({ status: "Cancelled" });
      const returnedOrders = await Order.countDocuments({ status: { $in: ["Return Requested", "Return Approved", "Return Completed", "Returned"] } });
      
      // Get recent orders
      const recentOrders = await Order.find()
        .sort({ createdOn: -1 })
        .limit(10)
        .populate('userId', 'name email')
        .lean();
      
      // Format recentOrders to include user information and format dates
      const formattedRecentOrders = recentOrders.map(order => {
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        return {
          ...order,
          formattedDate: new Date(order.createdOn).toLocaleDateString('en-US', dateOptions)
        };
      });
      
      // Get top products based on order frequency
      const topProducts = await Product.find()
        .sort({ viewCount: -1 })
        .limit(5)
        .lean();
      
      // Get recently registered users
      const recentUsers = await User.find({ isAdmin: false })
        .sort({ createdOn: -1 })
        .limit(5)
        .lean();
      
      // Format recentUsers to include formatted dates and order counts
      const formattedRecentUsers = await Promise.all(recentUsers.map(async user => {
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const orderCount = await Order.countDocuments({ userId: user._id });
        return {
          ...user,
          formattedDate: new Date(user.createdOn).toLocaleDateString('en-US', dateOptions),
          orderCount
        };
      }));
      
      // Get sales data for chart (monthly revenue for the year)
      const currentYear = new Date().getFullYear();
      const monthlySales = [];
      
      for (let month = 0; month < 12; month++) {
        const startDate = new Date(currentYear, month, 1);
        const endDate = new Date(currentYear, month + 1, 0);
        
        const monthlyOrders = await Order.find({
          createdOn: { $gte: startDate, $lte: endDate },
          paymentDone: true
        });
        
        const monthlyRevenue = monthlyOrders.reduce((total, order) => total + order.finalAmount, 0);
        monthlySales.push(monthlyRevenue);
      }
      
      // Get payment method distribution
      const paymentMethods = await Order.aggregate([
        { $match: { paymentDone: true } },
        { $group: { _id: "$paymentMethod", count: { $sum: 1 } } }
      ]);
      
      const formattedPaymentMethods = paymentMethods.map(method => {
        const methodNames = {
          'cod': 'Cash on Delivery',
          'razorpay': 'Credit Card/Razorpay',
          'paypal': 'PayPal',
          'upi': 'UPI',
          'wallet': 'Wallet'
        };
        return {
          name: methodNames[method._id] || method._id,
          count: method.count
        };
      });
      
      // Get return reasons distribution
      const returnReasons = await Order.aggregate([
        { $match: { "return.isRequested": true } },
        { $group: { _id: "$return.reason", count: { $sum: 1 } } }
      ]);
      
      // Calculate percentage change from previous period (simplified version)
      // This would ideally compare with previous month or period
      const orderGrowth = 15; // Placeholder, should calculate from previous period
      const userGrowth = 8;   // Placeholder
      const revenueGrowth = 12; // Placeholder
      const productGrowth = 5;  // Placeholder
      
      const fs = require('fs-extra');
      const path = require('path');
      fs.ensureDirSync(path.join(__dirname, '../../public/reports'));
      
      res.render("dashboard", {
        totalOrders,
        totalUsers,
        totalRevenue,
        totalProducts,
        orderGrowth,
        userGrowth,
        revenueGrowth,
        productGrowth,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        recentOrders: formattedRecentOrders,
        topProducts,
        recentUsers: formattedRecentUsers,
        monthlySales,
        paymentMethods: formattedPaymentMethods,
        returnReasons,
        reportFeatures: true
      });
    } catch (error) {
      console.error("Dashboard Error:", error);
      res.redirect("/pageerror");
    }
  } else {
    res.redirect("/login");
  }
};

// for logout admin 
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session:", err);
        return res.redirect("/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log(("unexpected error during logout:", error));
    res.redirect("/pageerror");
  }
};

module.exports = {
  pageerror,
  loadLogin,
  login,
  loadDashboard,
  logout,
};
