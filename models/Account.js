const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  accountOwner: { type: String, required: true },
  accountName: { type: String, required: true },
  lastName: { type: String, required: true },
  website: { type: String, unique: true, sparse: true },
  phone: { type: String },
  accountType: { type: String },
  ownership: { type: String },
  industry: { type: String },
  Employees: { type: Number },
  annualRevenue: { type: Number },
  billingStreet: { type: String },
  billingCity: { type: String },
  billingState: { type: String },
  billingZipcode: { type: String },
  billingCountry: { type: String },
  shippingStreet: { type: String },
  shippingCity: { type: String }, 
  shippingState: { type: String },
  shippingZipcode: { type: String },
  shippingCountry: { type: String },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("account", accountSchema);
