const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
  return jwt.sign({ id }, secret, { expiresIn });
};

module.exports = generateToken;
