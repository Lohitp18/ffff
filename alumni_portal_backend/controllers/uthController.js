const Institution = require("../models/Institution");
const InstitutionCredential = require("../models/InstitutionCredential");
const AdminCredential = require("../models/AdminCredential");
const AllowedIp = require("../models/AllowedIp");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const getClientIp = require("../utils/getClientIp");
const LoginLog = require("../models/LoginLog");
const generateToken = require("../utils/generateToken");
const generateRefreshToken = require("../utils/generateRefreshToken");
const { sendLoginAlertSms, sendSignupSuccessSms } = require("../services/dosnetSms");
const { sendSignupSuccessWhatsApp } = require("../services/whatsappService");
const { normalizePhone } = require("../utils/phone");
const messageTemplates = require("../utils/messageTemplates");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// =============================
// ✅ User Registration
// =============================
const registerUser = async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    
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

    if (!user) {
      console.log("nf1")
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      console.log("nf")
      const clientIp = getClientIp(req);
      await LoginLog.create({
        email: rawIdentifier,
        ip: clientIp,
        success: false
      });
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

    const clientIp = getClientIp(req);

    await LoginLog.create({
      email: user.email,
      ip: clientIp,
      success: true
    });

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

// =============================
// ✅ Admin Login
// =============================
const adminLogin = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { identifier, email, password } = req.body;
    
    // Strict type checking for inputs
    if ((identifier !== undefined && typeof identifier !== 'string') || 
        (email !== undefined && typeof email !== 'string') || 
        (typeof password !== 'string')) {
      return res.status(400).json({ message: "Invalid input types" });
    }
    
    // 1. Get Secure Client IP
    const clientIp = getClientIp(req);
    
    const rawIdentifier = (identifier || email || "").trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ message: "Email or username and password are required" });
    }
    
    // Prevent bcrypt DOS attacks by limiting password length
    if (password.length > 100) {
      return res.status(400).json({ message: "Password is too long" });
    }

    const isEmail = rawIdentifier.includes("@");
    
    if (isEmail && !validator.isEmail(rawIdentifier)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    const trimmedEmail = isEmail ? rawIdentifier.toLowerCase() : null;
    const normalizedUsername = !isEmail ? rawIdentifier.toLowerCase() : null;

    let adminUser = null;
    if (isEmail) {
      adminUser = await AdminCredential.findOne({ email: trimmedEmail });
    } else {
      adminUser = await AdminCredential.findOne({ email: normalizedUsername });
    }

    if (!adminUser) {
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    // Check Account Lockout
    if (adminUser.lockUntil && adminUser.lockUntil > Date.now()) {
      return res.status(403).json({ message: "Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes." });
    }

    let isPasswordMatch = false;
    try {
      if (adminUser.password && typeof adminUser.password === 'string') {
        isPasswordMatch = await bcrypt.compare(password, adminUser.password);
      }
    } catch (e) {}

    if (!isPasswordMatch && password !== adminUser.password) {
      adminUser.loginAttempts = (adminUser.loginAttempts || 0) + 1;
      if (adminUser.loginAttempts >= 5) {
        adminUser.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
      }
      await adminUser.save();
      
      await LoginLog.create({
        email: rawIdentifier,
        ip: clientIp,
        success: false
      });
      
      return res.status(400).json({ message: "Invalid admin credentials" });
    }
    
    // IP Validation Logic using Secure Backend IP
    const isAllowed = await AllowedIp.findOne({ ip: clientIp, isActive: true });
    if (!isAllowed) {
      
      await LoginLog.create({
        email: rawIdentifier,
        ip: clientIp,
        success: false
      });
      
      return res.status(403).json({ message: "Login denied: IP address not authorized" });
    }

    // Reset login attempts on success
    adminUser.loginAttempts = 0;
    adminUser.lockUntil = undefined;
    await adminUser.save();

    await LoginLog.create({
      email: adminUser.email,
      ip: clientIp,
      success: true
    });

    const token = generateToken(adminUser._id);
    const refreshToken = generateRefreshToken(adminUser._id);

    res.json({
      success: true,
      _id: adminUser._id,
      email: adminUser.email,
      username: adminUser.email,
      status: "approved",
      token,
      refreshToken,
      user: {
        _id: adminUser._id,
        email: adminUser.email,
        username: adminUser.email,
        role: adminUser.role || "admin",
        isAdmin: adminUser.isAdmin !== undefined ? adminUser.isAdmin : true
      }
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// =============================
// ✅ Institution Login
// =============================
const institutionLogin = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { identifier, email, password, college } = req.body;
    const rawIdentifier = (identifier || email || "").trim();

    if (!rawIdentifier || !password || !college) {
      return res.status(400).json({ message: "Email, password, and college are required" });
    }

    const isEmail = rawIdentifier.includes("@");
    const trimmedEmail = isEmail ? rawIdentifier.toLowerCase() : rawIdentifier.toLowerCase();

    // Fetch by institutionName instead of email
    const institution = await InstitutionCredential.findOne({ institutionName: college.trim() });

    if (!institution) {
      return res.status(400).json({ message: "Invalid institution credentials" });
    }

    // Also check if the provided email matches the institution's email
    if (institution.email.toLowerCase() !== trimmedEmail) {
      return res.status(400).json({ message: "Invalid institution credentials" });
    }

    let isPasswordMatch = false;
    try {
      isPasswordMatch = await bcrypt.compare(password, institution.password);
    } catch (e) {}

    if (!isPasswordMatch && password !== institution.password) {
      const clientIp = getClientIp(req);
      await LoginLog.create({
        email: rawIdentifier,
        ip: clientIp,
        success: false
      });
      return res.status(400).json({ message: "Invalid institution credentials" });
    }

    if (institution.isActive === false) {
      return res.status(403).json({ message: "Institution account is inactive." });
    }

    const token = generateToken(institution._id);
    const refreshToken = generateRefreshToken(institution._id);

    const clientIp = getClientIp(req);

    await LoginLog.create({
      email: institution.email,
      ip: clientIp,
      success: true
    });

    res.json({
      success: true,
      _id: institution._id,
      email: institution.email,
      username: institution.institutionName,
      status: "approved",
      token,
      refreshToken,
      user: {
        _id: institution._id,
        email: institution.email,
        username: institution.institutionName,
        role: "institution",
        isAdmin: false,
        institution: institution.institutionName
      }
    });
  } catch (error) {
    console.error("Institution Login Error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { registerUser, loginUser, adminLogin, institutionLogin };
