const jwt = require("jsonwebtoken");

const generateRefreshToken = (id) => {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
  return jwt.sign({ id, typ: "refresh" }, secret, { expiresIn });
};

module.exports = generateRefreshToken;
