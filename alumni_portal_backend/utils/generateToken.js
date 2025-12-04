const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  if (!secret || secret === "your-secret-key-change-in-production") {
    console.warn("⚠️  WARNING: Using default JWT_SECRET. Please set JWT_SECRET in environment variables for production.");
  }
  return jwt.sign({ id }, secret, { expiresIn: "7d" });
};

module.exports = generateToken;
