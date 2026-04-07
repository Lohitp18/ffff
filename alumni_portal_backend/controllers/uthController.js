const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");
const generateRefreshToken = require("../utils/generateRefreshToken");
const { sendLoginAlertSms, sendSignupSuccessSms } = require("../services/dosnetSms");
const { sendSignupSuccessWhatsApp } = require("../services/whatsappService");
const { normalizePhone } = require("../utils/phone");
const messageTemplates = require("../utils/messageTemplates");
const fs = require("fs");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// =============================
// ✅ User Registration
// =============================
const registerUser = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      phone,
      dob,
      institution,
      program,
      course,
      specialization,
      year,
      password,
      favTeacher,
      socialMedia,
      currentCompany,
      previousCompany,
      totalExperience,
      location,
      signupOtpToken,
    } = req.body;

    if (!name || !username || !email || !phone || !institution || !course || !year || !password) {
      return res.status(400).json({ message: "All basic fields are required" });
    }

    if (!signupOtpToken) {
      return res.status(400).json({
        message: "Please verify your phone with the 6-digit OTP before signing up.",
      });
    }

    try {
      const decoded = jwt.verify(signupOtpToken, JWT_SECRET);
      if (decoded.typ !== "signup_otp") {
        return res.status(400).json({ message: "Invalid phone verification. Request a new code." });
      }
      if (normalizePhone(decoded.phone) !== normalizePhone(phone)) {
        return res.status(400).json({
          message: "Phone verification does not match the phone number on this form.",
        });
      }
    } catch {
      return res.status(400).json({ message: "Phone verification expired. Request a new SMS code." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const existingByUsername = await User.findOne({ username: normalizedUsername });
    if (existingByUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const existingByEmail = await User.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Parse DOB
    let parsedDob = null;
    if (dob) {
      parsedDob = new Date(dob);

      if (isNaN(parsedDob.getTime())) {
        const parts = dob.split("-");
        if (parts.length === 3) {
          parsedDob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      if (isNaN(parsedDob.getTime())) {
        parsedDob = null;
      }
    }

    const user = await User.create({
      name,
      username: normalizedUsername,
      email: normalizedEmail,
      phone,
      dob: parsedDob,
      institution,
      program,
      course,
      specialization,
      year,
      password: hashedPassword,
      favouriteTeacher: favTeacher || "",
      socialMedia: socialMedia || "",
      phoneVerified: true,
      status: "pending",
      location: location || "",
      privateInfo: {
        currentCompany: currentCompany || "",
        totalExperience: Number(totalExperience) || 0,
        currentPosition: "",
        previousCompanies: [
          {
            company: previousCompany || "",
            position: "",
          },
        ],
      },
    });

    if (phone && String(phone).replace(/\D/g, "").length >= 10) {
      (async () => {
        try {
          await sendSignupSuccessSms(phone, name);
        } catch (error) {
          console.error("[signup_success] SMS unexpected error:", error.message || error);
        }
        try {
          await sendSignupSuccessWhatsApp(phone, name);
        } catch (error) {
          console.error("[signup_success] WhatsApp unexpected error:", error.message || error);
        }
      })();
    }

    res.status(201).json({
      _id: user._id,
      email: user.email,
      status: user.status,
      message: messageTemplates.signupSuccess.sms(name, messageTemplates.portalUrl()),
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// =============================
// ✅ User Login
// =============================
const loginUser = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { identifier, email, password } = req.body;

    const rawIdentifier = (identifier || email || "").trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ message: "Email or username and password are required" });
    }

    const isEmail = rawIdentifier.includes("@");
    const trimmedEmail = isEmail ? rawIdentifier.toLowerCase() : null;
    const normalizedUsername = !isEmail ? rawIdentifier.toLowerCase() : null;

    let user = null;

    if (isEmail) {
      user = await User.findOne({ email: trimmedEmail });
    } else {
      user = await User.findOne({ username: normalizedUsername });
    }

    // --- STATIC INSTITUTION AUTHENTICATION START ---
    const hierarchyPath = path.join(__dirname, '..', 'data', 'enrollmentHierarchy.json');
    if (fs.existsSync(hierarchyPath)) {
      const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, "utf8"));

      const staticInst =
        isEmail &&
        hierarchyData.institutions?.find(
          (inst) => inst.email?.toLowerCase() === trimmedEmail
        );

      if (staticInst) {
        if (password === staticInst.password) {
          if (!user) {
            const hashedPassword = await bcrypt.hash(staticInst.password, 10);
            user = await User.create({
              name: staticInst.name,
              email: trimmedEmail,
              password: hashedPassword,
              phoneVerified: true,
              status: "approved",
              isAdmin: true,
              role: "admin",
              institution: staticInst.name,
            });
          } else {
            let updated = false;
            if (user.status !== "approved") { user.status = "approved"; updated = true; }
            if (user.role !== "admin") { user.role = "admin"; updated = true; }
            if (updated) await user.save();
          }
          // Continue to token generation
        } else {
          return res.status(400).json({ message: "Invalid email or password" });
        }
      }
    }
    // --- STATIC INSTITUTION AUTHENTICATION END ---
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.phoneVerified === false) {
      return res.status(403).json({
        message: "Please complete phone verification before signing in.",
      });
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        message: `Account is ${user.status}. Please wait for admin approval.`,
      });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    if (process.env.SEND_LOGIN_ALERT_SMS === "true" && user.phone) {
      try {
        await sendLoginAlertSms(user.phone);
      } catch (error) {
        console.error("[login_alert] SMS unexpected error:", error.message || error);
      }
    }

    res.json({
      _id: user._id,
      email: user.email,
      username: user.username,
      status: user.status,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { registerUser, loginUser };
