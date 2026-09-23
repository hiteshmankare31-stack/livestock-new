const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  lat: Number, lon: Number, accuracy: Number, address: String,
  village: String, town: String, city: String, taluka: String, district: String, state: String, country: String,
  area: String, capturedAt: Date
}, { _id: false });

const healthReportSchema = new mongoose.Schema({
  animalId: { type: String, required: true },
  symptoms: [{ type: String }],
  photoUrl: { type: String, default: "" },
  aiPrediction: { type: mongoose.Schema.Types.Mixed, default: null },
  disease: { type: String, default: "" },
  location: { type: locationSchema, default: null },
  riskLevel: { type: String, enum: ["Low", "Medium", "High"], required: true },
  riskScore: { type: Number, required: true },
  possibleRisks: [{ type: String }],
  recommendation: { type: String, default: "" },
  status: { type: String, default: "Open" }
}, { timestamps: true });

healthReportSchema.index({ "location.lat": 1, "location.lon": 1, createdAt: -1 });
healthReportSchema.index({ disease: 1, "location.village": 1, "location.taluka": 1, createdAt: -1 });
module.exports = mongoose.model("HealthReport", healthReportSchema);
