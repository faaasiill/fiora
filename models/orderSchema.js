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
      "Return Requested",
      "Return Approved",
      "Return Rejected",
      "Return Completed",
      "Returned",
    ],
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cod", "razorpay", "paypal", "upi"],
  },
  razorpay: {
    orderId: String,
    paymentId: String,
    signature: String,
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
  deliveredAt: {
    type: Date,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  couponDetails: {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
    },
    name: {
      type: String,
    },
    discount: {
      type: Number,
      default: 0,
    },
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
  return: {
    isRequested: {
      type: Boolean,
      default: false,
    },
    requestedAt: {
      type: Date,
    },
    reason: {
      type: String,
      enum: [
        "Defective/Damaged Product",
        "Wrong Item Received",
        "Size/Fit Issue",
        "Quality Issue",
        "Not as Described",
        "Other",
      ],
    },
    otherReason: {
      type: String,
    },
    comments: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved", "Rejected", "Completed"],
      default: "Pending Approval",
    },
    adminComments: {
      type: String,
    },
    updatedAt: {
      type: Date,
    },
    refundStatus: {
      type: String,
      enum: ["Not Initiated", "Processing", "Completed", "Failed"],
      default: "Not Initiated",
    },
    refundAmount: {
      type: Number,
    },
    returnShipmentStatus: {
      type: String,
      enum: ["Pending", "Picked Up", "In Transit", "Delivered"],
      default: "Pending",
    },
    returnTrackingId: {
      type: String,
    },
    proofImages: [
      {
        type: String,
      },
    ],
    returnPickupAddress: {
      fullName: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      mobile: String,
    },
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
