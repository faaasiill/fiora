const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const State = require("../../models/stateSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const razorpayHelper = require('../../helpers/razorpayHelper');

// Helper function to validate stock
const validateCartStock = async (cartItems) => {
  const invalidItems = [];
  
  for (const item of cartItems) {
    const product = await Product.findById(item.productId._id);
    
    if (!product || 
        product.isBlocked || 
        product.status !== "Available" || 
        product.quantity < item.quantity) {
      invalidItems.push({
        productId: item.productId._id,
        productName: item.productId.productName,
        requestedQuantity: item.quantity,
        availableStock: product ? product.quantity : 0,
        reason: !product ? "Product not found" :
                product.isBlocked ? "Product is blocked" :
                product.status !== "Available" ? "Product is not available" :
                "Insufficient stock"
      });
    }
  }

  return {
    isValid: invalidItems.length === 0,
    invalidItems
  };
};


// for load CheckOut page
const loadCheckOut = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId).select("name email");
    const addresses = await Address.findOne({ userId });

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "productName productImage salePrice status quantity",
    });

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
    

    // Check stock availability for all items
    const stockValidation = await validateCartStock(cart.items);
    if (!stockValidation.isValid) {
      return res.status(400).json({
        status: false,
        message: "Some items in your cart are out of stock or exceed available quantity",
        invalidItems: stockValidation.invalidItems
      });
    }


    const cartItems = cart.items
      .filter((item) => item.status === "placed")
      .map((item) => ({
        id: item._id,
        name: item.productId.productName,
        image: item.productId.productImage[0],
        price: item.price,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        stock: item.productId.quantity,
      }));

    // Recalculate cart totals
    cart.calculateTotals();
    await cart.save();

    const states = await State.find({}, "code name");

    res.render("checkout", {
      user,
      addresses: addresses ? addresses.address : [],
      cartItems,
      cartTotal: cart.cartTotal,
      states,
    });
  } catch (error) {
    console.error("Checkout load error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to load checkout page",
    });
  }
};

// for payment gateway
const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, addressDetails, paymentMethod } = req.body;

    // Validate payment method
    const validPaymentMethods = ["cod", "razorpay", "paypal", "upi"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        status: false,
        message: "Invalid payment method",
      });
    }

    // Fetch cart and validate
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "productName quantity salePrice",
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Cart is empty",
      });
    }

    // Validate stock before placing order
    const stockValidation = await validateCartStock(cart.items);
    if (!stockValidation.isValid) {
      return res.status(400).json({
        status: false,
        message: "Some items are no longer available in requested quantity",
        invalidItems: stockValidation.invalidItems
      });
    }

    // Create order items and update product stock
    const orderItems = [];
    for (const item of cart.items.filter(item => item.status === "placed")) {
      const product = await Product.findById(item.productId._id);
      
      // Double-check stock one final time
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          status: false,
          message: `Insufficient stock for ${product.productName}`,
        });
      }

      // Update product stock
      product.quantity -= item.quantity;
      if (product.quantity === 0) {
        product.status = "Out of Stock";
      }
      await product.save();

      orderItems.push({
        product: item.productId._id,
        quantity: item.quantity,
        price: item.price,
      });
    }

    // Ensure cart totals are up to date
    cart.calculateTotals();

    // Create new order with address details and coupon information
    const newOrder = new Order({
      userId: userId,
      orderItems,
      totalPrice: cart.cartTotal.subtotal,
      discount: cart.cartTotal.discount,
      finalAmount: cart.cartTotal.final,
      address: addressDetails,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      status: "Pending",
      invoiceDate: new Date(),

      couponApplied: cart.coupon && cart.coupon.couponId ? true : false,
      couponDetails: cart.coupon && cart.coupon.couponId ? cart.coupon : null,
    });

    // Save order
    await newOrder.save();

    await User.findByIdAndUpdate(
      userId,
      { $push: { orderHistory: newOrder._id } },
      { new: true }
    );

    // CHANGE HERE: Only delete cart for COD orders
    if (paymentMethod === "cod") {
      await Cart.findOneAndDelete({ userId });
    }

    res.status(200).json({
      status: true,
      message: "Order placed successfully",
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error("Order placement error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Failed to place order",
    });
  }
};

