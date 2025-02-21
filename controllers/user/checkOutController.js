const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const State = require("../../models/stateSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");

const loadCheckOut = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId).select('name email');
        const addresses = await Address.findOne({ userId });
        
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'productName productImage salePrice status quantity'
            });

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }


        const cartItems = cart.items
            .filter(item => item.status === 'placed')
            .map(item => ({
                id: item._id,
                name: item.productId.productName,
                image: item.productId.productImage[0],
                price: item.price,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
                stock: item.productId.quantity
            }));

        // Recalculate cart totals
        cart.calculateTotals();
        await cart.save();

        const states = await State.find({}, 'code name');


        res.render('checkout', {
            user,
            addresses: addresses ? addresses.address : [],
            cartItems,
            cartTotal: cart.cartTotal,
            states
        });

    } catch (error) {
        console.error("Checkout load error:", error);
        res.status(500).json({ 
            status: false, 
            message: "Failed to load checkout page" 
        });
    }
};


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, addressDetails, paymentMethod } = req.body;

        // Validate payment method
        const validPaymentMethods = ["cod", "razorpay", "paypal", "upi"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                status: false,
                message: "Invalid payment method"
            });
        }

        // Fetch cart and validate
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'productName quantity salePrice'
            });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Cart is empty"
            });
        }

        // Create order items from cart
        const orderItems = cart.items
            .filter(item => item.status === 'placed')
            .map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price
            }));

        // Ensure cart totals are up to date
        cart.calculateTotals();

        // Create new order with address details
        const newOrder = new Order({
            orderItems,
            totalPrice: cart.cartTotal.subtotal,
            discount: cart.cartTotal.discount,
            finalAmount: cart.cartTotal.final,
            address: addressDetails, // Store full address details
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
            status: "Pending",
            invoiceDate: new Date()
        });

        // Save order
        await newOrder.save();

        // Clear cart
        await Cart.findOneAndDelete({ userId });

        // Return success response
        res.status(200).json({
            status: true,
            message: "Order placed successfully",
            orderId: newOrder.orderId
        });

    } catch (error) {
        console.error("Order placement error:", error);
        res.status(500).json({
            status: false,
            message: error.message || "Failed to place order"
        });
    }
};


const checkOrderData = async (orderId) => {
    try {
        // Check Order
        const order = await Order.findOne({ orderId });
        console.log('Raw order data:', order);

        if (order) {
            // Check Address
            const address = await Address.findById(order.address);
            console.log('Associated address data:', address);
        }
    } catch (error) {
        console.error('Database check error:', error);
    }
};

// Add this to your orderConfirmation function



const orderConfirmation = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        await checkOrderData(orderId);
        console.log('Searching for orderId:', orderId);

        const orderExists = await Order.findOne({ orderId });
        console.log('Order exists:', orderExists);
        
        if (!orderExists) {
            console.log('Order not found in database');
            return res.redirect('/pageNotFound');
        }

        // Fetch order details with populated references
        const order = await Order.findOne({ orderId })
            .populate({
                path: 'orderItems.product',
                select: 'productName productImage salePrice'
            })
            .populate({
                path: 'address',
                model: 'Address',  // Explicitly specify the model
                select: 'fullName address city state pincode mobile'
            });

            console.log('Populated order:', {
                orderId: order.orderId,
                addressId: order.address,
                orderItems: order.orderItems.length
            });

            if (!order.address) {
            console.log('Address population failed for order:', orderId);
            // Instead of redirecting, you might want to show partial information
            return res.render('orderConfirmed', {
                order,
                deliveryEstimate: {
                    min: new Date(order.createdOn.getTime() + (3 * 24 * 60 * 60 * 1000)),
                    max: new Date(order.createdOn.getTime() + (5 * 24 * 60 * 60 * 1000))
                },
                paymentMethod: order.paymentMethod.toUpperCase(),
                orderDate: order.invoiceDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                addressError: true  // Add flag for template handling
            });
        }

        // Calculate delivery estimate (3-5 business days)
        const deliveryEstimate = {
            min: new Date(order.createdOn.getTime() + (3 * 24 * 60 * 60 * 1000)),
            max: new Date(order.createdOn.getTime() + (5 * 24 * 60 * 60 * 1000))
        };

        res.render('orderConfirmed', {
            order,
            deliveryEstimate,
            paymentMethod: order.paymentMethod.toUpperCase(),
            orderDate: order.invoiceDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            addressError: false
        });
        
    } catch (error) {
        console.error("Error from orderConfirmed:", error);
        res.redirect("/pageNotFound");
    }
};






module.exports = {
    loadCheckOut,
    placeOrder,
    orderConfirmation
};