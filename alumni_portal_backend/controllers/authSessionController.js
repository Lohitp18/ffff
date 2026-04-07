const jwt = require("jsonwebtoken");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const generateRefreshToken = require("../utils/generateRefreshToken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * GET /api/auth/verify-token
 * Requires Bearer token. Returns { valid, user } with password stripped.
 */
exports.verifyToken = async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ valid: false, message: "Not authenticated" });
    }
    const safe = user.toObject ? user.toObject() : { ...user };
    delete safe.password;
    return res.json({
      valid: true,
      user: safe,
    });
  } catch (err) {
    console.error("verifyToken:", err);
    return res.status(500).json({ valid: false, message: "Server error" });
  }
};

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    if (decoded.typ !== "refresh" || !decoded.id) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const token = generateToken(user._id);
    const newRefresh = generateRefreshToken(user._id);

    return res.json({
      token,
      refreshToken: newRefresh,
      _id: user._id,
      email: user.email,
      username: user.username,
      status: user.status,
    });
  } catch (err) {
    console.error("refreshAccessToken:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
