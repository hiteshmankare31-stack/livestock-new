const mongoose = require("mongoose");

const animalSchema = new mongoose.Schema(
  {
    animalId: { type: String, required: true, unique: true },
    species: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, default: "Unknown" },
    vaccinationHistory: { type: String, default: "" },
    medicalHistory: { type: String, default: "" },
    ownerName: { type: String, default: "Demo Farmer" },
    photoUrl: { type: String, default: "" },
    breeding: {
      breed: { type: String, default: "" },
      lastHeatDate: { type: Date, default: null },
      inseminationDate: { type: Date, default: null },
      pregnancyStatus: { type: String, default: "Unknown" },
      expectedDeliveryDate: { type: Date, default: null },
      lastCalvingDate: { type: Date, default: null },
      numberOfCalves: { type: Number, default: 0 },
      vetVerified: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Animal", animalSchema);
