const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AdminCredential = require("../models/AdminCredential");
const InstitutionCredential = require("../models/InstitutionCredential");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.typ === "refresh") {
      return res.status(401).json({ message: "Use access token, not refresh token" });
    }
    let user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      user = await AdminCredential.findById(decoded.id).select("-password");
    }
    
    if (!user) {
      user = await InstitutionCredential.findById(decoded.id).select("-password");
      if (user) {
        // Map the institution fields to act like a regular user object for downstream middlewares
        const instObj = user.toObject();
        instObj.role = "institution";
        instObj.isAdmin = false;
        instObj.institution = instObj.institutionName;
        instObj.name = instObj.institutionName;
        user = instObj;
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Token is not valid - user not found" });
    }

    req.user = user;
    next();
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

module.exports = authMiddleware;