// for check OrderData
const checkOrderData = async (orderId) => {
  try {
    // Check Order
    const order = await Order.findOne({ orderId });
    console.log("Raw order data:", order);

    if (order) {
      // Check Address
      const address = await Address.findById(order.address);
      console.log("Associated address data:", address);
    }
  } catch (error) {
    console.error("Database check error:", error);
  }
};

// for order Confirmation
const orderConfirmation = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    await checkOrderData(orderId);
    console.log("Searching for orderId:", orderId);

    const orderExists = await Order.findOne({ orderId });
    console.log("Order exists:", orderExists);

    if (!orderExists) {
      console.log("Order not found in database");
      return res.redirect("/pageNotFound");
    }

    // Fetch order details with populated references
    const order = await Order.findOne({ orderId })
      .populate({
        path: "orderItems.product",
        select: "productName productImage salePrice",
      })
      .populate({
        path: "address",
        model: "Address",
        select: "fullName address city state pincode mobile",
      });

    console.log("Populated order:", {
      orderId: order.orderId,
      addressId: order.address,
      orderItems: order.orderItems.length,
    });

    if (!order.address) {
      return res.render("orderConfirmed", {
        order,
        deliveryEstimate: {
          min: new Date(order.createdOn.getTime() + 3 * 24 * 60 * 60 * 1000),
          max: new Date(order.createdOn.getTime() + 5 * 24 * 60 * 60 * 1000),
        },
        paymentMethod: order.paymentMethod.toUpperCase(),
        orderDate: order.invoiceDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        addressError: true,
      });
    }

    // Calculate delivery estimate (3-5 business days)
    const deliveryEstimate = {
      min: new Date(order.createdOn.getTime() + 3 * 24 * 60 * 60 * 1000),
      max: new Date(order.createdOn.getTime() + 5 * 24 * 60 * 60 * 1000),
    };

    res.render("orderConfirmed", {
      order,
      deliveryEstimate,
      paymentMethod: order.paymentMethod.toUpperCase(),
      orderDate: order.invoiceDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      addressError: false,
    });
  } catch (error) {
    console.error("Error from orderConfirmed:", error);
    res.redirect("/pageNotFound");
  }
};


const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Fetch the order from DB
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({
        status: false,
        message: 'Order not found'
      });
    }
    
    // Create Razorpay order
    const options = {
      amount: Math.round(order.finalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: order.orderId,
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
    
    // Return order details for client-side processing
    res.status(200).json({
      status: true,
      order: razorpayOrder.order,
      key: process.env.RAZORPAY_API_KEY,
      user: {
        name: order.address.fullName,
        email: req.session.email || '',
        contact: order.address.mobile
      },
      orderData: {
        id: order._id,
        orderId: order.orderId,
        amount: order.finalAmount
      }
    });
    
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to create payment order'
    });
  }
};

// Verify and update payment status
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_id
    } = req.body;
    
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
    
    // Update order with payment details
    const order = await Order.findOneAndUpdate(
      { orderId: order_id },
      { 
        paymentDone: true,
        paymentStatus: "completed",
        'razorpay.orderId': razorpay_order_id,
        'razorpay.paymentId': razorpay_payment_id,
        'razorpay.signature': razorpay_signature
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        status: false,
        message: 'Order not found'
      });
    }
    
    // ADDED: Delete cart after successful payment verification
    await Cart.findOneAndDelete({ userId: order.userId });
    
    res.status(200).json({
      status: true,
      message: 'Payment successful',
      orderId: order.orderId
    });
    
  } catch (error) {
    console.error('Razorpay payment verification error:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};


module.exports = {
  loadCheckOut,
  placeOrder,
  orderConfirmation,
  createRazorpayOrder,
  verifyRazorpayPayment
};
