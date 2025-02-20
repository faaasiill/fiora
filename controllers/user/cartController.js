const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'productName productImage salePrice status quantity'
            });

        if (!cart) {
            return res.render("cart", {
                cartItems: [],
                totalAmount: 0,
                cartTotal: {
                    subtotal: 0,
                    tax: 0,
                    shipping: 0,
                    discount: 0,
                    final: 0
                }
            });
        }

        const cartItems = cart.items.filter(item => item.status === 'placed');
        cart.calculateTotals();
        await cart.save();

        res.render("cart", {
            cartItems,
            totalAmount: cart.cartTotal.subtotal,
            cartTotal: cart.cartTotal
        });

    } catch (error) {
        console.error("Load cart error:", error);
        res.redirect("/pageNotFound");
    }
};

const addToCart = async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session?.user) {
            return res.status(401).json({
                status: false,
                notLoggedIn: true,
                message: "Please login to add items to cart"
            });
        }

        const { productId } = req.body;
        const userId = req.session.user;

        // Validate productId
        if (!productId) {
            return res.status(400).json({
                status: false,
                message: "Product ID is required"
            });
        }

        // Check if product exists and is in stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                status: false,
                message: "Product not found"
            });
        }

        // Check product stock
        if (product.quantity < 1) {
            return res.json({
                status: false,
                stockError: true,
                message: "Product is out of stock"
            });
        }

        // Find or create cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        // Check if product already in cart
        const existingItem = cart.items.find(item => 
            item.productId.toString() === productId && 
            item.status === 'placed'
        );

        if (existingItem) {
            // Check if adding one more exceeds stock
            if (existingItem.quantity + 1 > product.quantity) {
                return res.json({
                    status: false,
                    stockError: true,
                    message: "Cannot add more of this item - stock limit reached"
                });
            }

            // Update existing item
            existingItem.quantity += 1;
            existingItem.totalPrice = existingItem.price * existingItem.quantity;
        } else {
            // Add new item
            cart.items.push({
                productId,
                quantity: 1,
                price: product.salePrice,
                totalPrice: product.salePrice,
                status: 'placed'
            });
        }

        await cart.save();

        // Calculate cart count for header update
        const cartCount = cart.items.reduce((total, item) => {
            return item.status === 'placed' ? total + item.quantity : total;
        }, 0);

        return res.status(200).json({
            status: true,
            cartCount,
            message: "Product added to cart successfully"
        });

    } catch (error) {
        console.error("Add to cart error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to add product to cart"
        });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user;

        if (!productId || !quantity) {
            return res.status(400).json({
                status: false,
                message: "Product ID and quantity are required"
            });
        }

        // Validate quantity
        if (quantity < 1) {
            return res.status(400).json({
                status: false,
                message: "Quantity must be at least 1"
            });
        }

        // Check product stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                status: false,
                message: "Product not found"
            });
        }

        if (quantity > product.quantity) {
            return res.json({
                status: false,
                stockError: true,
                message: "Requested quantity exceeds available stock"
            });
        }

        // Update cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                status: false,
                message: "Cart not found"
            });
        }

        const cartItem = cart.items.find(item => 
            item.productId.toString() === productId && 
            item.status === 'placed'
        );

        if (!cartItem) {
            return res.status(404).json({
                status: false,
                message: "Product not found in cart"
            });
        }

        cartItem.quantity = quantity;
        cartItem.totalPrice = cartItem.price * quantity;

        // Calculate new totals
        const cartTotal = cart.calculateTotals();
        await cart.save();

        const cartCount = cart.items.reduce((total, item) => 
            item.status === 'placed' ? total + item.quantity : total, 0
        );

        return res.json({
            status: true,
            cartTotal,
            cartCount,
            itemTotal: cartItem.totalPrice,
            message: "Cart updated successfully"
        });

    } catch (error) {
        console.error("Update cart error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to update cart"
        });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        if (!req.session?.user) {
            return res.status(401).json({
                status: false,
                notLoggedIn: true,
                message: "Please login to modify cart"
            });
        }

        if (!productId) {
            return res.status(400).json({
                status: false,
                message: "Product ID is required"
            });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                status: false,
                message: "Cart not found"
            });
        }

        // Find item index
        const itemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId && 
            item.status === 'placed'
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                status: false,
                message: "Product not found in cart"
            });
        }

        // Remove item
        cart.items.splice(itemIndex, 1);
        
        // Calculate new totals
        const cartTotal = cart.calculateTotals();
        await cart.save();

        const cartCount = cart.items.reduce((total, item) => 
            item.status === 'placed' ? total + item.quantity : total, 0
        );

        return res.json({
            status: true,
            cartTotal,
            cartCount,
            message: "Product removed from cart"
        });

    } catch (error) {
        console.error("Remove from cart error:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to remove product from cart"
        });
    }
};


module.exports = {
    loadCart,
    addToCart,
    updateCartQuantity,
    removeFromCart
};