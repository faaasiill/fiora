const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const walletSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    required: true
  },
  transactions: [
    {
      transactionId: {
        type: String,
        default: () => uuidv4(),
        required: true
      },
      orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order"
      },
      amount: {
        type: Number,
        required: true
      },
      type: {
        type: String,
        enum: ["credit", "debit"],
        required: true
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending"
      },
      source: {
        type: String,
        enum: ["order_return", "order_cancellation", "admin_credit", "wallet_payment", "refund", "other"],
        required: true
      },
      description: {
        type: String
      },
      metadata: {
        orderDetails: {
          orderNumber: String,
          items: [{
            productId: {
              type: Schema.Types.ObjectId,
              ref: "Product"
            },
            productName: String,
            quantity: Number,
            price: Number
          }],
          returnReason: String,
          cancelReason: String
        },
        paymentDetails: {
          method: String,
          referenceId: String
        }
      },
      createdAt: {
        type: Date,
        default: Date.now,
        required: true
      },
      completedAt: {
        type: Date
      }
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Method to calculate total wallet balance
walletSchema.methods.calculateBalance = function() {
  let totalBalance = 0;

  this.transactions.forEach(transaction => {
    if (transaction.status === "completed") {
      if (transaction.type === "credit") {
        totalBalance += transaction.amount;
      } else if (transaction.type === "debit") {
        totalBalance -= transaction.amount;
      }
    }
  });

  this.balance = totalBalance;
  return totalBalance;
};

// Static method to add a transaction and update balance
walletSchema.statics.addTransaction = async function(userId, transactionData) {
  const wallet = await this.findOne({ userId });
  
  if (!wallet) {
    throw new Error("Wallet not found for this user");
  }
  
  wallet.transactions.push(transactionData);
  wallet.calculateBalance();
  wallet.lastUpdated = Date.now();
  
  return wallet.save();
};

// Create transaction for order return or cancellation
walletSchema.statics.processOrderRefund = async function(userId, orderData, refundType, amount, reason) {
  const wallet = await this.findOne({ userId });
  
  if (!wallet) {
    throw new Error("Wallet not found for this user");
  }
  
  const source = refundType === "return" ? "order_return" : "order_cancellation";
  
  const transaction = {
    orderId: orderData._id,
    amount: amount,
    type: "credit",
    status: "completed",
    source: source,
    description: `Refund for ${refundType === "return" ? "returned" : "cancelled"} order #${orderData.orderId}`,
    metadata: {
      orderDetails: {
        orderNumber: orderData.orderId,
        items: orderData.orderItems.map(item => ({
          productId: item.product,
          quantity: item.quantity,
          price: item.price
        })),
        returnReason: refundType === "return" ? reason : null,
        cancelReason: refundType === "cancellation" ? reason : null
      },
      paymentDetails: {
        method: orderData.paymentMethod,
        referenceId: orderData.razorpay?.paymentId || null
      }
    },
    completedAt: Date.now()
  };
  
  wallet.transactions.push(transaction);
  wallet.calculateBalance();
  wallet.lastUpdated = Date.now();
  
  return wallet.save();
};

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;