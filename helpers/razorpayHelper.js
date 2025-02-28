const Razorpay = require('razorpay');

// Initialize Razorpay with your API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET
});

const createOrder = async (options) => {
  try {
    const order = await razorpay.orders.create(options);
    return { success: true, order };
  } catch (error) {
    console.error('Razorpay create order error:', error);
    return { success: false, error: error.message };
  }
};

const verifyPayment = (paymentDetails) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = paymentDetails;
    
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_API_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');
    
    return generatedSignature === razorpay_signature;
  } catch (error) {
    console.error('Razorpay verification error:', error);
    return false;
  }
};

module.exports = {
  createOrder,
  verifyPayment
};