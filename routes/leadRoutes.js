const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const roleAuth = require("../middleware/roleAuth");
const axios = require("axios");
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:4000";

// ✅ Helper function with debugging removed
async function callAuthService(endpoint, method = "GET", body = {}, req) {
  try {
    const token = req.headers["authorization"];
    const response = await axios({
      url: `${API_GATEWAY_URL}${endpoint}`,
      method,
      data: body,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Auth-Service call failed:", error.response?.data || error.message);
    throw error;
  }
}

// ✅ Create Lead
router.post("/create", async (req, res) => {
  try {
    const { company, firstName, lastName, email, leadOwner,phone,Industry, leadStatus,leadSource, noOfEmployees, annualRevenue, street, city, state, zipcode, country, description } = req.body;

    const userId = req.headers["x-user-id"];

    if (!company || !firstName || !lastName) {
      return res.status(400).json({
        message: "Company, First Name, and Last Name are required fields",
      });
    }

    const finalLeadOwner = userId || "Unknown";

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
      description,
    });

    const savedLead = await lead.save();
    res.status(201).json({ message: "Lead created successfully", lead: savedLead._id });
  } catch (error) {
    res.status(400).json({ message: "Failed to create lead", error: error.message });
  }
});

// ✅ Get All Leads
router.get("/", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in headers" });
    }

    // ✅ Get all leads or only those owned by the user
    const leads =userRole === "super_admin" ? await Lead.find({}) : await Lead.find({ leadOwner: userId });
    const ownerCache = {};

    // ✅ Fetch owner details only once per unique ID
    for (const lead of leads) {
      const ownerId = lead.leadOwner;

      if (!ownerCache[ownerId]) {
        try {
          const data = await callAuthService(
            `/identity/api/auth/user/${ownerId}`,
            "GET",
            {},
            req
          );

          ownerCache[ownerId] = data.fullName || data.full_name || "Unknown User";
        } catch {
          ownerCache[ownerId] = "Unknown User";
        }
      }
    }

    // ✅ Rewrite "leadOwner" with name from cache
    const transformedLeads = leads.map((lead) => ({
      ...lead._doc,
      leadOwner: ownerCache[lead.leadOwner], 
    }));

    console.log(transformedLeads);
    return res.status(200).json(transformedLeads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ message: "Failed to fetch leads", error: error.message });
  }
});

// ✅ Filter Leads
router.get("/filter", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    const { company, email, phone, name, status } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in headers" });
    }

    // ✅ If user is super_admin → see all leads, else only their own
    const baseFilter = userRole === "super_admin" ? {} : { leadOwner: userId };

    // ✅ Build dynamic search conditions
    const orConditions = [];
    if (company) orConditions.push({ company: { $regex: company, $options: "i" } });
    if (email) orConditions.push({ email: { $regex: email, $options: "i" } });
    if (phone) orConditions.push({ phone: { $regex: phone, $options: "i" } });
    if (status) orConditions.push({ leadStatus: { $regex: status, $options: "i" } });
    if (name) {
      const cleaned = String(name).trim();
      orConditions.push(
        { firstName: { $regex: cleaned, $options: "i" } },
        { lastName: { $regex: cleaned, $options: "i" } }
      );
    }

    const finalFilter =
      orConditions.length > 0 ? { ...baseFilter, $or: orConditions } : baseFilter;

    const leads = await Lead.find(finalFilter);

    // ✅ Get unique owner IDs
    const uniqueOwnerIds = [...new Set(leads.map((lead) => lead.leadOwner))];
    const ownerNameMap = {};

    // ✅ Fetch each owner name once
    for (const id of uniqueOwnerIds) {
      try {
        const userData = await callAuthService(
          `/identity/api/auth/user/${id}`,
          "GET",
          {},
          req
        );

        // ✅ Only extract name (no other fields)
        ownerNameMap[id] =
          userData.fullName || userData.full_name || "Unknown User";
      } catch (err) {
        ownerNameMap[id] = "Unknown User";
      }
    }

    // ✅ Replace leadOwner with name
    const formattedLeads = leads.map((lead) => ({
      ...lead._doc,
      leadOwner: ownerNameMap[lead.leadOwner] || "Unknown User",
    }));

    return res.status(200).json(formattedLeads);
  } catch (error) {
    console.error("❌ Error filtering leads:", error);
    return res
      .status(500)
      .json({ message: "Error filtering leads", error: error.message });
  }
});

// ✅ Get Lead by ID (with owner details)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];
    const role = req.headers["x-user-role"];

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (role !== "super_admin" && lead.leadOwner !== userId) {
      return res.status(403).json({ message: "Access denied to this lead" });
    }

    let leadOwnerDetails = {
      id: lead.leadOwner,
      name: "Unknown User",
      email: "",
      role: "",
    };

    try {
      const userData = await callAuthService(`/identity/api/auth/user/${lead.leadOwner}`, "GET", {}, req);
      leadOwnerDetails = {
        id: userData.userId,
        name: userData.fullName || userData.full_name || "Unknown User",
        email: userData.email || "",
        role: userData.role || "",
      };
    } catch (err) {}

    res.status(200).json({ ...lead._doc, leadOwnerDetails });
  } catch (error) {
    res.status(500).json({ message: "Error fetching lead", error: error.message });
  }
});

// ✅ Update Lead
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];
    const role = req.headers["x-user-role"];

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (role !== "super_admin" && lead.leadOwner !== userId) {
      return res.status(403).json({ message: "You are not allowed to update this lead" });
    }

    Object.assign(lead, req.body);
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
