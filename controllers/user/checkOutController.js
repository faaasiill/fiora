const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const State = require("../../models/stateSchema");
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
module.exports = {
    loadCheckOut,
};