const express = require("express");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");

// POST /create – Create a user and send invite email
router.post("/create", async (req, res) => {
  try {
    const { fullName, email, role, orgId } = req.body;
    const userName = req.headers["x-user-fullname"];

    if (!fullName || !email || !role) {
      return res.status(400).send("All fields are required");
    }

    console.log("orgId:", orgId);

    // Save user
    const user = new User({
      fullName,
      email,
      role,
      orgId,
    });
    await user.save();

    // Send invite email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const redirectLink = `${process.env.FRONTEND_URL}/crm/user/invite?email=${encodeURIComponent(
      email
    )}&orgId=${encodeURIComponent(orgId)}&sender=${encodeURIComponent(userName)}&role=${encodeURIComponent(role)}&fullName=${encodeURIComponent(fullName)}`;

    const subject = "Welcome to CRM!";
    const html = `
      <p>Hello ${fullName},</p>
      <p>${userName} is inviting you to join their organization.</p>
      <p>Click <a href="${redirectLink}" target="_blank">here</a> to view your invite.</p>
      <p>Thank you,<br/>CRM Team</p>
    `;

    await transporter.sendMail({
      from: `"${userName}" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
    });

    res.status(201).json({
      message: "User created successfully and invite sent!",
      inviteLink: redirectLink,
      user,
    });
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: "Failed to create user or send email" });
  }
});


// GET / – Fetch all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (e) {
    res.status(400).json(e);
  }
});

module.exports = router;
