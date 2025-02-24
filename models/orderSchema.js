const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");
const Address = require("./addressSchema");

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  address: {
    fullName: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    mobile: String,
  },
  invoiceDate: {
    type: Date,
  },
  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return Request",
      "Returned",
    ],
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cod", "razorpay", "paypal", "upi"],
  },
  paymentDone: {
    type: Boolean,
    default: false,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  cancellation: {
    cancelledAt: {
      type: Date,
    },
    reason: {
      type: String,
      enum: [
        "Changed my mind",
        "Found better price elsewhere",
        "Ordered by mistake",
        "Shipping takes too long",
        "Payment issues",
        "Other",
      ],
    },
    otherReason: {
      type: String,
    },
    comments: {
      type: String,
    },
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
