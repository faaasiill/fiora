const Order = require("../../models/orderSchema");

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

    order.status = status;
    await order.save();

    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating order status",
    });
  }
};

// for get Order ById
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

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if return request exists
    if (!order.return || !order.return.isRequested) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No return request found for this order",
        });
    }

    // Update return status based on action
    if (action === "approve") {
      order.return.status = "Approved";
      order.status = "Return Approved"; // Update main order status

      // Initialize refund process if order was paid
      if (order.paymentDone && order.paymentMethod !== "cod") {
        order.return.refundStatus = "Processing";
        order.return.refundAmount = order.finalAmount; // Default to full refund
      }
    } else if (action === "reject") {
      order.return.status = "Rejected";
      order.status = "Return Rejected"; // Update main order status
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
