const User = require("../models/User");
const InstituteCredential = require("../models/InstituteCredential");
const OtpChallenge = require("../models/OtpChallenge");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");
const generateRefreshToken = require("../utils/generateRefreshToken");
const { sendLoginAlertSms, sendSignupSuccessSms, sendOtpSms } = require("../services/dosnetSms");
const { sendSignupSuccessWhatsApp } = require("../services/whatsappService");
const { sendAdminLoginOtpEmail } = require("../utils/emailService");
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

    const { identifier, email, password, isAdminLogin: reqIsAdminLogin, adminLogin: reqAdminLogin } = req.body;
    const isAdminLogin = reqIsAdminLogin === true || reqAdminLogin === true;

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

    // --- DYNAMIC INSTITUTION CREDENTIALS AUTHENTICATION START ---
    const dynamicInst = await InstituteCredential.findOne({
      username: rawIdentifier.toLowerCase()
    });

    if (dynamicInst) {
      const isPassMatch = await bcrypt.compare(password, dynamicInst.password);
      if (!isPassMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      let dbUser = await User.findOne({ email: dynamicInst.username.toLowerCase() });
      if (!dbUser) {
        dbUser = await User.create({
          name: dynamicInst.institution,
          email: dynamicInst.username.toLowerCase(),
          username: dynamicInst.username.toLowerCase(),
          password: dynamicInst.password,
          phone: dynamicInst.phone || "",
          phoneVerified: true,
          status: "approved",
          isAdmin: false,
          role: "instituteadmin",
          institution: dynamicInst.institution,
        });
      } else {
        let updated = false;
        if (dbUser.password !== dynamicInst.password) { dbUser.password = dynamicInst.password; updated = true; }
        if (dbUser.status !== "approved") { dbUser.status = "approved"; updated = true; }
        if (dbUser.role !== "instituteadmin") { dbUser.role = "instituteadmin"; updated = true; }
        if (dbUser.isAdmin !== false) { dbUser.isAdmin = false; updated = true; }
        if (dbUser.name !== dynamicInst.institution) { dbUser.name = dynamicInst.institution; updated = true; }
        if (dbUser.institution !== dynamicInst.institution) { dbUser.institution = dynamicInst.institution; updated = true; }
        if (dynamicInst.phone && !dbUser.phone) { dbUser.phone = dynamicInst.phone; updated = true; }
        if (updated) await dbUser.save();
      }

      const adminPhone = dynamicInst.phone || dbUser.phone;
      if (isAdminLogin) {
        return await initiateAdminLoginOtp(res, dbUser, adminPhone);
      }
      const token = generateToken(dbUser._id);
      const refreshToken = generateRefreshToken(dbUser._id);
      return res.json({
        _id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        username: dbUser.username,
        status: dbUser.status,
        role: dbUser.role,
        isAdmin: dbUser.isAdmin,
        institution: dbUser.institution,
        allowedModules: dbUser.allowedModules || [],
        token,
        refreshToken,
      });
    }
    // --- DYNAMIC INSTITUTION CREDENTIALS AUTHENTICATION END ---

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
              isAdmin: false,
              role: "instituteadmin",
              institution: staticInst.name,
            });
          } else {
            let updated = false;
            if (user.status !== "approved") { user.status = "approved"; updated = true; }
            if (user.role !== "instituteadmin") { user.role = "instituteadmin"; updated = true; }
            if (user.isAdmin !== false) { user.isAdmin = false; updated = true; }
            if (updated) await user.save();
          }
          if (isAdminLogin) {
            return await initiateAdminLoginOtp(res, user, user.phone);
          }
          const token = generateToken(user._id);
          const refreshToken = generateRefreshToken(user._id);
          return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            status: user.status,
            role: user.role,
            isAdmin: user.isAdmin,
            institution: user.institution,
            allowedModules: user.allowedModules || [],
            token,
            refreshToken,
          });
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

    // Require OTP only when logging in via Admin / Institution Admin portals
    const isAdminOrInstitute = user.role === 'admin' || user.isAdmin === true || user.role === 'instituteadmin';
    if (isAdminLogin && isAdminOrInstitute) {
      return await initiateAdminLoginOtp(res, user, user.phone);
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
      name: user.name,
      email: user.email,
      username: user.username,
      status: user.status,
      role: user.role,
      isAdmin: user.isAdmin,
      institution: user.institution,
      allowedModules: user.allowedModules || [],
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

/**
 * Helper to initiate OTP sending for Admin & Institute Admin logins
 */
async function initiateAdminLoginOtp(res, user, rawPhone) {
  const phone = rawPhone ? String(rawPhone).trim() : "";
  if (!phone) {
    // If no phone number is configured for this admin account, give option to input phone
    const tempToken = jwt.sign(
      { typ: "admin_login_otp", sub: String(user._id), needsPhone: true },
      JWT_SECRET,
      { expiresIn: "10m" }
    );
    return res.json({
      requiresOtp: true,
      needsPhone: true,
      tempToken,
      message: "No phone number is registered for this account. Please enter your mobile number to receive your login OTP.",
    });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  const lookupKey = `admin_login:${user._id}`;

  await OtpChallenge.deleteMany({ lookupKey });
  await OtpChallenge.create({
    lookupKey,
    codeHash,
    userId: user._id,
    purpose: "admin_login",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    verifyFailCount: 0,
    resendCount: 0,
  });

  // Send OTP via SMS
  try {
    await sendOtpSms(phone, code);
  } catch (smsErr) {
    console.error("[admin_login_otp] SMS send error:", smsErr.message);
  }

  // Send OTP via Email (always attempt if user has an email)
  let emailMasked = null;
  if (user.email) {
    try {
      await sendAdminLoginOtpEmail(user.email, user.name || "Admin", code);
      const [localPart, domain] = user.email.split("@");
      const maskedLocal = localPart.length <= 3
        ? localPart[0] + "*".repeat(localPart.length - 1)
        : localPart.slice(0, 2) + "*".repeat(localPart.length - 2);
      emailMasked = `${maskedLocal}@${domain}`;
    } catch (emailErr) {
      console.error("[admin_login_otp] Email send error:", emailErr.message);
    }
  }

  const tempToken = jwt.sign(
    { typ: "admin_login_otp", sub: String(user._id), phone },
    JWT_SECRET,
    { expiresIn: "10m" }
  );

  const normalized = normalizePhone(phone);
  const maskedPhone =
    normalized.length >= 10
      ? `+${normalized.slice(0, 2)} ${normalized.slice(2, 4)}******${normalized.slice(-4)}`
      : `******${phone.slice(-4)}`;

  const deliveryInfo = emailMasked
    ? `OTP sent via SMS to ${maskedPhone} and email to ${emailMasked}`
    : `Verification code sent to registered number ${maskedPhone}`;

  const payload = {
    requiresOtp: true,
    tempToken,
    phoneMasked: maskedPhone,
    emailMasked,
    message: deliveryInfo,
  };

  return res.json(payload);
}

/**
 * Verify OTP entered by Admin / Institute Admin
 */
const verifyAdminLoginOtp = async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ message: "Temporary token and OTP code are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Verification session expired. Please sign in again." });
    }

    if (decoded.typ !== "admin_login_otp" || !decoded.sub) {
      return res.status(400).json({ message: "Invalid verification session" });
    }

    const userId = decoded.sub;
    const lookupKey = `admin_login:${userId}`;
    const challenge = await OtpChallenge.findOne({ lookupKey }).sort({ createdAt: -1 });

    if (!challenge || challenge.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired or not found. Please request a new code." });
    }

    const isMatch = await bcrypt.compare(String(code).trim(), challenge.codeHash);
    if (!isMatch) {
      challenge.verifyFailCount = (challenge.verifyFailCount || 0) + 1;
      await challenge.save();
      if (challenge.verifyFailCount >= 5) {
        await OtpChallenge.deleteMany({ lookupKey });
        return res.status(400).json({ message: "Too many failed attempts. Please login again." });
      }
      return res.status(400).json({ message: "Incorrect OTP code. Please try again." });
    }

    // OTP verified successfully
    await OtpChallenge.deleteMany({ lookupKey });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    // Save phone if provided through needsPhone flow
    if (decoded.phone && !user.phone) {
      user.phone = decoded.phone;
      await user.save();
      if (user.role === 'instituteadmin') {
        await InstituteCredential.findOneAndUpdate(
          { username: user.email },
          { phone: decoded.phone }
        );
      }
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      status: user.status,
      role: user.role,
      isAdmin: user.isAdmin,
      institution: user.institution,
      allowedModules: user.allowedModules || [],
      token,
      refreshToken,
    });
  } catch (err) {
    console.error("verifyAdminLoginOtp error:", err);
    return res.status(500).json({ message: "Failed to verify OTP", error: err.message });
  }
};

