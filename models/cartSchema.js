const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true
      },
      totalPrice: {
        type: Number,
        required: true
      },
      status: {
        type: String,
        enum: ["placed", "removed"],
        default: "placed"
      }
    }
  ],
  coupon: {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon"
    },
    name: {
      type: String
    },
    discount: {
      type: Number,
      default: 0
    }
  },
  cartTotal: {
    subtotal: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    shipping: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    final: {
      type: Number,
      default: 0
    }
  }
});

// Method to calculate cart totals with fixed decimal precision
cartSchema.methods.calculateTotals = function() {
  console.log("calculateTotals called");
  let subtotal = 0;
  
  // Calculate subtotal from items
  this.items.forEach(item => {
    if (item.status === "placed") {
      item.totalPrice = Number(item.totalPrice.toFixed(2));
      subtotal += item.totalPrice;
    }
  });
  
  // Round subtotal to 2 decimal places
  subtotal = Number(subtotal.toFixed(2));
  
  // Calculate tax, shipping, and discount with rounding
  const tax = Number((subtotal * 0.18).toFixed(2));
  const shipping = subtotal < 1000 ? 49 : 0;
  
  // Apply coupon discount if exists
  let discount = 0;
  if (this.coupon && typeof this.coupon.discount === 'number') {
    discount = Number(this.coupon.discount.toFixed(2));
  }
  
  // Calculate final total with rounding
  const final = Number((subtotal + tax + shipping - discount).toFixed(2));
  
  // Save totals to the cart document
  this.cartTotal = {
    subtotal,
    tax,
    shipping,
    discount,
    final
  };
  
  console.log("New cartTotal:", this.cartTotal);
  return this.cartTotal;
};

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;