const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema({
  serviceName: { type: String, required: true },  // e.g. "crm", "analytics"
  planName: { type: String, required: true },     // e.g. "Free", "Pro", "Enterprise"
  price: { type: Number, default: 0 },
});

module.exports = mongoose.model("Subscription", SubscriptionPlanSchema);
