require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Lead routes (combined)
const leadRoutes = require("./routes/leadRoutes");
app.use("/crm/api/lead", leadRoutes);

//user routes
const userRoutes = require("./routes/userRoutes");
app.use("/crm/api/user", userRoutes);

//invite route
// const inviteRoutes = require("./routes/inviteRoutes");
// app.use("/crm/api/invite", inviteRoutes);
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI ,  {
    dbName: "hynox-crm",
  })
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

const PORT = process.env.PORT ;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
