const mongoose = require("mongoose");
const alertSchema = new mongoose.Schema({
  animalId: String,
  type: { type: String, default: "Health Alert" },
  message: String,
  riskLevel: String,
  disease: String,
  location: { type: mongoose.Schema.Types.Mixed, default: null },
  read: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model("Alert", alertSchema);
