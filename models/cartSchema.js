const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
        },
        price: {
            type: Number,
            required: true,
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            default: 'placed',
        },
        orderPlaced: {
            type: Boolean,
            default: false,
        },
        cancellationReason: {
            type: String,
            default: "none"
        }
    }],
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

// Method to recalculate cart totals
cartSchema.methods.calculateTotals = function() {
    // Calculate subtotal from placed items
    const subtotal = this.items.reduce((total, item) => {
        return item.status === 'placed' ? total + item.totalPrice : total;
    }, 0);

    // Calculate other components
    const tax = subtotal * 0.18;
    const shipping = subtotal < 1000 ? 49 : 0;
    const discount = this.cartTotal.discount || 0;
    
    // Update cart totals
    this.cartTotal = {
        subtotal,
        tax,
        shipping,
        discount,
        final: subtotal + tax + shipping - discount
    };

    return this.cartTotal;
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;