/**
 * Resend OTP for Admin Login
 */
const resendAdminLoginOtp = async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      return res.status(400).json({ message: "Temporary token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Verification session expired. Please sign in again." });
    }

    if (decoded.typ !== "admin_login_otp" || !decoded.sub) {
      return res.status(400).json({ message: "Invalid verification session" });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const phone = decoded.phone || user.phone;
    if (!phone) {
      return res.status(400).json({ message: "No phone number available for OTP" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const lookupKey = `admin_login:${user._id}`;

    await OtpChallenge.deleteMany({ lookupKey });
    await OtpChallenge.create({
      lookupKey,
      codeHash,
      userId: user._id,
      purpose: "admin_login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verifyFailCount: 0,
      resendCount: 1,
    });

    try {
      await sendOtpSms(phone, code);
    } catch (smsErr) {
      console.error("[admin_login_otp_resend] SMS send error:", smsErr.message);
    }

    // Resend via Email too
    let emailMasked = null;
    if (user.email) {
      try {
        await sendAdminLoginOtpEmail(user.email, user.name || "Admin", code);
        const [localPart, domain] = user.email.split("@");
        const maskedLocal = localPart.length <= 3
          ? localPart[0] + "*".repeat(localPart.length - 1)
          : localPart.slice(0, 2) + "*".repeat(localPart.length - 2);
        emailMasked = `${maskedLocal}@${domain}`;
      } catch (emailErr) {
        console.error("[admin_login_otp_resend] Email send error:", emailErr.message);
      }
    }

    const payload = {
      success: true,
      message: emailMasked
        ? `New OTP sent to phone and ${emailMasked}`
        : "New OTP sent successfully to your phone.",
      emailMasked,
    };

    return res.json(payload);
  } catch (err) {
    console.error("resendAdminLoginOtp error:", err);
    return res.status(500).json({ message: "Failed to resend OTP", error: err.message });
  }
};

/**
 * Submit Phone Number for Admin Login when account doesn't have phone configured
 */
const submitAdminPhoneForOtp = async (req, res) => {
  try {
    const { tempToken, phone } = req.body;
    if (!tempToken || !phone) {
      return res.status(400).json({ message: "Token and phone number are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    if (decoded.typ !== "admin_login_otp" || !decoded.sub) {
      return res.status(400).json({ message: "Invalid session" });
    }

    const cleanPhone = String(phone).trim();
    if (cleanPhone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const lookupKey = `admin_login:${user._id}`;

    await OtpChallenge.deleteMany({ lookupKey });
    await OtpChallenge.create({
      lookupKey,
      codeHash,
      userId: user._id,
      purpose: "admin_login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verifyFailCount: 0,
      resendCount: 0,
    });

    try {
      await sendOtpSms(cleanPhone, code);
    } catch (smsErr) {
      console.error("[admin_send_phone_otp] SMS send error:", smsErr.message);
    }

    // Also send email OTP if user has email
    let emailMasked = null;
    if (user.email) {
      try {
        await sendAdminLoginOtpEmail(user.email, user.name || "Admin", code);
        const [localPart, domain] = user.email.split("@");
        const maskedLocal = localPart.length <= 3
          ? localPart[0] + "*".repeat(localPart.length - 1)
          : localPart.slice(0, 2) + "*".repeat(localPart.length - 2);
        emailMasked = `${maskedLocal}@${domain}`;
      } catch (emailErr) {
        console.error("[admin_send_phone_otp] Email send error:", emailErr.message);
      }
    }

    const newTempToken = jwt.sign(
      { typ: "admin_login_otp", sub: String(user._id), phone: cleanPhone, needsPhone: true },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    const normalized = normalizePhone(cleanPhone);
    const maskedPhone = `+${normalized.slice(0, 2)} ${normalized.slice(2, 4)}******${normalized.slice(-4)}`;

    const payload = {
      requiresOtp: true,
      tempToken: newTempToken,
      phoneMasked: maskedPhone,
      emailMasked,
      message: emailMasked ? `OTP sent to ${maskedPhone} and ${emailMasked}` : `OTP sent to ${maskedPhone}`,
    };

    return res.json(payload);
  } catch (err) {
    console.error("submitAdminPhoneForOtp error:", err);
    return res.status(500).json({ message: "Failed to send OTP", error: err.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyAdminLoginOtp,
  resendAdminLoginOtp,
  submitAdminPhoneForOtp,
};
