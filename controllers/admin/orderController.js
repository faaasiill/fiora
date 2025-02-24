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
          status = status.toLowerCase().replace(" ", "");
          const statusClasses = {
            pending: "status-pending",
            processing: "status-processing",
            shipped: "status-shipped",
            delivered: "status-delivered",
            cancelled: "status-cancelled",
            returnrequest: "status-return",
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

module.exports = {
  getOrders,
  updateOrderStatus,
  getOrderById,
};
