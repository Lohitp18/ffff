const express = require("express");
const rateLimit = require("express-rate-limit");
const { registerUser, loginUser, adminLogin, institutionLogin } = require("../controllers/uthController");
const {
  resetPasswordWithOtp,
  resetPasswordByEmailLegacy,
} = require("../controllers/userController");
const { sendOtp, verifyOtp, forgotPassword } = require("../controllers/otpController");
const { verifyToken, refreshAccessToken } = require("../controllers/authSessionController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
});

const strictOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_STRICT_RATE_LIMIT_MAX || 12),
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window`
  message: { message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", registerUser);
router.post("/signin", loginUser);
router.post("/login", loginUser);
router.post("/adminlogin", loginLimiter, adminLogin);
router.post("/institutionsignup", institutionLogin);

router.get("/verify-token", authMiddleware, verifyToken);
router.post("/refresh", refreshAccessToken);

router.post("/send-otp", strictOtpLimiter, sendOtp);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/forgot-password", strictOtpLimiter, forgotPassword);

router.post("/reset-password", resetPasswordWithOtp);
router.post("/reset-password-legacy", resetPasswordByEmailLegacy);

module.exports = router;
