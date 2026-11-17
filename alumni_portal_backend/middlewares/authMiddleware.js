const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const instAdminHeader = req.header("x-institution-admin");
    const institutionHeader = req.header("x-institution");
    const adminEmailHeader = req.header("x-admin-email");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (token && token !== "null" && token !== "undefined") {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded.typ !== "refresh") {
            const user = await User.findById(decoded.id).select("-password");
            if (user) {
              req.user = user;
              return next();
            }
          }
        } catch (jwtErr) {
          // If token expired or invalid, check institution admin headers fallback below
        }
      }
    }

    // Check Institution Admin headers fallback
    if (instAdminHeader === "true" && (institutionHeader || adminEmailHeader)) {
      let instUser = null;
      if (adminEmailHeader) {
        instUser = await User.findOne({ email: adminEmailHeader.toLowerCase() }).select("-password");
      }
      if (!instUser && institutionHeader) {
        instUser = await User.findOne({
          institution: new RegExp(`^${institutionHeader.trim()}$`, "i"),
          role: "instituteadmin"
        }).select("-password");
      }
      if (!instUser) {
        instUser = {
          _id: new mongoose.Types.ObjectId(),
          name: institutionHeader || "Institution Admin",
          email: adminEmailHeader || "instituteadmin@alvas.org",
          role: "instituteadmin",
          institution: institutionHeader || "",
          isAdmin: false,
        };
      }
      req.user = instUser;
      return next();
    }

    return res.status(401).json({ message: "No token, authorization denied" });
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Token is not valid" });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      req.user = null;
      return next();
    }
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.id) {
      const user = await User.findById(decoded.id).select("-password");
      req.user = user || null;
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;

