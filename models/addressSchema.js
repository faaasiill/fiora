const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  address: [
    {
      addressType: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      landMark: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: Number,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      altPhone: {
        type: String,
        required: true,
      },
      isDefault: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

module.exports = mongoose.model("Address", addressSchema);
