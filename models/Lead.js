const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  leadOwner: { type: String, required: true }, // logged-in user by default
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  company: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String },
  leadSource: { type: String },
  leadStatus: { type: String },
  industry: { type: String },
  noOfEmployees: { type: Number },
  annualRevenue: { type: Number },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  zipcode: { type: String },
  country: { type: String },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Lead", leadSchema);