const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema({
  code: String,
  name: String,
});

module.exports = mongoose.model("State", stateSchema);
