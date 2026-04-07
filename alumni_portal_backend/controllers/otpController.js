const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpChallenge = require("../models/OtpChallenge");
const { normalizePhone } = require("../utils/phone");
const { findUserByIdentifier } = require("../utils/userLookup");
const { sendOtpSms, sendForgotPasswordOtpSms } = require("../services/dosnetSms");
const { sendWhatsAppOtp, sendForgotPasswordOtpWhatsApp } = require("../services/whatsappService");
const { sendPasswordResetOtpEmail } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const OTP_PURPOSES = {
  SIGNUP: "signup",
  PASSWORD_RESET: "password_reset",
};

const OTP_LEN = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_FAILS = 5;
const MAX_RESENDS = 13;

function randomSixDigit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function jwtForSignup(phone) {
  return jwt.sign(
    { typ: "signup_otp", phone: normalizePhone(phone) },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function jwtForPasswordReset(userId) {
  return jwt.sign(
    { typ: "password_reset_otp", sub: String(userId) },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

async function createChallenge(lookupKey, purpose, userId, code) {
  const codeHash = await bcrypt.hash(code, 10);
  const prev = await OtpChallenge.findOne({ lookupKey }).sort({ createdAt: -1 });
  let resendCount = 0;
  if (prev && prev.expiresAt > new Date()) {
    if (prev.resendCount >= MAX_RESENDS) {
      const err = new Error("RESEND_LIMIT");
      err.status = 429;
      throw err;
    }
    resendCount = prev.resendCount + 1;
  }
  await OtpChallenge.deleteMany({ lookupKey });
  await OtpChallenge.create({
    lookupKey,
    codeHash,
    userId: userId || null,
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    resendCount,
    verifyFailCount: 0,
  });
}

exports.sendOtp = async (req, res) => {
  try {
    const { purpose, phone, identifier } = req.body;

    if (purpose === OTP_PURPOSES.SIGNUP) {
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      const normalized = normalizePhone(phone);
      if (normalized.length < 12) {
        return res.status(400).json({ message: "Enter a valid phone number" });
      }
      const lookupKey = `${OTP_PURPOSES.SIGNUP}:${normalized}`;
      const code = randomSixDigit();
      try {
        await createChallenge(lookupKey, OTP_PURPOSES.SIGNUP, null, code);
      } catch (e) {
        if (e.message === "RESEND_LIMIT") {
          return res.status(429).json({
            message: `Maximum ${MAX_RESENDS} OTP sends reached. Wait 10 minutes or try later.`,
          });
        }
        throw e;
      }

      const sms = await sendOtpSms(phone, code);
      const wa = await sendWhatsAppOtp(phone, code, "User");
      if (!sms.ok && !sms.skipped && !wa.ok && !wa.skipped) {
        return res.status(502).json({ message: "Could not send OTP. Try again later." });
      }
      const payload = { message: "Verification code sent to your phone and WhatsApp (if configured)." };
      if (process.env.EXPOSE_DEV_OTP === "true") {
        payload.devOtp = code;
      }
      return res.json(payload);
    }

    if (purpose === OTP_PURPOSES.PASSWORD_RESET) {
      const raw = (identifier || "").trim();
      if (!raw) {
        return res.status(400).json({ message: "Email, phone, or username is required" });
      }

      const user = await findUserByIdentifier(raw);
      if (!user) {
        return res.json({
          message: "If an account exists, a verification code was sent.",
        });
      }

      const code = randomSixDigit();
      const isEmail = raw.includes("@");

      if (isEmail) {
        const lookupKey = `password_reset_email:${user._id}`;
        try {
          await createChallenge(lookupKey, OTP_PURPOSES.PASSWORD_RESET, user._id, code);
        } catch (e) {
          if (e.message === "RESEND_LIMIT") {
            return res.status(429).json({
              message: `Maximum ${MAX_RESENDS} OTP sends reached. Wait before retrying.`,
            });
          }
          throw e;
        }
        const emailResult = await sendPasswordResetOtpEmail(user.email, user.name, code);
        // If email sending fails, still return generic response to avoid account enumeration.
        const payload = {
          message: "If an account exists, a verification code was sent to your email.",
          channel: "email",
        };
        if (process.env.EXPOSE_DEV_OTP === "true") {
          payload.devOtp = code;
        }
        return res.json(payload);
      }

      if (!user.phone) {
        return res.status(400).json({
          message: "No phone number on file for this account. Use your registered email to reset.",
        });
      }

      const normalized = normalizePhone(user.phone);
      if (normalized.length < 12) {
        return res.status(400).json({ message: "Invalid phone on file." });
      }

      const lookupKey = `${OTP_PURPOSES.PASSWORD_RESET}:${normalized}`;
      try {
        await createChallenge(lookupKey, OTP_PURPOSES.PASSWORD_RESET, user._id, code);
      } catch (e) {
        if (e.message === "RESEND_LIMIT") {
          return res.status(429).json({
            message: `Maximum ${MAX_RESENDS} OTP sends reached. Wait before retrying.`,
          });
        }
        throw e;
      }

      const sms = await sendForgotPasswordOtpSms(user.phone, code);
      const wa = await sendForgotPasswordOtpWhatsApp(user.phone, code, user.name || "User");
      if (!sms.ok && !sms.skipped && !wa.ok && !wa.skipped) {
        return res.status(502).json({ message: "Could not send OTP. Try again later." });
      }
      const payload = {
        message: "If an account exists, a verification code was sent to your phone.",
        channel: "sms",
      };
      if (process.env.EXPOSE_DEV_OTP === "true") {
        payload.devOtp = code;
      }
      return res.json(payload);
    }

    return res.status(400).json({ message: "Invalid purpose" });
  } catch (err) {
    console.error("sendOtp:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Alias for POST /forgot-password */
exports.forgotPassword = async (req, res) => {
  req.body = { ...req.body, purpose: OTP_PURPOSES.PASSWORD_RESET };
  return exports.sendOtp(req, res);
};

exports.verifyOtp = async (req, res) => {
  try {
    const { purpose, phone, identifier, code } = req.body;

    if (!code || String(code).length !== OTP_LEN) {
      return res.status(400).json({ message: `Enter the ${OTP_LEN}-digit code` });
    }

    if (purpose === OTP_PURPOSES.SIGNUP) {
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      const normalized = normalizePhone(phone);
      const lookupKey = `${OTP_PURPOSES.SIGNUP}:${normalized}`;
      const challenge = await OtpChallenge.findOne({ lookupKey }).sort({ createdAt: -1 });
      if (!challenge || challenge.expiresAt < new Date()) {
        return res.status(400).json({ message: "Code expired or not found. Request a new code." });
      }
      const match = await bcrypt.compare(String(code), challenge.codeHash);
      if (!match) {
        challenge.verifyFailCount = (challenge.verifyFailCount || 0) + 1;
        await challenge.save();
        if (challenge.verifyFailCount >= MAX_VERIFY_FAILS) {
          await OtpChallenge.deleteMany({ lookupKey });
          return res.status(400).json({
            message: "Too many incorrect attempts. Request a new code.",
          });
        }
        return res.status(400).json({ message: "Incorrect code" });
      }
      await OtpChallenge.deleteMany({ lookupKey });
      const signupOtpToken = jwtForSignup(phone);
      return res.json({ signupOtpToken, message: "Phone verified" });
    }

    if (purpose === OTP_PURPOSES.PASSWORD_RESET) {
      const raw = (identifier || "").trim();
      if (!raw) {
        return res.status(400).json({ message: "Email, phone, or username is required" });
      }

      const user = await findUserByIdentifier(raw);
      if (!user) {
        return res.status(400).json({ message: "Invalid code or account" });
      }

      const isEmail = raw.includes("@");
      let lookupKey;
      if (isEmail) {
        lookupKey = `password_reset_email:${user._id}`;
      } else {
        if (!user.phone) {
          return res.status(400).json({ message: "Invalid code or account" });
        }
        const normalized = normalizePhone(user.phone);
        lookupKey = `${OTP_PURPOSES.PASSWORD_RESET}:${normalized}`;
      }

      const challenge = await OtpChallenge.findOne({ lookupKey }).sort({ createdAt: -1 });
      if (!challenge || challenge.expiresAt < new Date()) {
        return res.status(400).json({ message: "Code expired or not found. Request a new code." });
      }
      if (String(challenge.userId) !== String(user._id)) {
        return res.status(400).json({ message: "Invalid code or account" });
      }

      const match = await bcrypt.compare(String(code), challenge.codeHash);
      if (!match) {
        challenge.verifyFailCount = (challenge.verifyFailCount || 0) + 1;
        await challenge.save();
        if (challenge.verifyFailCount >= MAX_VERIFY_FAILS) {
          await OtpChallenge.deleteMany({ lookupKey });
          return res.status(400).json({
            message: "Too many incorrect attempts. Request a new code.",
          });
        }
        return res.status(400).json({ message: "Incorrect code" });
      }

      await OtpChallenge.deleteMany({ lookupKey });
      const resetOtpToken = jwtForPasswordReset(user._id);
      return res.json({ resetOtpToken, message: "Verified" });
    }

    return res.status(400).json({ message: "Invalid purpose" });
  } catch (err) {
    console.error("verifyOtp:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
