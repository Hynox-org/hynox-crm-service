const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const roleAuth = require("../middleware/roleAuth");


// ✅ Create Lead
router.post("/create",roleAuth(["super_admin"]), async (req, res) => {
  try {
    const { company, firstName, lastName, email, leadOwner,phone,Industry, leadStatus,leadSource, noOfEmployees, annualRevenue, street, city, state, zipcode, country, description } = req.body;

    // Validate required fields
    if (!company || !firstName || !lastName) {
      return res.status(400).json({
        message: "Company, First Name, and Last Name are required fields",
      });
    }

    // Auto-fill leadOwner from logged-in user if not provided
    const finalLeadOwner = req.user.id || "Unknown";

    const lead = new Lead({
      company,
      firstName,
      lastName,
      email,
      leadOwner: finalLeadOwner,
      phone, 
      leadSource,
      Industry, 
      leadStatus, 
      noOfEmployees, 
      annualRevenue, 
      street, 
      city, 
      state, 
      zipcode, 
      country, 
      description
    });
    const savedLead = await lead.save();
    res.status(201).json({ message: "Lead created successfully", lead: savedLead._id });
  } catch (error) {
    res.status(400).json({ message: "Failed to create lead", error: error.message });
  }
});

// ✅ Get All Leads (secured by leadOwner)
router.get("/", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in headers" });
    }


    const safeLeads = await Lead.find({ leadOwner: userId });
// for later use
    // let leads;
    // if (userRole === "super_admin") {
    //   // Super admin can view all leads
    //   leads = await Lead.find({});
    // } else {
    //   // Regular user → only their leads
    //   leads = await Lead.find({ leadOwner: userId });
    // }

    // // ✅ Double-check: only return leads actually owned by this user (safety filter)
    // const safeLeads =
    //   userRole === "super_admin"
    //     ? leads
    //     : leads.filter((lead) => String(lead.leadOwner) === String(userId));
    // console.log(safeLeads);
    res.status(200).json(safeLeads);
  } catch (error) {
    console.error("❌ Error fetching leads:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch leads", error: error.message });
  }
});


// ✅ Filter Leads (restricted by owner too)
router.get("/filter", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    const { company, email, phone, name, status } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in headers" });
    }

    // Start with owner restriction
    const filter = userRole === "super_admin" ? {} : { leadOwner: userId };

    // Add filters dynamically (AND condition)
    if (company) filter.company = { $regex: company, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };
    if (phone) filter.phone = { $regex: phone, $options: "i" };
    if (status) filter.leadStatus = { $regex: status, $options: "i" };
    if (name) {
      // Combine OR for name with the rest of AND filters
      filter.$or = [
        { firstName: { $regex: name, $options: "i" } },
        { lastName: { $regex: name, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter);
    safeLeads = leads.filter((lead) => String(lead.leadOwner) === String(userId));
// for future use
    // Extra protection — only leads belonging to this user
    // const safeLeads =
    //   userRole === "super_admin"
    //     ? leads
    //     : leads.filter((lead) => String(lead.leadOwner) === String(userId));

    // if (!safeLeads.length) {
    //   return res.status(404).json({ message: "No leads found for given filters" });
    // }

    res.status(200).json(safeLeads);
  } catch (error) {
    console.error("❌ Error filtering leads:", error);
    res.status(500).json({ message: "Error filtering leads", error: error.message });
  }
});

// ✅ Get Lead by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId =  req.headers["x-user-id"];
    const role =  req.headers["x-user-role"];

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (role !== "super_admin" && lead.leadOwner !== userId) {
      return res.status(403).json({ message: "Access denied to this lead" });
    }

    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lead", error: error.message });
  }
});

// ✅ Update Lead
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId =  req.headers["x-user-id"];
    const role =  req.headers["x-user-role"];

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (role !== "super_admin" && lead.leadOwner !== userId) {
      return res.status(403).json({ message: "You are not allowed to update this lead" });
    }

    const {  fullName , lastName, leadOwner,phone,leadSource,Industry, leadStatus, noOfEmployees, annualRevenue, street, city, state, zipcode, country, description } = req.body;

    if (fullName) lead.fullName = fullName;
    if (lastName) lead.lastName = lastName;
    if (leadOwner) lead.leadOwner = leadOwner;
    if (leadSource) lead.leadSource = leadSource;
    if (phone) lead.phone = phone;
    if (Industry) lead.Industry = Industry;
    if (leadStatus) lead.leadStatus = leadStatus;
    if (noOfEmployees) lead.noOfEmployees = noOfEmployees;
    if (annualRevenue) lead.annualRevenue = annualRevenue;
    if (country) lead.country = country;
    if (state) lead.state = state;
    if (street) lead.street = street;
    if (city) lead.city = city;
    if (zipcode) lead.zipcode = zipcode;
    if (description) lead.description = description;
    await lead.save();

    res.status(200).json({ message: "Lead updated successfully", id });
  } catch (error) {
    res.status(400).json({ message: "Failed to update lead", error: error.message });
  }
});

// ✅ Delete Lead
router.delete("/:id", async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete lead", error: error.message });
  }
});

module.exports = router;
