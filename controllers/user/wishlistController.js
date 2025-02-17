const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");




const loadWishlist = async (req, res) => {
  try {
      const userId = req.session.user;
      const user = await User.findById(userId);
      const products = await Product.find({_id: {$in: user.wishlist}})
                                  .populate('category');

      res.render("wishlist", {
          user,
          wishlist: products,
      });
  } catch (error) {
      console.log("wishlist", error);
      res.redirect("/pageNotFound");
  }
};

const addToWishlist = async (req, res) => {
    try {
      // Check if user is logged in
      if (!req.session?.user) { // Optional chaining to prevent errors
        return res.status(401).json({ 
          status: false, 
          notLoggedIn: true,
          message: 'Please login first' 
        });
      }
  
      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ 
          status: false, 
          message: 'Product ID is required' 
        });
      }
  
      const userId = req.session.user;
      const user = await User.findById(userId);
  
      if (user.wishlist.includes(productId)) {
        return res.status(200).json({ 
          status: false, 
          message: 'Product already in wishlist' 
        });
      }
  
      user.wishlist.push(productId);
      await user.save();
      return res.status(200).json({ 
        status: true, 
        message: 'Product added to wishlist' 
      });
  
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ 
          status: false, 
          message: "Internal Server Error" 
        });
      }
};

const getWishlistedProducts = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json([]);
        }
        
        const user = await User.findById(req.session.user);
        if (!user) {
            return res.json([]);
        }
        
        // Return the wishlist array directly from the user document
        res.json(user.wishlist);
        
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json([]);
    }
}


const removeFromWishlist = async (req, res) => {
  try {

    const productId = req.query.productId;
    const userId = req.session.user;
    const user = await User.findById(userId);
    const index = user.wishlist.indexOf(productId);
    user.wishlist.splice(index, 1);
    await user.save();
    return res.redirect("/wishlist");
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({status: false, message: "Internal Server Error"});
    
  }
  
}



module.exports = {
    loadWishlist,
    addToWishlist,
    getWishlistedProducts,
    removeFromWishlist
}