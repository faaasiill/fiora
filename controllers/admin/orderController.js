const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");

// for get all orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .populate("orderItems.product", "productName")
      .sort({ createdOn: -1 });

    res.render("orders", {
      orders,
      helpers: {
        formatCurrency: (amount) => {
          return "₹" + amount.toLocaleString("en-IN");
        },
        formatDate: (date) => {
          return new Date(date).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
        getStatusClass: (status) => {
          status = status.toLowerCase().replace(/\s+/g, "");
          const statusClasses = {
            pending: "status-pending",
            processing: "status-processing",
            shipped: "status-shipped",
            delivered: "status-delivered",
            cancelled: "status-cancelled",
            returnrequest: "status-return",
            returnrequested: "status-return",
            returned: "status-returned",
          };
          return statusClasses[status] || "status-pending";
        },
      },
    });
  } catch (error) {
    res.status(500).render("error", {
      message: "Error loading orders. Please try again later.",
    });
  }
};

// for Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (status === "Cancelled" && order.status !== "Cancelled") {
      order.cancellation = {
        cancelledAt: new Date(),
        reason: "Other",
        comments: "Cancelled by administrator",
        otherReason: "Administrative cancellation",
      };
    } else if (order.status === "Cancelled" && status !== "Cancelled") {
      order.cancellation = undefined;
    }

    // When status is changed to "Delivered"
    if (status === "Delivered" && order.status !== "Delivered") {
      // Set payment status to true
      order.paymentDone = true;
      // Record delivery date
      order.deliveredAt = new Date();
    }

    order.status = status;
    await order.save();

    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    });
  }
};

// for get Order By Id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "name email")
      .populate("orderItems.product", "productName");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Error loading order details" });
  }
};

const updateReturnRequest = async (req, res) => {
  try {
    const { orderId, action, adminComment } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if return request exists
    if (!order.return || !order.return.isRequested) {
      return res.status(400).json({
        success: false,
        message: "No return request found for this order",
      });
    }

    // Update return status based on action
    if (action === "approve") {
      order.return.status = "Approved";
      order.status = "Return Approved";

      // Process refund to wallet if payment was made
      if (order.paymentDone) {
        order.return.refundStatus = "Processing";
        order.return.refundAmount = order.finalAmount;

        try {
          let wallet = await Wallet.findOne({ userId: order.userId });
          if (!wallet) {
            wallet = new Wallet({
              userId: order.userId,
              balance: 0,
              transactions: [],
            });
          }

          // Add refund transaction to wallet
          await Wallet.processOrderRefund(
            order.userId,
            order,
            "return",
            order.finalAmount,
            order.return.reason || "Return approved by admin"
          );

          // Update refund status in order
          order.return.refundStatus = "Completed";
        } catch (walletError) {
          console.error("Error processing wallet refund:", walletError);
          order.return.refundStatus = "Failed";
        }
      }
    } else if (action === "reject") {
      order.return.status = "Rejected";
      order.status = "Return Rejected";
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    // Add admin comment if provided
    if (adminComment) {
      order.return.adminComments = adminComment;
    }

    // Record update time
    order.return.updatedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: `Return request ${
        action === "approve" ? "approved" : "rejected"
      } successfully`,
    });
  } catch (error) {
    console.error("Error updating return request:", error);
    res.status(500).json({
      success: false,
      message: "Error updating return request",
      error: error.message,
    });
  }
};

module.exports = {
  getOrders,
  updateOrderStatus,
  getOrderById,
  updateReturnRequest,
};
